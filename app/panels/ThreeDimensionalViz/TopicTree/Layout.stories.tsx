//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import delay from "@foxglove-studio/app/shared/delay";
import Flex from "@foxglove-studio/app/components/Flex";
import ThreeDimensionalViz from "@foxglove-studio/app/panels/ThreeDimensionalViz";
// @ts-expect-error flow imports have any type
import PanelSetup from "@foxglove-studio/app/stories/PanelSetup";
// @ts-expect-error flow imports have any type
import { SExpectedResult } from "@foxglove-studio/app/stories/storyHelpers";

const emptyFixture = { topics: [], datatypes: {}, frame: {}, layout: "NumberOfRenders!a" };

const LayoutStory = ({ onFirstMount, perspective }: any) => {
  const [config, setConfig] = useState({
    settingsByKey: {},
    expandedKeys: ["name:Map", "t:/metadata"],
    checkedKeys: ["name:Map", "t:/metadata", perspective ? "ns:/metadata:height" : null].filter(
      Boolean,
    ),
    modifiedNamespaceTopics: ["/metadata"],
    pinTopics: true,
    cameraState: {
      perspective,
      target: [1322.127197265625, -1484.3931884765625, -20.19326400756836],
      distance: 75,
      phi: 0.7853981633974483,
      targetOffset: [0, 0, 0],
      targetOrientation: [0, 0, 0, 1],
      thetaOffset: 0,
    },
    diffModeEnabled: false,
  });
  const saveConfig = (newConfig: any) => setConfig((oldConfig) => ({ ...oldConfig, ...newConfig }));
  return (
    <PanelSetup fixture={emptyFixture} onFirstMount={onFirstMount}>
      <Flex col>
        <ThreeDimensionalViz config={config as any} saveConfig={saveConfig} />
      </Flex>
    </PanelSetup>
  );
};

storiesOf("<3DViz> / Layout", module)
  .addParameters({ screenshot: { delay: 500 } })
  .add("enables height when enabling 3D camera perspective", () => {
    const onSaveConfig = () => {
      // no-op
    };
    return (
      <Flex>
        <LayoutStory
          perspective={false}
          onSaveConfig={onSaveConfig}
          onFirstMount={() =>
            setImmediate(async () => {
              await delay(100);
              (document.querySelectorAll(
                '[data-test="MainToolbar-toggleCameraMode"]',
              )[0] as any).click();
            })
          }
        />
        <SExpectedResult style={{ left: "200px", top: "125px" }}>
          height should be enabled
        </SExpectedResult>
      </Flex>
    );
  })
  .add("disables height when disabling 3D camera perspective", () => {
    const onSaveConfig = () => {
      // no-op
    };
    return (
      <div style={{ display: "flex", flex: "1 1" }}>
        <LayoutStory
          onSaveConfig={onSaveConfig}
          perspective
          onFirstMount={() =>
            setImmediate(async () => {
              await delay(100);
              (document.querySelectorAll(
                '[data-test="MainToolbar-toggleCameraMode"]',
              )[0] as any).click();
            })
          }
        />
        <SExpectedResult style={{ left: "200px", top: "125px" }}>
          height should be disabled
        </SExpectedResult>
      </div>
    );
  });
