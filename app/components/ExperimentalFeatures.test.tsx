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
import { mount } from "enzyme";
import * as React from "react";

import {
  EXPERIMENTAL_FEATURES_STORAGE_KEY,
  ExperimentalFeaturesModal,
  useExperimentalFeature,
} from "@foxglove-studio/app/components/ExperimentalFeatures";
import {
  dummyExperimentalFeaturesList,
  dummyExperimentalFeaturesStorage,
} from "@foxglove-studio/app/components/ExperimentalFeatures.fixture";
import { resetHooksToDefault, setHooks } from "@foxglove-studio/app/loadWebviz";
import Storage from "@foxglove-studio/app/util/Storage";

describe("ExperimentalFeatures", () => {
  it("exposes experimental features using useExperimentalFeature", async () => {
    setHooks({
      experimentalFeaturesList() {
        return dummyExperimentalFeaturesList;
      },
    });
    new Storage().setItem(EXPERIMENTAL_FEATURES_STORAGE_KEY, dummyExperimentalFeaturesStorage);

    const renderedSettings: any = {};
    let renderCount = 0;
    function RenderExperimentalFeatures() {
      renderCount++;
      renderedSettings.topicTree = useExperimentalFeature("topicTree");
      renderedSettings.topicTree2 = useExperimentalFeature("topicTree2");
      renderedSettings.topicTree3 = useExperimentalFeature("topicTree3");
      renderedSettings.topicTree4 = useExperimentalFeature("topicTree4");
      return null;
    }

    mount(<RenderExperimentalFeatures />);
    expect(renderCount).toEqual(1);
    expect(renderedSettings).toEqual({
      topicTree: true,
      topicTree2: true,
      topicTree3: true,
      topicTree4: false,
    });

    // Clicking on an item in the modal should trigger a rerender of all components that use
    // `useExperimentalFeature`, and so the `renderedSettings` should be updated with the new value.
    const modal = mount(
      <div data-modalcontainer="true">
        <ExperimentalFeaturesModal />
      </div>,
    );
    modal.find("[data-test='alwaysOff']").first().simulate("click");
    expect(renderCount).toEqual(2);
    expect(renderedSettings).toEqual({
      topicTree: false,
      topicTree2: true,
      topicTree3: true,
      topicTree4: false,
    });
    expect(new Storage().getItem(EXPERIMENTAL_FEATURES_STORAGE_KEY)).toEqual({
      ...dummyExperimentalFeaturesStorage,
      topicTree: "alwaysOff",
    });

    new Storage().removeItem(EXPERIMENTAL_FEATURES_STORAGE_KEY);
    resetHooksToDefault();
  });
});
