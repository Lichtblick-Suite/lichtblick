// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent, Metadata } from "@lichtblick/suite";
import {
  GetBackfillMessagesArgs,
  IIterableSource,
  Initalization,
  IteratorResult,
  MessageIteratorArgs,
} from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { estimateObjectSize } from "@lichtblick/suite-base/players/messageMemoryEstimation";
import { PlayerProblem, Topic, TopicStats } from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { McapStreamReader, McapTypes } from "@mcap/core";
import * as _ from "lodash-es";

import { loadDecompressHandlers, parseChannel, ParsedChannel } from "@foxglove/mcap-support";
import {
  Time,
  isLessThan,
  isGreaterThan,
  isTimeInRangeInclusive,
  fromNanoSec,
  subtract,
  toSec,
  toRFC3339String,
  compare,
} from "@foxglove/rostime";

const DURATION_YEAR_SEC = 365 * 24 * 60 * 60;

type Options = { size: number; stream: ReadableStream<Uint8Array> };

/** Only efficient for small files */
export class McapUnindexedIterableSource implements IIterableSource {
  #options: Options;
  #msgEventsByChannel?: Map<number, MessageEvent[]>;
  #start?: Time;
  #end?: Time;

  public constructor(options: Options) {
    this.#options = options;
  }

  public async initialize(): Promise<Initalization> {
    if (this.#options.size > 1024 * 1024 * 1024) {
      // This provider uses a simple approach of loading everything into memory up front, so we
      // can't handle large files
      throw new Error("Unable to open unindexed MCAP file; unindexed files are limited to 1GB");
    }
    const decompressHandlers = await loadDecompressHandlers();

    const streamReader = this.#options.stream.getReader();

    const problems: PlayerProblem[] = [];
    const metadata: Metadata[] = [];
    const channelIdsWithErrors = new Set<number>();

    let messageCount = 0;
    const messagesByChannel = new Map<number, MessageEvent[]>();
    const schemasById = new Map<number, McapTypes.TypedMcapRecords["Schema"]>();
    const channelInfoById = new Map<
      number,
      {
        channel: McapTypes.Channel;
        parsedChannel: ParsedChannel;
        schemaName: string | undefined;
      }
    >();
    const messageSizeEstimateByTopic: Record<string, number> = {};
    const estimateMessageSize = (topic: string, msg: unknown): number => {
      const cachedSize = messageSizeEstimateByTopic[topic];
      if (cachedSize != undefined) {
        return cachedSize;
      }

      const sizeEstimate = estimateObjectSize(msg);
      messageSizeEstimateByTopic[topic] = sizeEstimate;
      return sizeEstimate;
    };

    let startTime: Time | undefined;
    let endTime: Time | undefined;
    let profile: string | undefined;
    function processRecord(record: McapTypes.TypedMcapRecord) {
      switch (record.type) {
        default:
          break;

        case "Header": {
          profile = record.profile;
          break;
        }

        case "Metadata": {
          metadata.push({
            name: record.name,
            metadata: Object.fromEntries(record.metadata),
          });
          break;
        }

        case "Schema": {
          const existingSchema = schemasById.get(record.id);
          if (existingSchema) {
            if (!_.isEqual(existingSchema, record)) {
              throw new Error(`differing schemas for id ${record.id}`);
            }
          }
          schemasById.set(record.id, record);
          break;
        }

        case "Channel": {
          const existingInfo = channelInfoById.get(record.id);
          if (existingInfo) {
            if (!_.isEqual(existingInfo.channel, record)) {
              throw new Error(`differing channel infos for id ${record.id}`);
            }
            break;
          }
          if (channelIdsWithErrors.has(record.id)) {
            break;
          }
          const schema = schemasById.get(record.schemaId);
          if (record.schemaId !== 0 && !schema) {
            throw new Error(
              `Encountered channel with schema id ${record.schemaId} but no prior schema`,
            );
          }

          try {
            const parsedChannel = parseChannel({ messageEncoding: record.messageEncoding, schema });
            channelInfoById.set(record.id, {
              channel: record,
              parsedChannel,
              schemaName: schema?.name,
            });
            messagesByChannel.set(record.id, []);
          } catch (error) {
            channelIdsWithErrors.add(record.id);
            problems.push({
              severity: "error",
              message: `Error in topic ${record.topic} (channel ${record.id}): ${error.message}`,
              error,
            });
          }
          break;
        }

        case "Message": {
          const channelId = record.channelId;
          const channelInfo = channelInfoById.get(channelId);
          const messages = messagesByChannel.get(channelId);
          if (!channelInfo || !messages) {
            if (channelIdsWithErrors.has(channelId)) {
              break; // error has already been reported
            }
            throw new Error(`message for channel ${channelId} with no prior channel info`);
          }
          ++messageCount;
          const receiveTime = fromNanoSec(record.logTime);
          if (!startTime || isLessThan(receiveTime, startTime)) {
            startTime = receiveTime;
          }
          if (!endTime || isGreaterThan(receiveTime, endTime)) {
            endTime = receiveTime;
          }
          const deserializedMessage = channelInfo.parsedChannel.deserialize(record.data);
          const estimatedMemorySize = estimateMessageSize(
            channelInfo.channel.topic,
            deserializedMessage,
          );
          messages.push({
            topic: channelInfo.channel.topic,
            receiveTime,
            publishTime: fromNanoSec(record.publishTime),
            message: deserializedMessage,
            sizeInBytes: Math.max(record.data.byteLength, estimatedMemorySize),
            schemaName: channelInfo.schemaName ?? "",
          });
          break;
        }
      }
    }

    const reader = new McapStreamReader({ decompressHandlers });
    for (let result; (result = await streamReader.read()), !result.done; ) {
      reader.append(result.value);
      for (let record; (record = reader.nextRecord()); ) {
        processRecord(record);
      }
    }

    this.#msgEventsByChannel = messagesByChannel;

    const topics: Topic[] = [];
    const topicStats = new Map<string, TopicStats>();
    const datatypes: RosDatatypes = new Map();
    const publishersByTopic = new Map<string, Set<string>>();

    for (const { channel, parsedChannel, schemaName } of channelInfoById.values()) {
      topics.push({ name: channel.topic, schemaName });
      const numMessages = messagesByChannel.get(channel.id)?.length;
      if (numMessages != undefined) {
        topicStats.set(channel.topic, { numMessages });
      }

      // Track the publisher for this topic. "callerid" is defined in the MCAP ROS 1 Well-known
      // profile at <https://mcap.dev/specification/appendix.html>. We skip the profile check to
      // allow non-ROS profiles to utilize this functionality as well
      const publisherId = channel.metadata.get("callerid") ?? String(channel.id);
      let publishers = publishersByTopic.get(channel.topic);
      if (!publishers) {
        publishers = new Set();
        publishersByTopic.set(channel.topic, publishers);
      }
      publishers.add(publisherId);

      // Final datatypes is an unholy union of schemas across all channels
      for (const [name, datatype] of parsedChannel.datatypes) {
        datatypes.set(name, datatype);
      }
    }

    this.#start = startTime ?? { sec: 0, nsec: 0 };
    this.#end = endTime ?? { sec: 0, nsec: 0 };

    const fileDuration = toSec(subtract(this.#end, this.#start));
    if (fileDuration > DURATION_YEAR_SEC) {
      const startRfc = toRFC3339String(this.#start);
      const endRfc = toRFC3339String(this.#end);

      problems.push({
        message: "This file has an abnormally long duration.",
        tip: `The start ${startRfc} and end ${endRfc} are greater than a year.`,
        severity: "warn",
      });
    }

    if (messageCount === 0) {
      problems.push({
        message: "This file contains no messages.",
        severity: "warn",
      });
    } else {
      problems.push({
        message: "This file is unindexed. Unindexed files may have degraded performance.",
        tip: "See the MCAP spec: https://mcap.dev/specification/index.html#summary-section",
        severity: "warn",
      });
    }

    return {
      start: this.#start,
      end: this.#end,
      topics,
      datatypes,
      profile,
      problems,
      publishersByTopic,
      topicStats,
      metadata,
    };
  }

  public async *messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    if (!this.#msgEventsByChannel) {
      throw new Error("initialization not completed");
    }

    const topics = args.topics;
    const start = args.start ?? this.#start;
    const end = args.end ?? this.#end;

    if (topics.size === 0 || !start || !end) {
      return;
    }

    const topicsMap = new Map(topics);
    const resultMessages = [];

    for (const [channelId, msgEvents] of this.#msgEventsByChannel) {
      for (const msgEvent of msgEvents) {
        if (
          isTimeInRangeInclusive(msgEvent.receiveTime, start, end) &&
          topicsMap.has(msgEvent.topic)
        ) {
          resultMessages.push({
            type: "message-event" as const,
            connectionId: channelId,
            msgEvent,
          });
        }
      }
    }

    // Messages need to be yielded in receiveTime order
    resultMessages.sort((a, b) => compare(a.msgEvent.receiveTime, b.msgEvent.receiveTime));

    yield* resultMessages;
  }

  public async getBackfillMessages(args: GetBackfillMessagesArgs): Promise<MessageEvent[]> {
    if (!this.#msgEventsByChannel) {
      throw new Error("initialization not completed");
    }

    const needTopics = args.topics;
    const msgEventsByTopic = new Map<string, MessageEvent>();
    for (const [, msgEvents] of this.#msgEventsByChannel) {
      for (const msgEvent of msgEvents) {
        if (compare(msgEvent.receiveTime, args.time) <= 0 && needTopics.has(msgEvent.topic)) {
          msgEventsByTopic.set(msgEvent.topic, msgEvent);
        }
      }
    }
    return [...msgEventsByTopic.values()];
  }
}
