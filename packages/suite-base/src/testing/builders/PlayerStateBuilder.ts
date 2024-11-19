// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  PlayerPresence,
  PlayerState,
  PlayerStateActiveData,
} from "@lichtblick/suite-base/players/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { defaults } from "@lichtblick/suite-base/testing/builders/utilities";
import { OptionalMessageDefinition, RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

class PlayerStateBuilder {
  public static playerState(props: Partial<PlayerState> = {}): PlayerState {
    return defaults<PlayerState>(props, {
      presence: BasicBuilder.sample(PlayerPresence),
      progress: {},
      capabilities: [],
      profile: BasicBuilder.string(),
      playerId: BasicBuilder.string(),
      activeData: PlayerStateBuilder.activeData(),
    });
  }
  public static activeData(props: Partial<PlayerStateActiveData> = {}): PlayerStateActiveData {
    return defaults<PlayerStateActiveData>(props, {
      datatypes: PlayerStateBuilder.datatypes(),
      lastSeekTime: BasicBuilder.number(),
      currentTime: RosTimeBuilder.time(),
      endTime: RosTimeBuilder.time(),
      startTime: RosTimeBuilder.time(),
      isPlaying: true,
      messages: [],
      speed: 1,
      topics: [],
      topicStats: new Map(),
      totalBytesReceived: BasicBuilder.number(),
    });
  }

  public static optionalMessageDefinition(
    props: Partial<OptionalMessageDefinition> = {},
  ): OptionalMessageDefinition {
    return defaults<OptionalMessageDefinition>(props, {
      definitions: [],
      name: BasicBuilder.string(),
    });
  }

  public static datatypes(props: Partial<RosDatatypes> = {}): RosDatatypes {
    return defaults<RosDatatypes>(
      props,
      BasicBuilder.genericMap(PlayerStateBuilder.optionalMessageDefinition),
    );
  }
}
export default PlayerStateBuilder;
