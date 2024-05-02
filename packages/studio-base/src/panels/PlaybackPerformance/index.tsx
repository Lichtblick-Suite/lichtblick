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

import { Typography } from "@mui/material";
import * as _ from "lodash-es";
import { ReactElement } from "react";

import { subtract as subtractTimes, toSec } from "@foxglove/rostime";
import { Immutable } from "@foxglove/studio";
import { useMessagePipeline } from "@foxglove/studio-base/components/MessagePipeline";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { Sparkline, SparklinePoint } from "@foxglove/studio-base/components/Sparkline";
import Stack from "@foxglove/studio-base/components/Stack";
import { PlayerStateActiveData } from "@foxglove/studio-base/players/types";

const TIME_RANGE = 5000;

type PlaybackPerformanceItemProps = {
  points: SparklinePoint[];
  maximum: number;
  decimalPlaces: number;
  label: React.ReactNode;
};

function PlaybackPerformanceItem(props: PlaybackPerformanceItemProps): ReactElement {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Sparkline
        points={props.points}
        maximum={props.maximum}
        width={100}
        height={30}
        timeRange={TIME_RANGE}
      />
      <Stack>
        <Typography variant="body2">
          {(_.last(props.points) ?? { value: 0 }).value.toFixed(props.decimalPlaces)}
          {props.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {(_.sumBy(props.points, "value") / props.points.length).toFixed(props.decimalPlaces)} avg
        </Typography>
      </Stack>
    </Stack>
  );
}

type UnconnectedPlaybackPerformanceProps = Immutable<{
  timestamp: number;
  activeData?: PlayerStateActiveData;
}>;

function UnconnectedPlaybackPerformance({
  timestamp,
  activeData,
}: UnconnectedPlaybackPerformanceProps): JSX.Element {
  const playbackInfo =
    React.useRef<Immutable<{ timestamp: number; activeData: PlayerStateActiveData } | undefined>>();
  const lastPlaybackInfo = playbackInfo.current;
  if (activeData && (!playbackInfo.current || playbackInfo.current.activeData !== activeData)) {
    playbackInfo.current = { timestamp, activeData };
  }

  const perfPoints = React.useRef<{
    speed: SparklinePoint[];
    framerate: SparklinePoint[];
    bagTimeMs: SparklinePoint[];
    megabitsPerSecond: SparklinePoint[];
  }>({
    speed: [],
    framerate: [],
    bagTimeMs: [],
    megabitsPerSecond: [],
  });

  if (
    activeData &&
    playbackInfo.current &&
    lastPlaybackInfo &&
    lastPlaybackInfo.activeData !== activeData
  ) {
    const renderTimeMs = timestamp - lastPlaybackInfo.timestamp;
    if (
      lastPlaybackInfo.activeData.isPlaying &&
      activeData.isPlaying &&
      lastPlaybackInfo.activeData.lastSeekTime === activeData.lastSeekTime &&
      lastPlaybackInfo.activeData.currentTime !== activeData.currentTime
    ) {
      const elapsedPlayerTime =
        toSec(subtractTimes(activeData.currentTime, lastPlaybackInfo.activeData.currentTime)) *
        1000;
      perfPoints.current.speed.push({ value: elapsedPlayerTime / renderTimeMs, timestamp });
      perfPoints.current.framerate.push({ value: 1000 / renderTimeMs, timestamp });
      perfPoints.current.bagTimeMs.push({ value: elapsedPlayerTime, timestamp });
    }
    const newBytesReceived =
      activeData.totalBytesReceived - lastPlaybackInfo.activeData.totalBytesReceived;
    const newMegabitsReceived = (8 * newBytesReceived) / 1e6;
    const megabitsPerSecond = newMegabitsReceived / (renderTimeMs / 1000);
    perfPoints.current.megabitsPerSecond.push({ value: megabitsPerSecond, timestamp });
    for (const points of Object.values(perfPoints.current)) {
      while (points[0] && points[0].timestamp < timestamp - TIME_RANGE) {
        points.shift();
      }
    }
  }

  return (
    <Stack flex="auto">
      <PanelToolbar />
      <Stack flex="auto" justifyContent="center" gap={2} padding={1}>
        <PlaybackPerformanceItem
          points={perfPoints.current.speed}
          maximum={1.6}
          decimalPlaces={2}
          label={<>&times; realtime</>}
        />
        <PlaybackPerformanceItem
          points={perfPoints.current.framerate}
          maximum={30}
          decimalPlaces={1}
          label="fps"
        />
        <PlaybackPerformanceItem
          points={perfPoints.current.bagTimeMs}
          maximum={300}
          decimalPlaces={0}
          label="ms bag frame"
        />
        <PlaybackPerformanceItem
          points={perfPoints.current.megabitsPerSecond}
          maximum={100}
          decimalPlaces={1}
          label="Mbps"
        />
      </Stack>
    </Stack>
  );
}

function PlaybackPerformance() {
  const timestamp = Date.now();
  const activeData = useMessagePipeline(
    React.useCallback(({ playerState }) => playerState.activeData, []),
  );
  return <UnconnectedPlaybackPerformance timestamp={timestamp} activeData={activeData} />;
}

PlaybackPerformance.panelType = "PlaybackPerformance";
PlaybackPerformance.defaultConfig = {};

export default Panel(PlaybackPerformance);
