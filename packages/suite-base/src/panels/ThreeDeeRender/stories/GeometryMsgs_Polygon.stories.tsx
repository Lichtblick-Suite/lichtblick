// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { StoryObj } from "@storybook/react";

import { QUAT_IDENTITY, rad2deg } from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";
import { PolygonStamped, TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender",
  component: ThreeDeePanel,
};

export const GeometryMsgs_Polygon: StoryObj = {
  render: function Story() {
    const topics: Topic[] = [
      { name: "/polygon", schemaName: "geometry_msgs/PolygonStamped" },
      { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
    ];
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
    const tf2: MessageEvent<TransformStamped> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "base_link" },
        child_frame_id: "sensor",
        transform: {
          translation: { x: 0, y: 0, z: 1 },
          rotation: QUAT_IDENTITY,
        },
      },
      schemaName: "geometry_msgs/TransformStamped",
      sizeInBytes: 0,
    };

    const polygon: MessageEvent<PolygonStamped> = {
      topic: "/polygon",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "sensor" },
        polygon: {
          points: [
            { x: -1, y: -1, z: 0 },
            { x: 0, y: 0, z: 2 },
            { x: 1, y: 1, z: 0 },
          ],
        },
      },
      schemaName: "geometry_msgs/PolygonStamped",
      sizeInBytes: 0,
    };

    const fixture = useDelayedFixture({
      topics,
      frame: {
        "/polygon": [polygon],
        "/tf": [tf1, tf2],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    });

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "base_link",
            cameraState: {
              distance: 8.25,
              perspective: true,
              phi: rad2deg(1),
              targetOffset: [-0.7, 2.1, 0],
              thetaOffset: rad2deg(-0.25),
              fovy: rad2deg(0.75),
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
            topics: {
              "/polygon": { visible: true },
            },
          }}
        />
      </PanelSetup>
    );
  },

  parameters: { colorScheme: "dark" },
};
