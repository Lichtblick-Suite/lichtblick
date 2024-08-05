// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { useReadySignal } from "@lichtblick/suite-base/stories/ReadySignalContext";
import { StoryObj } from "@storybook/react";
import { userEvent, screen } from "@storybook/testing-library";
import { useEffect, useState } from "react";

import { makeColor, QUAT_IDENTITY, rad2deg, SENSOR_FRAME_ID } from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";
import { ColorRGBA, Marker, TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender",
  component: ThreeDeePanel,
  parameters: {
    colorScheme: "dark",
    chromatic: { delay: 100 },
  },
};

function AllMarkers(props: { showOutlines: boolean; includeSettings?: boolean }): JSX.Element {
  const topics: Topic[] = [
    { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
    { name: "/markers", schemaName: "visualization_msgs/Marker" },
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
      child_frame_id: SENSOR_FRAME_ID,
      transform: {
        translation: { x: 0, y: 1, z: 0 },
        rotation: QUAT_IDENTITY,
      },
    },
    schemaName: "geometry_msgs/TransformStamped",
    sizeInBytes: 0,
  };

  const arrow: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 0,
      ns: "",
      type: 0,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -2, y: 1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.1, z: 0.1 },
      color: makeColor("#f44336", 0.5),
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const cube: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 1,
      ns: "",
      type: 1,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -1, y: 1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#e81e63", 0.5),
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const sphere: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 2,
      ns: "",
      type: 2,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 0, y: 1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#9c27b0", 0.5),
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const cylinder: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 3,
      ns: "",
      type: 3,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 1, y: 1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#673ab7", 0.5),
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const lineStrip: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 4,
      ns: "",
      type: 4,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -2, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      color: makeColor("#3f51b5", 0.5),
      points: [
        { x: 0, y: 0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
        { x: 0, y: 0.25, z: 0 },
      ],
      colors: [
        makeColor("#f44336", 0.5),
        makeColor("#4caf50", 1),
        makeColor("#2196f3", 1),
        makeColor("#ffeb3b", 0.5),
      ],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const lineList: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 5,
      ns: "",
      type: 5,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -1, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      color: makeColor("#4caf50", 1),
      points: [
        { x: 0, y: 0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
        { x: 0, y: 0.25, z: 0 },
      ],
      colors: [
        makeColor("#f44336", 0.5),
        makeColor("#4caf50", 0.5),
        makeColor("#2196f3", 1),
        makeColor("#ffeb3b", 1),
        makeColor("#e81e63", 0.5),
        makeColor("#3f51b5", 0.5),
      ],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const cubeList: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 6,
      ns: "",
      type: 6,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.25, y: 0.25, z: 0.25 },
      color: makeColor("#ffc107", 0.25),
      points: [
        { x: 0, y: 0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
      ],
      colors: [makeColor("#f44336", 0.5), makeColor("#4caf50", 0.5), makeColor("#2196f3", 0.5)],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const sphereList: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 7,
      ns: "",
      type: 7,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 1, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.25, y: 0.25, z: 0.25 },
      color: makeColor("#f44336", 0.25),
      points: [
        { x: 0, y: 0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
      ],
      colors: [makeColor("#f44336", 0.5), makeColor("#4caf50", 0.5), makeColor("#2196f3", 0.5)],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const points: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 8,
      ns: "",
      type: 8,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -2, y: -1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.25, y: 0.25, z: 0.25 },
      color: makeColor("#3f51b5", 0.25),

      points: [
        { x: 0, y: 0.25, z: 0 },
        { x: 0.25, y: -0.25, z: 0 },
        { x: -0.25, y: -0.25, z: 0 },
      ],
      colors: [makeColor("#f44336", 0.5), makeColor("#4caf50", 0.5), makeColor("#2196f3", 0.5)],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const text: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 9,
      ns: "",
      type: 9,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: -1, y: -1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0, y: 0, z: 0.1 },
      color: makeColor("#4caf50", 0.5),
      text: "Lorem Ipsum\nDolor Sit Amet",
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const mesh: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 10,
      ns: "",
      type: 10,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 0, y: -1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#8bc34a", 0.5),
      mesh_resource: "missing",
      mesh_use_embedded_materials: true,
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const triangleList: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 11,
      ns: "",
      type: 11,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 1, y: -1, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#e81e63", 0.5),
      points: [
        // front
        { x: -0.25, y: -0.25, z: 0.25 },
        { x: 0.25, y: -0.25, z: 0.25 },
        { x: -0.25, y: 0.25, z: 0.25 },
        { x: -0.25, y: 0.25, z: 0.25 },
        { x: 0.25, y: -0.25, z: 0.25 },
        { x: 0.25, y: 0.25, z: 0.25 },
        // right
        { x: 0.25, y: -0.25, z: 0.25 },
        { x: 0.25, y: -0.25, z: -0.25 },
        { x: 0.25, y: 0.25, z: 0.25 },
        { x: 0.25, y: 0.25, z: 0.25 },
        { x: 0.25, y: -0.25, z: -0.25 },
        { x: 0.25, y: 0.25, z: -0.25 },
        // back
        { x: 0.25, y: -0.25, z: -0.25 },
        { x: -0.25, y: -0.25, z: -0.25 },
        { x: 0.25, y: 0.25, z: -0.25 },
        { x: 0.25, y: 0.25, z: -0.25 },
        { x: -0.25, y: -0.25, z: -0.25 },
        { x: -0.25, y: 0.25, z: -0.25 },
        // left
        { x: -0.25, y: -0.25, z: -0.25 },
        { x: -0.25, y: -0.25, z: 0.25 },
        { x: -0.25, y: 0.25, z: -0.25 },
        { x: -0.25, y: 0.25, z: -0.25 },
        { x: -0.25, y: -0.25, z: 0.25 },
        { x: -0.25, y: 0.25, z: 0.25 },
        // top
        { x: 0.25, y: 0.25, z: -0.25 },
        { x: -0.25, y: 0.25, z: -0.25 },
        { x: 0.25, y: 0.25, z: 0.25 },
        { x: 0.25, y: 0.25, z: 0.25 },
        { x: -0.25, y: 0.25, z: -0.25 },
        { x: -0.25, y: 0.25, z: 0.25 },
        // bottom
        { x: 0.25, y: -0.25, z: 0.25 },
        { x: -0.25, y: -0.25, z: 0.25 },
        { x: 0.25, y: -0.25, z: -0.25 },
        { x: 0.25, y: -0.25, z: -0.25 },
        { x: -0.25, y: -0.25, z: 0.25 },
        { x: -0.25, y: -0.25, z: -0.25 },
      ],
      colors: [],
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const triangleList2SideColors = [
    makeColor("#f44336"),
    makeColor("#4caf50"),
    makeColor("#2196f3"),
    makeColor("#2196f3"),
    makeColor("#4caf50"),
    makeColor("#ffc107"),
  ];
  const triangleList2Colors: ColorRGBA[] = [];
  for (let i = 0; i < 6; i++) {
    for (const color of triangleList2SideColors) {
      triangleList2Colors.push(color);
    }
  }
  const triangleList2: MessageEvent<Partial<Marker>> = {
    topic: "/markers",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
      id: 12,
      ns: "",
      type: 11,
      action: 0,
      frame_locked: false,
      pose: {
        position: { x: 1, y: -1, z: 0.375 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: makeColor("#e81e63", 0.5),
      points: [
        // front
        { x: -0.125, y: -0.125, z: 0.125 },
        { x: 0.125, y: -0.125, z: 0.125 },
        { x: -0.125, y: 0.125, z: 0.125 },
        { x: -0.125, y: 0.125, z: 0.125 },
        { x: 0.125, y: -0.125, z: 0.125 },
        { x: 0.125, y: 0.125, z: 0.125 },
        // right
        { x: 0.125, y: -0.125, z: 0.125 },
        { x: 0.125, y: -0.125, z: -0.125 },
        { x: 0.125, y: 0.125, z: 0.125 },
        { x: 0.125, y: 0.125, z: 0.125 },
        { x: 0.125, y: -0.125, z: -0.125 },
        { x: 0.125, y: 0.125, z: -0.125 },
        // back
        { x: 0.125, y: -0.125, z: -0.125 },
        { x: -0.125, y: -0.125, z: -0.125 },
        { x: 0.125, y: 0.125, z: -0.125 },
        { x: 0.125, y: 0.125, z: -0.125 },
        { x: -0.125, y: -0.125, z: -0.125 },
        { x: -0.125, y: 0.125, z: -0.125 },
        // left
        { x: -0.125, y: -0.125, z: -0.125 },
        { x: -0.125, y: -0.125, z: 0.125 },
        { x: -0.125, y: 0.125, z: -0.125 },
        { x: -0.125, y: 0.125, z: -0.125 },
        { x: -0.125, y: -0.125, z: 0.125 },
        { x: -0.125, y: 0.125, z: 0.125 },
        // top
        { x: 0.125, y: 0.125, z: -0.125 },
        { x: -0.125, y: 0.125, z: -0.125 },
        { x: 0.125, y: 0.125, z: 0.125 },
        { x: 0.125, y: 0.125, z: 0.125 },
        { x: -0.125, y: 0.125, z: -0.125 },
        { x: -0.125, y: 0.125, z: 0.125 },
        // bottom
        { x: 0.125, y: -0.125, z: 0.125 },
        { x: -0.125, y: -0.125, z: 0.125 },
        { x: 0.125, y: -0.125, z: -0.125 },
        { x: 0.125, y: -0.125, z: -0.125 },
        { x: -0.125, y: -0.125, z: 0.125 },
        { x: -0.125, y: -0.125, z: -0.125 },
      ],
      colors: triangleList2Colors,
      lifetime: { sec: 0, nsec: 0 },
    },
    schemaName: "visualization_msgs/Marker",
    sizeInBytes: 0,
  };

  const fixture = useDelayedFixture({
    topics,
    frame: {
      "/tf": [tf1, tf2],
      "/markers": [
        arrow,
        cube,
        sphere,
        cylinder,
        lineStrip,
        lineList,
        cubeList,
        sphereList,
        points,
        text,
        mesh,
        triangleList,
        triangleList2,
      ],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
    },
  });

  return (
    <PanelSetup fixture={fixture} includeSettings={props.includeSettings}>
      <ThreeDeePanel
        overrideConfig={{
          ...ThreeDeePanel.defaultConfig,
          followTf: "base_link",
          layers: {
            grid: { layerId: "foxglove.Grid" },
          },
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
          topics: {
            "/markers": { visible: true, showOutlines: props.showOutlines },
          },
        }}
      />
    </PanelSetup>
  );
}

export const Markers: StoryObj = {
  render: function Story() {
    return <AllMarkers showOutlines={true} />;
  },
};

export const MarkersSettings: StoryObj = {
  render: function Story() {
    return <AllMarkers showOutlines={true} includeSettings />;
  },
  play: async () => {
    await userEvent.click(await screen.findByTestId("settings__nodeHeaderToggle__topics-/markers"));
  },
};

export const MarkersSettingsChinese: StoryObj = {
  ...MarkersSettings,
  parameters: { forceLanguage: "zh" },
};

export const MarkersSettingsJapanese: StoryObj = {
  ...MarkersSettings,
  parameters: { forceLanguage: "ja" },
};

export const MarkersNoOutlines: StoryObj = {
  render: function Story() {
    return <AllMarkers showOutlines={false} />;
  },
};

export const EmptyLineStrip: StoryObj = {
  render: function Story() {
    const readySignal = useReadySignal();
    const topics: Topic[] = [
      { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
      { name: "/markers", schemaName: "visualization_msgs/Marker" },
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

    const lineStrip: MessageEvent<Partial<Marker>> = {
      topic: "/markers",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "base_link" },
        id: 4,
        ns: "",
        type: 4,
        action: 0,
        frame_locked: false,
        pose: {
          position: { x: -2, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        color: makeColor("#3f51b5", 0.5),
        points: [
          { x: 0, y: 0.25, z: 0 },
          { x: 0.25, y: -0.25, z: 0 },
          { x: -0.25, y: -0.25, z: 0 },
          { x: 0, y: 0.25, z: 0 },
        ],
        colors: [
          makeColor("#f44336", 0.5),
          makeColor("#4caf50", 1),
          makeColor("#2196f3", 1),
          makeColor("#ffeb3b", 0.5),
        ],
        lifetime: { sec: 0, nsec: 0 },
      },
      schemaName: "visualization_msgs/Marker",
      sizeInBytes: 0,
    };

    const [fixture, setFixture] = useState<Fixture>({
      topics,
      frame: {
        "/tf": [tf1],
        "/markers": [lineStrip],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    });

    useEffect(() => {
      let timeOutID2: NodeJS.Timeout;

      const timeOutID = setTimeout(() => {
        setFixture((oldFixture) => ({
          ...oldFixture,
          frame: {
            "/markers": [
              {
                topic: "/markers",
                receiveTime: { sec: 11, nsec: 0 },
                sizeInBytes: 0,
                message: {
                  ...(oldFixture.frame!["/markers"]![0]!.message as Marker),
                  points: [],
                  colors: [],
                },
                schemaName: "visualization_msgs/Marker",
              },
            ],
          },
        }));
        timeOutID2 = setTimeout(() => {
          readySignal();
        }, 100);
      }, 500);

      return () => {
        clearTimeout(timeOutID);
        clearTimeout(timeOutID2);
      };
    }, [readySignal]);

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "base_link",
            layers: {
              grid: { layerId: "foxglove.Grid" },
            },
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
            topics: {
              "/markers": { visible: true },
            },
          }}
        />
      </PanelSetup>
    );
  },

  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },

  parameters: {
    useReadySignal: true,
  },
};
