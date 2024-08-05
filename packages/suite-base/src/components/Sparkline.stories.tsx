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

import { Sparkline, SparklinePoint } from "@lichtblick/suite-base/components/Sparkline";
import { StoryObj } from "@storybook/react";

const points: SparklinePoint[] = [
  { value: 5, timestamp: 10 },
  { value: 50, timestamp: 30 },
  { value: 30, timestamp: 60 },
  { value: 100, timestamp: 100 },
];

const props = {
  points,
  width: 300,
  height: 100,
  timeRange: 100,
  nowStamp: 100,
};

export default {
  title: "components/Sparkline",
};

export const Standard: StoryObj = {
  render: () => {
    return (
      <div style={{ padding: 8 }}>
        <Sparkline {...props} />
      </div>
    );
  },

  name: "standard",
};

export const WithExplicitMaximumOf200: StoryObj = {
  render: () => {
    return (
      <div style={{ padding: 8 }}>
        <Sparkline {...props} maximum={200} />
      </div>
    );
  },

  name: "with explicit maximum of 200",
};
