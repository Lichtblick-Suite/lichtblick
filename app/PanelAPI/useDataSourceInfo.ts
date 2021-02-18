//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useCallback } from "react";
import { Time } from "rosbag";

import {
  useMessagePipeline,
  MessagePipelineContext,
  // @ts-expect-error flow imports have any type
} from "@foxglove-studio/app/components/MessagePipeline";
import { Topic } from "@foxglove-studio/app/players/types";
import { RosDatatypes } from "@foxglove-studio/app/types/RosDatatypes";

// Metadata about the source of data currently being displayed in Webviz.
// This is not expected to change often, usually when changing data sources.
export type DataSourceInfo = {
  topics: ReadonlyArray<Topic>;
  datatypes: RosDatatypes;
  capabilities: string[];
  startTime: Time | null | undefined; // Only `startTime`, since `endTime` can change rapidly when connected to a live system.
  playerId: string;
};

export default function useDataSourceInfo(): DataSourceInfo {
  const datatypes = useMessagePipeline(
    useCallback(
      ({ datatypes: pipelineDatatypes }: MessagePipelineContext) => pipelineDatatypes,
      [],
    ),
  );
  const topics = useMessagePipeline(
    useCallback(({ sortedTopics }: MessagePipelineContext) => sortedTopics, []),
  );
  const startTime = useMessagePipeline(
    useCallback(
      ({ playerState: { activeData } }: MessagePipelineContext) =>
        activeData && activeData.startTime,
      [],
    ),
  );
  const capabilities = useMessagePipeline(
    useCallback(
      ({ playerState: { capabilities: playerStateCapabilities } }: MessagePipelineContext) =>
        playerStateCapabilities,
      [],
    ),
  );
  const playerId = useMessagePipeline(
    useCallback(
      ({ playerState: { playerId: playerStatePlayerId } }: MessagePipelineContext) =>
        playerStatePlayerId,
      [],
    ),
  );

  return {
    topics,
    datatypes,
    capabilities,
    startTime,
    playerId,
  };
}
