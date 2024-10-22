// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as _ from "lodash-es";

import { add, clampTime, fromNanoSec, Time } from "@lichtblick/rostime";
import { Immutable, MessageEvent as MessageEventLichtblick } from "@lichtblick/suite";
import { Blocks, CacheBlock } from "@lichtblick/suite-base/players/IterablePlayer/BlockLoader";
import {
  IIterableSource,
  MessageIteratorArgs,
} from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { IteratorCursor } from "@lichtblick/suite-base/players/IterablePlayer/IteratorCursor";
import { Progress, SubscribePayload } from "@lichtblick/suite-base/players/types";

interface WorkerData {
  blocks: Blocks;
  topics: Record<string, SubscribePayload>;
  cacheSize: number;
  start: Time;
  end: Time;
  source: IIterableSource;
  maxCacheSize: number;
  blockDurationNanos: number;
}

interface ProgressMessage {
  type: "progress";
  progress: Progress;
}

// Type for error messages
interface ErrorMessage {
  type: "error";
  message: string;
}

// Type for block update messages
interface BlockMessage {
  type: "block";
  currentBlockId: number;
  block: CacheBlock;
}

// Type for when the worker has completed its work
interface DoneMessage {
  type: "done";
}

export type PossibleBlockLoaderWorkerMessages =
  | ProgressMessage
  | ErrorMessage
  | BlockMessage
  | DoneMessage;

function objectToMap<T>(obj: Record<string, T>): Map<string, T> {
  return new Map<string, T>(Object.entries(obj));
}

self.onmessage = async function (event: MessageEvent<WorkerData>): Promise<void> {
  const { blocks, topics, cacheSize, start, end, source, maxCacheSize, blockDurationNanos } =
    event.data;

  const mappedTopics = objectToMap(topics);

  let totalBlockSizeBytes = cacheSize;

  for (let blockId = 0; blockId < blocks.length; ++blockId) {
    const existingBlock = blocks[blockId];
    if (existingBlock?.needTopics.size === 0) {
      continue;
    }

    const topicsToFetch = existingBlock?.needTopics ?? mappedTopics;

    let endBlockId = blockId;
    for (let endIdx = blockId + 1; endIdx < blocks.length; ++endIdx) {
      const needTopics = blocks[endIdx]?.needTopics ?? topics;
      if (!_.isEqual(topicsToFetch, needTopics)) {
        break;
      }
      endBlockId = endIdx;
    }

    const cursorStartTime = blockIdToStartTime(blockId, start, blockDurationNanos);
    const cursorEndTime = clampTime(
      blockIdToEndTime(endBlockId, start, blockDurationNanos),
      start,
      end,
    );

    const iteratorArgs: Immutable<MessageIteratorArgs> = {
      topics: topicsToFetch,
      start: cursorStartTime,
      end: cursorEndTime,
      consumptionType: "full",
    };

    const cursor =
      source.getMessageCursor?.({ ...iteratorArgs, abort: new AbortController().signal }) ??
      new IteratorCursor(source.messageIterator(iteratorArgs), new AbortController().signal);

    for (let currentBlockId = blockId; currentBlockId <= endBlockId; ++currentBlockId) {
      const untilTime = clampTime(
        blockIdToEndTime(currentBlockId, start, blockDurationNanos),
        start,
        end,
      );
      const results = await cursor.readUntil(untilTime);

      if (!results) {
        await cursor.end();
        self.postMessage({ type: "done" });
        return;
      }

      const messagesByTopic: Record<string, MessageEventLichtblick[]> = {};
      for (const topic of topicsToFetch.keys()) {
        messagesByTopic[topic] = [];
      }

      let sizeInBytes = 0;
      for (const iterResult of results) {
        if (iterResult.type !== "message-event") {
          continue;
        }
        const msgTopic = iterResult.msgEvent.topic;
        const arr = messagesByTopic[msgTopic];
        if (!arr) {
          continue;
        }
        const messageSizeInBytes = iterResult.msgEvent.sizeInBytes;
        totalBlockSizeBytes += messageSizeInBytes;
        arr.push(iterResult.msgEvent);
        sizeInBytes += messageSizeInBytes;
      }

      self.postMessage({
        type: "progress",
        progress: calculateProgress(mappedTopics, totalBlockSizeBytes),
      });

      if (totalBlockSizeBytes > maxCacheSize) {
        self.postMessage({
          type: "error",
          message: "Cache is full.",
        });
        return;
      }

      let overridenBlockMessagesSize = 0;
      for (const topic of Object.keys(messagesByTopic)) {
        const messages = existingBlock?.messagesByTopic[topic];
        if (messages) {
          overridenBlockMessagesSize += messages.reduce((acc, msg) => acc + msg.sizeInBytes, 0);
        }
      }

      const newBlockSizeInBytes =
        (existingBlock?.sizeInBytes ?? 0) - overridenBlockMessagesSize + sizeInBytes;

      self.postMessage({
        type: "block",
        currentBlockId,
        block: {
          needTopics: [],
          messagesByTopic: {
            ...existingBlock?.messagesByTopic,
            ...messagesByTopic,
          },
          sizeInBytes: newBlockSizeInBytes,
        },
      });
    }

    await cursor.end();
  }

  self.postMessage({ type: "done" });
};

// Helper functions
function calculateProgress(topics: Map<string, unknown>, totalSize: number): number {
  return totalSize / topics.size;
}

function blockIdToStartTime(id: number, start: Time, blockDurationNanos: number) {
  return add(start, fromNanoSec(BigInt(id) * BigInt(blockDurationNanos)));
}

// The end time of a block is the start time of the next block minus 1 nanosecond
function blockIdToEndTime(id: number, start: Time, blockDurationNanos: number) {
  return add(start, fromNanoSec(BigInt(id + 1) * BigInt(blockDurationNanos) - 1n));
}
