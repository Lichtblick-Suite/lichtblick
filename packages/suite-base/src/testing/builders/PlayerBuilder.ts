// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import type { MessageEvent } from "@lichtblick/suite";
import {
  BlockCache,
  MessageBlock,
  PlayerCapabilities,
  PlayerPresence,
  PlayerState,
  PlayerStateActiveData,
  Progress,
  SubscribePayload,
  SubscriptionPreloadType,
  Topic,
  TopicSelection,
  TopicStats,
} from "@lichtblick/suite-base/players/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import RosDatatypesBuilder from "@lichtblick/suite-base/testing/builders/RosDatatypesBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { defaults } from "@lichtblick/suite-base/testing/builders/utilities";
import { Range } from "@lichtblick/suite-base/util/ranges";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PlayerBuilder {
  public static subscribePayload(props: Partial<SubscribePayload> = {}): SubscribePayload {
    return defaults<SubscribePayload>(props, {
      fields: BasicBuilder.strings(),
      preloadType: BasicBuilder.sample(["full", "partial"] as SubscriptionPreloadType[]),
      topic: BasicBuilder.string(),
    });
  }

  public static topicSelection(props: Partial<TopicSelection> = {}): TopicSelection {
    return defaults<TopicSelection>(props, BasicBuilder.genericMap(PlayerBuilder.subscribePayload));
  }

  public static messageEvent(props: Partial<MessageEvent> = {}): MessageEvent {
    return defaults<MessageEvent>(props, {
      message: BasicBuilder.stringMap(),
      publishTime: RosTimeBuilder.time(),
      receiveTime: RosTimeBuilder.time(),
      schemaName: BasicBuilder.string(),
      sizeInBytes: BasicBuilder.number(),
      topic: BasicBuilder.string(),
      topicConfig: BasicBuilder.stringMap(),
    });
  }

  public static messageEvents(count = 3): MessageEvent[] {
    return BasicBuilder.multiple(PlayerBuilder.messageEvent, count);
  }

  public static messageBlock(props: Partial<MessageBlock> = {}): MessageBlock {
    return defaults<MessageBlock>(props, {
      messagesByTopic: BasicBuilder.genericDictionary(PlayerBuilder.messageEvents),
      needTopics: PlayerBuilder.topicSelection(),
      sizeInBytes: BasicBuilder.number(),
    });
  }

  public static messageBlocks(count = 3): MessageBlock[] {
    return BasicBuilder.multiple(PlayerBuilder.messageBlock, count);
  }

  public static blockCache(props: Partial<BlockCache> = {}): BlockCache {
    return defaults<BlockCache>(props, {
      blocks: PlayerBuilder.messageBlocks(),
      startTime: RosTimeBuilder.time(),
    });
  }

  public static range(props: Partial<Range> = {}): Range {
    return defaults<Range>(props, {
      end: BasicBuilder.number(),
      start: BasicBuilder.number(),
    });
  }

  public static ranges(count = 3): Range[] {
    return BasicBuilder.multiple(PlayerBuilder.range, count);
  }

  public static progress(props: Partial<Progress> = {}): Progress {
    return defaults<Progress>(props, {
      fullyLoadedFractionRanges: PlayerBuilder.ranges(),
      memoryInfo: BasicBuilder.genericDictionary(BasicBuilder.number),
      messageCache: PlayerBuilder.blockCache(),
    });
  }

  public static topic(props: Partial<Topic> = {}): Topic {
    return defaults<Topic>(props, {
      aliasedFromName: BasicBuilder.string(),
      name: `/${BasicBuilder.string()}`,
      schemaName: BasicBuilder.string(),
    });
  }

  public static topics(count = 3): Topic[] {
    return BasicBuilder.multiple(PlayerBuilder.topic, count);
  }

  public static topicStats(props: Partial<TopicStats> = {}): TopicStats {
    return defaults<TopicStats>(props, {
      firstMessageTime: RosTimeBuilder.time(),
      lastMessageTime: RosTimeBuilder.time(),
      numMessages: BasicBuilder.number(),
    });
  }

  public static activeData(props: Partial<PlayerStateActiveData> = {}): PlayerStateActiveData {
    return defaults<PlayerStateActiveData>(props, {
      currentTime: RosTimeBuilder.time(),
      datatypes: BasicBuilder.genericMap(RosDatatypesBuilder.optionalMessageDefinition),
      endTime: RosTimeBuilder.time(),
      isPlaying: BasicBuilder.boolean(),
      lastSeekTime: BasicBuilder.number(),
      messages: PlayerBuilder.messageEvents(),
      speed: BasicBuilder.number(),
      startTime: RosTimeBuilder.time(),
      topics: PlayerBuilder.topics(),
      topicStats: BasicBuilder.genericMap(PlayerBuilder.topicStats),
      totalBytesReceived: BasicBuilder.number(),
    });
  }

  public static playerState(props: Partial<PlayerState> = {}): PlayerState {
    return defaults<PlayerState>(props, {
      activeData: PlayerBuilder.activeData(),
      capabilities: BasicBuilder.sample(PlayerCapabilities, 3),
      name: BasicBuilder.string(),
      playerId: BasicBuilder.string(),
      presence: BasicBuilder.sample(PlayerPresence),
      profile: BasicBuilder.string(),
      progress: PlayerBuilder.progress(),
    });
  }
}

export default PlayerBuilder;
