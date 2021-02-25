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

import { storiesOf } from "@storybook/react";
import React from "react";

import { ExperimentalFeaturesModal } from "@foxglove-studio/app/components/ExperimentalFeatures";
import {
  dummyExperimentalFeaturesList,
  dummyExperimentalFeaturesSettings,
} from "@foxglove-studio/app/components/ExperimentalFeatures.fixture";

storiesOf("<ExperimentalFeatures>", module)
  .addParameters({
    screenshot: {
      viewport: { width: 1000, height: 1300 },
    },
  })
  .add("empty list", () => (
    <ExperimentalFeaturesModal listForStories={{}} settingsForStories={{}} />
  ))
  .add("basic fixture", () => (
    <ExperimentalFeaturesModal
      listForStories={dummyExperimentalFeaturesList}
      settingsForStories={dummyExperimentalFeaturesSettings}
    />
  ));
