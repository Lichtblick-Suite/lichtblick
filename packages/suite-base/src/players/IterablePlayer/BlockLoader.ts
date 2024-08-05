// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Condvar } from "@lichtblick/den/async";
import { filterMap } from "@lichtblick/den/collection";
import Log from "@lichtblick/log";
import { Immutable, MessageEvent } from "@lichtblick/suite";
import { IteratorCursor } from "@lichtblick/suite-base/players/IterablePlayer/IteratorCursor";
import PlayerProblemManager from "@lichtblick/suite-base/players/PlayerProblemManager";
import { MessageBlock, Progress, TopicSelection } from "@lichtblick/suite-base/players/types";
import { simplify } from "intervals-fn";
import * as _ from "lodash-es";

import {
  Time,
  add,
  clampTime,
  fromNanoSec,
  subtract as subtractTimes,
  toNanoSec,
} from "@foxglove/rostime";

import { IIterableSource, MessageIteratorArgs } from "./IIterableSource";

const log = Log.getLogger(__filename);

export const MEMORY_INFO_PRELOADED_MSGS = "Preloaded messages";

type BlockLoaderArgs = {
  cacheSizeBytes: number;
  source: IIterableSource;
  start: Time;
  end: Time;
  maxBlocks: number;
  minBlockDurationNs: number;
  problemManager: PlayerProblemManager;
};

type CacheBlock = MessageBlock & {
  needTopics: Immutable<TopicSelection>;
};

type Blocks = (CacheBlock | undefined)[];

type LoadArgs = {
  progress: (progress: Progress) => void;
};

/**
 * BlockLoader manages loading blocks from a source. Blocks are fixed time span containers for messages.
 */
export class BlockLoader {
  #source: IIterableSource;
  #blocks: Blocks = [];
  #start: Time;
  #end: Time;
  #blockDurationNanos: number;
  #topics: TopicSelection = new Map();
  #maxCacheSize: number = 0;
  #problemManager: PlayerProblemManager;
  #stopped: boolean = false;
  #activeChangeCondvar: Condvar = new Condvar();
  #abortController: AbortController;

  public constructor(args: BlockLoaderArgs) {
    this.#source = args.source;
    this.#start = args.start;
    this.#end = args.end;
    this.#maxCacheSize = args.cacheSizeBytes;
    this.#problemManager = args.problemManager;
    this.#abortController = new AbortController();

    const totalNs = Number(toNanoSec(subtractTimes(this.#end, this.#start))) + 1; // +1 since times are inclusive.
    if (totalNs > Number.MAX_SAFE_INTEGER * 0.9) {
      throw new Error("Time range is too long to be supported");
    }

    this.#blockDurationNanos = Math.ceil(
      Math.max(args.minBlockDurationNs, totalNs / args.maxBlocks),
    );

    const blockCount = Math.ceil(totalNs / this.#blockDurationNanos);

    log.debug(`Block count: ${blockCount}`);
    this.#blocks = Array.from({ length: blockCount });
  }

  public setTopics(topics: TopicSelection): void {
    if (_.isEqual(topics, this.#topics)) {
      return;
    }

    this.#abortController.abort();
    this.#activeChangeCondvar.notifyAll();
    log.debug(`Preloaded topics: ${Array.from(topics.keys()).join(", ")}`);

    // Update all the blocks with any missing topics
    for (const block of this.#blocks) {
      if (!block) {
        continue;
      }

      const blockTopics = Object.keys(block.messagesByTopic);
      const needTopics = new Map(topics);
      for (const topic of blockTopics) {
        // We need the topic unless the subscription is identical to the subscription for this
        // topic at the time blocks were loaded.
        if (_.isEqual(this.#topics.get(topic), topics.get(topic))) {
          needTopics.delete(topic);
        }
      }
      block.needTopics = needTopics;
    }

    this.#topics = topics;
  }

  /**
   * Remove topics that are no longer requested to be preloaded or topics that will be re-loaded
   * from blocks to free up space
   */
  #removeUnusedBlockTopics(): number {
    const topics = this.#topics;
    let totalBytesRemoved = 0;
    for (let i = 0; i < this.#blocks.length; i++) {
      const block = this.#blocks[i];
      if (block) {
        let blockBytesRemoved = 0;
        const newMessagesByTopic: Record<string, MessageEvent[]> = {
          ...block.messagesByTopic,
        };
        const blockTopics = Object.keys(newMessagesByTopic);
        for (const topic of blockTopics) {
          // remove topics that are no longer requested to be preloaded and topics that will
          // be re-loaded (due to different subscription parameters)
          if ((!topics.has(topic) || block.needTopics.has(topic)) && newMessagesByTopic[topic]) {
            for (const msg of newMessagesByTopic[topic]!) {
              blockBytesRemoved += msg.sizeInBytes;
            }
            delete newMessagesByTopic[topic];
          }
        }
        if (blockBytesRemoved > 0) {
          this.#blocks[i] = {
            ...block,
            messagesByTopic: newMessagesByTopic,
            sizeInBytes: block.sizeInBytes - blockBytesRemoved,
          };
          totalBytesRemoved += blockBytesRemoved;
        }
      }
    }
    return totalBytesRemoved;
  }

  public async stopLoading(): Promise<void> {
    log.debug("Stop loading blocks");
    this.#stopped = true;
    this.#abortController.abort();
    this.#activeChangeCondvar.notifyAll();
  }

  public async startLoading(args: LoadArgs): Promise<void> {
    log.debug("Start loading process");
    this.#stopped = false;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (!this.#stopped) {
      this.#abortController = new AbortController();

      const topics = this.#topics;

      await this.#load({ progress: args.progress });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.#stopped) {
        break;
      }

      // Wait for topics to possibly change.
      if (this.#topics === topics) {
        await this.#activeChangeCondvar.wait();
      }
    }
  }

  async #load(args: { progress: LoadArgs["progress"] }): Promise<void> {
    const topics = new Map(this.#topics);

    // Ignore changing the blocks if the topic list is empty
    if (topics.size === 0) {
      args.progress(this.#calculateProgress(topics, this.#cacheSize()));
      return;
    }

    if (this.#blocks.length === 0) {
      return;
    }

    log.debug("loading blocks", { topics });

    const { progress } = args;
    let totalBlockSizeBytes = this.#cacheSize();

    for (let blockId = 0; blockId < this.#blocks.length; ++blockId) {
      // Topics we will fetch for this range
      let topicsToFetch: Immutable<TopicSelection>;

      // Keep looking for a block that needs loading
      {
        const existingBlock = this.#blocks[blockId];

        // The current block has everything, so we can move to the next block
        if (existingBlock?.needTopics.size === 0) {
          continue;
        }

        // The current block needs some topics so those will be come the topics we need to fetch
        topicsToFetch = existingBlock?.needTopics ?? topics;
      }

      // blockId is the first block that needs loading
      // Now we look for the last block. We do this by finding blocks that need the same topics to fetch.
      // This creates a continuous span of the same topics to fetch
      let endBlockId = blockId;
      for (let endIdx = blockId + 1; endIdx < this.#blocks.length; ++endIdx) {
        // if needtopics is undefined cause there's no block, then needTopics is all topics
        const needTopics = this.#blocks[endIdx]?.needTopics ?? topics;

        // The topics we need to fetch no longer match the topics we need so we stop the range
        if (!_.isEqual(topicsToFetch, needTopics)) {
          break;
        }

        endBlockId = endIdx;
      }

      // Compute the cursor start/end time from the range of blocks we need to load
      const cursorStartTime = this.#blockIdToStartTime(blockId);
      const cursorEndTime = clampTime(this.#blockIdToEndTime(endBlockId), this.#start, this.#end);

      const iteratorArgs: Immutable<MessageIteratorArgs> = {
        topics: topicsToFetch,
        start: cursorStartTime,
        end: cursorEndTime,
        consumptionType: "full",
      };

      // If the source provides a message cursor we use its message cursor, otherwise we make one
      // using the source's message iterator.
      const cursor =
        this.#source.getMessageCursor?.({ ...iteratorArgs, abort: this.#abortController.signal }) ??
        new IteratorCursor(
          this.#source.messageIterator(iteratorArgs),
          this.#abortController.signal,
        );

      log.debug("Loading range", { blockId, endBlockId });
      // Loop through the blocks corresponding to the range of our cursor
      for (let currentBlockId = blockId; currentBlockId <= endBlockId; ++currentBlockId) {
        // Until time is the end time of the current block, we want all the messages from the cursor
        // until (inclusive) of the end of of the block
        const untilTime = clampTime(this.#blockIdToEndTime(currentBlockId), this.#start, this.#end);

        const results = await cursor.readUntil(untilTime);
        // No results means cursor aborted or eof
        if (!results) {
          await cursor.end();
          return;
        }

        // While we were waiting for cursor data the topics we need to be loading may have changed.
        // Check whether the topics are changed and abort this loading instance because the results
        // may no longer be valid for the data we should be loading.
        if (!_.isEqual(topics, this.#topics)) {
          return;
        }

        const messagesByTopic: Record<string, MessageEvent[]> = {};

        // Set all topics to empty arrays. Since our cursor requested all the topicsToFetch we either will
        // have message on the topic or we don't have message on the topic. Either way the topic entry
        // starts as an empty array.
        for (const topic of topicsToFetch.keys()) {
          messagesByTopic[topic] = [];
        }

        let sizeInBytes = 0;
        for (const iterResult of results) {
          if (iterResult.type === "problem") {
            this.#problemManager.addProblem(
              `connid-${iterResult.connectionId}`,
              iterResult.problem,
            );
            continue;
          }

          if (iterResult.type !== "message-event") {
            continue;
          }

          const msgTopic = iterResult.msgEvent.topic;
          const arr = messagesByTopic[msgTopic];

          // Because we initialized all the topicsToFetch earlier we expect to have an array for each message
          // topic in our results. If we don't, thats a problem.
          const problemKey = `unexpected-topic-${msgTopic}`;
          if (!arr) {
            this.#problemManager.addProblem(problemKey, {
              severity: "error",
              message: `Received a message on an unexpected topic: ${msgTopic}.`,
            });

            continue;
          }
          this.#problemManager.removeProblem(problemKey);

          const messageSizeInBytes = iterResult.msgEvent.sizeInBytes;
          totalBlockSizeBytes += messageSizeInBytes;
          arr.push(iterResult.msgEvent);

          sizeInBytes += messageSizeInBytes;

          if (totalBlockSizeBytes < this.#maxCacheSize) {
            this.#problemManager.removeProblem("cache-full");
            continue;
          }
          // cache over capacity, try removing unused topics
          const removedSize = this.#removeUnusedBlockTopics();
          totalBlockSizeBytes -= removedSize;
          if (totalBlockSizeBytes > this.#maxCacheSize) {
            this.#problemManager.addProblem("cache-full", {
              severity: "error",
              message: `Cache is full. Preloading for topics [${Array.from(
                topicsToFetch.keys(),
              ).join(", ")}] has stopped on block ${currentBlockId + 1}/${this.#blocks.length}.`,
              tip: "Try reducing the number of topics that require preloading at a given time (e.g. in plots), or try to reduce the time range of the file.",
            });
            // We need to emit progress here so the player will emit a new state
            // containing the problem.
            progress(this.#calculateProgress(topics, totalBlockSizeBytes));
            return;
          }
        }

        const existingBlock = this.#blocks[currentBlockId];

        // Calculate size of messages in the existing block that will be overridden.
        // These have to be taken into account when calculating the size of the new block.
        let overridenBlockMessagesSize = 0;
        for (const topic of Object.keys(messagesByTopic)) {
          const messages = existingBlock?.messagesByTopic[topic];
          if (messages) {
            overridenBlockMessagesSize += messages.reduce((acc, msg) => acc + msg.sizeInBytes, 0);
          }
        }
        const newBlockSizeInBytes =
          (existingBlock?.sizeInBytes ?? 0) - overridenBlockMessagesSize + sizeInBytes;

        this.#blocks[currentBlockId] = {
          needTopics: new Map(),
          messagesByTopic: {
            ...existingBlock?.messagesByTopic,
            // Any new topics override the same previous topic
            ...messagesByTopic,
          },
          sizeInBytes: newBlockSizeInBytes,
        };

        // Subtract the size of overridden messages from the the total size of all blocks.
        // (The size of new messages is already added above).
        totalBlockSizeBytes -= overridenBlockMessagesSize;

        progress(this.#calculateProgress(topics, totalBlockSizeBytes));
      }

      await cursor.end();
      blockId = endBlockId;
    }
  }

  #calculateProgress(topics: TopicSelection, currentCacheSize: number): Progress {
    const fullyLoadedFractionRanges = simplify(
      filterMap(this.#blocks, (thisBlock, blockIndex) => {
        if (!thisBlock) {
          return;
        }

        for (const topic of topics.keys()) {
          if (!thisBlock.messagesByTopic[topic]) {
            return;
          }
        }

        return {
          start: blockIndex,
          end: blockIndex + 1,
        };
      }),
    );

    return {
      fullyLoadedFractionRanges: fullyLoadedFractionRanges.map((range) => ({
        // Convert block ranges into fractions.
        start: range.start / this.#blocks.length,
        end: range.end / this.#blocks.length,
      })),
      messageCache: {
        blocks: this.#blocks.slice(),
        startTime: this.#start,
      },
      memoryInfo: {
        [MEMORY_INFO_PRELOADED_MSGS]: currentCacheSize,
      },
    };
  }

  #cacheSize(): number {
    return this.#blocks.reduce((prev, block) => {
      if (!block) {
        return prev;
      }

      return prev + block.sizeInBytes;
    }, 0);
  }

  #blockIdToStartTime(id: number): Time {
    return add(this.#start, fromNanoSec(BigInt(id) * BigInt(this.#blockDurationNanos)));
  }

  // The end time of a block is the start time of the next block minus 1 nanosecond
  #blockIdToEndTime(id: number): Time {
    return add(this.#start, fromNanoSec(BigInt(id + 1) * BigInt(this.#blockDurationNanos) - 1n));
  }
}
