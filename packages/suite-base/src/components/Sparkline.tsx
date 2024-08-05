// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Immutable } from "@lichtblick/suite";
import AutoSizingCanvas from "@lichtblick/suite-base/components/AutoSizingCanvas";
import { useCallback } from "react";
import { makeStyles } from "tss-react/mui";

export type SparklinePoint = { value: number; timestamp: number };

type SparklineProps = {
  points: Immutable<SparklinePoint[]>;
  width: number;
  height: number;
  timeRange: number;
  maximum?: number;
  nowStamp?: number; // Mostly for testing.
};

const useStyles = makeStyles()((theme) => ({
  root: {
    flex: "none",
    backgroundColor: theme.palette.grey[300],
  },
}));

function draw(
  points: Immutable<SparklinePoint[]>,
  maximum: number,
  timeRange: number,
  nowStamp: number,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
) {
  const maxValue = Math.max(maximum, ...points.map(({ value }) => value));
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.strokeStyle = color;
  let first = true;
  for (const { value, timestamp } of points) {
    const x = ((timeRange + timestamp - nowStamp) / timeRange) * width;
    const y = (1 - value / maxValue) * height;
    if (first) {
      context.moveTo(x, y);
      first = false;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

export function Sparkline(props: SparklineProps): JSX.Element {
  const { classes, theme } = useStyles();
  const drawCallback = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      draw(
        props.points,
        props.maximum ?? 0,
        props.timeRange,
        props.nowStamp ?? Date.now(),
        context,
        width,
        height,
        theme.palette.text.primary,
      );
    },
    [props.maximum, props.nowStamp, props.points, props.timeRange, theme.palette],
  );
  return (
    <div className={classes.root} style={{ height: props.height, width: props.width }}>
      <AutoSizingCanvas draw={drawCallback} />
    </div>
  );
}
