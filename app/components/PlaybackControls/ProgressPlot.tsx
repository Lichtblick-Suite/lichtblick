//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { complement } from "intervals-fn";
import React, { Component } from "react";

import AutoSizingCanvas from "@foxglove-studio/app/components/AutoSizingCanvas";
import { Progress } from "@foxglove-studio/app/players/types";
import { colors } from "@foxglove-studio/app/util/sharedStyleConstants";

const BAR_HEIGHT = 28;
const LINE_START = 12;
const LINE_HEIGHT = 4;

type ProgressProps = {
  progress: Progress;
};

export class ProgressPlot extends Component<ProgressProps> {
  shouldComponentUpdate(nextProps: ProgressProps) {
    return nextProps.progress !== this.props.progress;
  }

  _draw = (context: CanvasRenderingContext2D, width: number, height: number) => {
    const { progress } = this.props;

    context.clearRect(0, 0, width, height);

    if (progress.fullyLoadedFractionRanges) {
      context.fillStyle = colors.DARK5;
      const invertedRanges = complement({ start: 0, end: 1 }, progress.fullyLoadedFractionRanges);
      for (const range of invertedRanges) {
        const start = width * range.start;
        const end = width * range.end;
        context.fillRect(start, LINE_START, end - start, LINE_HEIGHT);
      }
    }
  };

  render() {
    return (
      <div style={{ height: BAR_HEIGHT }}>
        <AutoSizingCanvas draw={this._draw} />
      </div>
    );
  }
}
