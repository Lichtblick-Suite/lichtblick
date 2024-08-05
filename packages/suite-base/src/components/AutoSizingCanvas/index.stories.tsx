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

import { StoryObj } from "@storybook/react";
import { useState, useEffect } from "react";

import AutoSizingCanvas from ".";

function Example({
  changeSize = false,
  changePixelRatio = false,
  devicePixelRatio,
}: {
  changeSize?: boolean;
  changePixelRatio?: boolean;
  devicePixelRatio?: number;
}) {
  const [width, setWidth] = useState(300);
  const [pixelRatio, setPixelRatio] = useState(devicePixelRatio);
  useEffect(() => {
    const timeOutID = setTimeout(() => {
      if (changeSize) {
        setWidth(150);
      }
      if (changePixelRatio) {
        setPixelRatio(2);
      }
    }, 10);

    return () => {
      clearTimeout(timeOutID);
    };
  }, [changePixelRatio, changeSize]);

  return (
    <div style={{ width, height: 100, backgroundColor: "green" }}>
      <AutoSizingCanvas
        overrideDevicePixelRatioForTest={pixelRatio}
        draw={(ctx, drawWidth, drawHeight) => {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, drawWidth, drawHeight);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.font = "24px Arial";
          ctx.strokeRect(0, 0, drawWidth, drawHeight);

          const text = `hello ${ctx.getTransform().a}`;
          const size = ctx.measureText(text);
          ctx.fillStyle = "black";
          ctx.textBaseline = "middle";
          ctx.fillText(text, drawWidth / 2 - size.width / 2, drawHeight / 2);
        }}
      />
    </div>
  );
}

export default {
  title: "components/AutoSizingCanvas",
};

export const Static: StoryObj = {
  render: () => <Example />,
  name: "static",
};

export const ChangingSize: StoryObj = {
  render: () => <Example changeSize />,
  name: "changing size",
};

export const PixelRatio2: StoryObj = {
  render: () => <Example devicePixelRatio={2} />,
  name: "pixel ratio 2",
};

export const ChangingPixelRatio: StoryObj = {
  render: () => <Example changePixelRatio />,
  name: "changing pixel ratio",
};
