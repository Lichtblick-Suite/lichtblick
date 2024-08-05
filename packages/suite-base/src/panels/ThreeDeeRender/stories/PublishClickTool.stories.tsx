// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { PlayerCapabilities, Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import delay from "@lichtblick/suite-base/util/delay";
import { StoryObj } from "@storybook/react";
import { userEvent, screen } from "@storybook/testing-library";

import { QUAT_IDENTITY, rad2deg } from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";
import { PublishClickType } from "../renderables/PublishClickTool";
import { TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender/PublishClickTool",
  component: ThreeDeePanel,
  parameters: { colorScheme: "dark" },
};

export const Point: StoryObj<{ type: PublishClickType }> = {
  render: PublishClickToolTemplate,
  args: { type: "point" },
  play: async () => {
    (await screen.findByTestId("publish-button")).click();
    await delay(100);
    const canvas = document.querySelector("canvas")!;
    for (let tries = 0; tries < 10 && (canvas.offsetWidth === 0 || canvas.offsetHeight === 0); ) {
      await delay(10);
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 400 }));
    await delay(10);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};

export const PosePosition: StoryObj<{ type: PublishClickType }> = {
  render: PublishClickToolTemplate,
  args: { type: "pose" },
  play: async () => {
    (await screen.findByTestId("publish-button")).click();
    await delay(100);
    const canvas = document.querySelector("canvas")!;
    for (let tries = 0; tries < 10 && (canvas.offsetWidth === 0 || canvas.offsetHeight === 0); ) {
      await delay(10);
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 400 }));
    await delay(10);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};

export const PoseComplete: StoryObj<{ type: PublishClickType }> = {
  render: PublishClickToolTemplate,
  args: { type: "pose" },
  play: async () => {
    (await screen.findByTestId("publish-button")).click();
    await delay(100);
    const canvas = document.querySelector("canvas")!;
    for (let tries = 0; tries < 10 && (canvas.offsetWidth === 0 || canvas.offsetHeight === 0); ) {
      await delay(10);
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("click", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 300 }));
    await delay(100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};

export const PoseEstimatePosition: StoryObj<{ type: PublishClickType }> = {
  render: PublishClickToolTemplate,
  args: { type: "pose_estimate" },
  play: async () => {
    (await screen.findByTestId("publish-button")).click();
    await delay(100);
    const canvas = document.querySelector("canvas")!;
    for (let tries = 0; tries < 10 && (canvas.offsetWidth === 0 || canvas.offsetHeight === 0); ) {
      await delay(10);
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 400 }));
    await delay(100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};

export const PoseEstimateComplete: StoryObj<{ type: PublishClickType }> = {
  render: PublishClickToolTemplate,
  args: { type: "pose_estimate" },
  play: async () => {
    (await screen.findByTestId("publish-button")).click();
    await delay(100);
    const canvas = document.querySelector("canvas")!;
    for (let tries = 0; tries < 10 && (canvas.offsetWidth === 0 || canvas.offsetHeight === 0); ) {
      await delay(10);
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("click", { clientX: 400, clientY: 400 }));
    await delay(10);
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 500, clientY: 300 }));
    await delay(100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};

export const Settings: StoryObj<typeof PublishClickToolTemplate> = {
  render: PublishClickToolTemplate,
  args: { type: "pose_estimate", includeSettings: true },
  play: async () => {
    await userEvent.click(await screen.findByTestId("settings__nodeHeaderToggle__general"));
    await userEvent.click(await screen.findByTestId("settings__nodeHeaderToggle__publish"));
  },
};

export const SettingsChinese: StoryObj<typeof PublishClickToolTemplate> = {
  ...Settings,
  parameters: { forceLanguage: "zh" },
};

export const SettingsJapanese: StoryObj<typeof PublishClickToolTemplate> = {
  ...Settings,
  parameters: { forceLanguage: "ja" },
};

function PublishClickToolTemplate({
  type,
  includeSettings,
}: {
  type: PublishClickType;
  includeSettings?: boolean;
}): JSX.Element {
  const topics: Topic[] = [{ name: "/tf", schemaName: "geometry_msgs/TransformStamped" }];
  const tf1: MessageEvent<TransformStamped> = {
    topic: "/tf",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "map" },
      child_frame_id: "base_link",
      transform: {
        translation: { x: 1e7, y: 0, z: 0 },
        rotation: QUAT_IDENTITY,
      },
    },
    schemaName: "geometry_msgs/TransformStamped",
    sizeInBytes: 0,
  };

  const fixture = useDelayedFixture({
    topics,
    frame: { "/tf": [tf1] },
    capabilities: [PlayerCapabilities.advertise],
    profile: "ros1",
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
    },
  });

  return (
    <PanelSetup fixture={fixture} includeSettings={includeSettings}>
      <ThreeDeePanel
        overrideConfig={{
          ...ThreeDeePanel.defaultConfig,
          followTf: "base_link",
          layers: {
            grid: { layerId: "foxglove.Grid" },
          },
          publish: { type },
          cameraState: {
            distance: 5.5,
            perspective: true,
            phi: rad2deg(0.5),
            targetOffset: [-0.5, 0.75, 0],
            thetaOffset: rad2deg(-0.25),
            fovy: rad2deg(0.75),
            near: 0.01,
            far: 5000,
            target: [0, 0, 0],
            targetOrientation: [0, 0, 0, 1],
          },
        }}
      />
    </PanelSetup>
  );
}
