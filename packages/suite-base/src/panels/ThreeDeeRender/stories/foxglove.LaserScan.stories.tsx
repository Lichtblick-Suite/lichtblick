// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { xyzrpyToPose } from "@lichtblick/suite-base/panels/ThreeDeeRender/transforms";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { emptyPose } from "@lichtblick/suite-base/util/Pose";
import { StoryObj } from "@storybook/react";
import { screen, userEvent } from "@storybook/testing-library";
import * as THREE from "three";

import { fromSec } from "@foxglove/rostime";
import { FrameTransform, LaserScan, PointCloud } from "@foxglove/schemas";

import { QUAT_IDENTITY, rad2deg } from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";

export default {
  title: "panels/ThreeDeeRender/foxglove.LaserScan",
  component: ThreeDeePanel,
  parameters: { colorScheme: "dark" },
};

function Foxglove_LaserScan({
  time = 0,
  rangeMin = 0,
  rangeMax = 6,
  settings,
}: {
  time?: number;
  rangeMin?: number;
  rangeMax?: number;
  settings: Record<string, unknown>;
}): JSX.Element {
  const topics: Topic[] = [
    { name: "/scan", schemaName: "foxglove.LaserScan" },
    { name: "/tf", schemaName: "foxglove.FrameTransform" },
  ];
  const tf1: MessageEvent<FrameTransform> = {
    topic: "/tf",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      timestamp: { sec: 0, nsec: 0 },
      parent_frame_id: "map",
      child_frame_id: "base_link",
      translation: { x: 1e7, y: 0, z: 0 },
      rotation: QUAT_IDENTITY,
    },
    schemaName: "foxglove.FrameTransform",
    sizeInBytes: 0,
  };
  const tf2: MessageEvent<FrameTransform> = {
    topic: "/tf",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      timestamp: { sec: 0, nsec: 0 },
      parent_frame_id: "base_link",
      child_frame_id: "sensor",
      translation: { x: 0, y: 0, z: 1 },
      rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
    },
    schemaName: "foxglove.FrameTransform",
    sizeInBytes: 0,
  };
  const tf3: MessageEvent<FrameTransform> = {
    topic: "/tf",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      timestamp: { sec: 10, nsec: 0 },
      parent_frame_id: "base_link",
      child_frame_id: "sensor",
      translation: { x: 0, y: 5, z: 1 },
      rotation: QUAT_IDENTITY,
    },
    schemaName: "foxglove.FrameTransform",
    sizeInBytes: 0,
  };

  const count = 100;

  const ranges = new Float32Array(count);
  const intensities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / (count + 1);
    ranges[i] = 1 + 3 * t;
    if (ranges[i]! < rangeMin || ranges[i]! > rangeMax) {
      ranges[i] = NaN;
    }
    intensities[i] = Math.cos(2 * Math.PI * 4 * t);
  }

  const laserScan: MessageEvent<LaserScan> = {
    topic: "/scan",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      timestamp: { sec: 0, nsec: 0 },
      frame_id: "sensor",
      pose: xyzrpyToPose([-2, 0, 0], [0, 0, 90]),
      start_angle: 0,
      end_angle: 2 * Math.PI,
      ranges: ranges as unknown as number[],
      intensities: intensities as unknown as number[],
    },
    schemaName: "foxglove.LaserScan",
    sizeInBytes: 0,
  };

  const fixture = useDelayedFixture({
    topics,
    frame: {
      "/scan": [laserScan],
      "/tf": [tf1, tf2, tf3],
    },
    capabilities: [],
    activeData: {
      currentTime: fromSec(time),
    },
  });

  return (
    <PanelSetup fixture={fixture}>
      <ThreeDeePanel
        overrideConfig={{
          followTf: "base_link",
          scene: { enableStats: false },
          topics: {
            "/scan": {
              visible: true,
              pointSize: 10,
              colorMode: "colormap",
              colorMap: "turbo",
              colorField: "intensity",
              ...settings,
            },
          },
          layers: {
            grid: { layerId: "foxglove.Grid" },
          },
          cameraState: {
            distance: 13.5,
            perspective: true,
            phi: rad2deg(1.22),
            targetOffset: [0.25, -0.5, 0],
            thetaOffset: rad2deg(-0.33),
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

export const Square: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    settings: {
      pointShape: "square",
    },
  },
};

export const Size20: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    settings: {
      pointSize: 20,
    },
  },
};

export const FlatColor: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    settings: {
      colorMode: "flat",
      flatColor: "#ff00ff",
    },
  },
};

export const CustomGradient: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    settings: {
      colorMode: "gradient",
      gradient: ["#00ffff", "#0000ff"],
    },
  },
};

export const RangeLimits: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    rangeMin: 2,
    rangeMax: 3,
  },
};

export const Time0: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    time: 0,
  },
};

export const Time5: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    time: 5,
  },
};

export const Time10: StoryObj<Parameters<typeof Foxglove_LaserScan>[0]> = {
  render: Foxglove_LaserScan,
  args: {
    time: 10,
  },
};

export const ComparisonWithPointCloudColors: StoryObj = {
  render: function Story() {
    const topics: Topic[] = [
      { name: "/scan", schemaName: "foxglove.LaserScan" },
      { name: "/cloud", schemaName: "foxglove.PointCloud" },
      { name: "/tf", schemaName: "foxglove.FrameTransform" },
    ];
    const tf1: MessageEvent<FrameTransform> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: 0, nsec: 0 },
        parent_frame_id: "map",
        child_frame_id: "base_link",
        translation: { x: 1e7, y: 0, z: 0 },
        rotation: QUAT_IDENTITY,
      },
      schemaName: "foxglove.FrameTransform",
      sizeInBytes: 0,
    };

    const count = 50;

    const ranges = new Float32Array(count);
    const intensities = new Float32Array(count);
    const pointCloudData = new Float32Array(4 * count);
    const angleMax = Math.PI / 4;
    const radius = 2;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      ranges[i] = radius / Math.cos(angleMax * t);
      intensities[i] = t;
      pointCloudData[4 * i + 0] = 1; // x
      pointCloudData[4 * i + 1] = radius * t; // y
      pointCloudData[4 * i + 2] = 0; // z
      pointCloudData[4 * i + 3] = t; // intensity
    }

    const laserScan: MessageEvent<LaserScan> = {
      topic: "/scan",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: 0, nsec: 0 },
        frame_id: "base_link",
        pose: emptyPose(),
        start_angle: 0,
        end_angle: angleMax,
        ranges: ranges as unknown as number[],
        intensities: intensities as unknown as number[],
      },
      schemaName: "foxglove.LaserScan",
      sizeInBytes: 0,
    };

    const pointCloud: MessageEvent<PointCloud> = {
      topic: "/cloud",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: 0, nsec: 0 },
        frame_id: "base_link",
        pose: emptyPose(),
        point_stride: 16,
        fields: [
          { name: "x", offset: 0, type: 7 },
          { name: "y", offset: 4, type: 7 },
          { name: "z", offset: 8, type: 7 },
          { name: "intensity", offset: 12, type: 7 },
        ],
        data: new Uint8Array(
          pointCloudData.buffer,
          pointCloudData.byteOffset,
          pointCloudData.byteLength,
        ),
      },
      schemaName: "foxglove.PointCloud",
      sizeInBytes: 0,
    };

    const fixture = useDelayedFixture({
      topics,
      frame: {
        "/scan": [laserScan],
        "/cloud": [pointCloud],
        "/tf": [tf1],
      },
      capabilities: [],
      activeData: {
        currentTime: fromSec(0),
      },
    });

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            followTf: "base_link",
            scene: { enableStats: false },
            topics: {
              "/scan": {
                visible: true,
                pointSize: 10,
                colorMode: "colormap",
                colorMap: "turbo",
                colorField: "intensity",
              },
              "/cloud": {
                visible: true,
                pointSize: 10,
                colorMode: "colormap",
                colorMap: "turbo",
                colorField: "intensity",
              },
            },
            layers: {
              grid: { layerId: "foxglove.Grid" },
            },
            cameraState: {
              distance: 5,
              perspective: false,
              phi: rad2deg(0),
              targetOffset: [0, 1, 0],
              thetaOffset: rad2deg(0),
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
  },
};

function HistoryPickingStory(): JSX.Element {
  const topics: Topic[] = [{ name: "/scan", schemaName: "foxglove.LaserScan" }];

  const laserScan1: MessageEvent<LaserScan> = {
    topic: "/scan",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      timestamp: { sec: 10, nsec: 0 },
      frame_id: "sensor",
      pose: emptyPose(),
      start_angle: 0,
      end_angle: Math.PI / 4,
      ranges: new Array(10).fill(0).map((_, i) => 2 + 0.05 * i),
      intensities: new Array(10).fill(0).map((_, i) => i),
    },
    schemaName: "foxglove.LaserScan",
    sizeInBytes: 0,
  };

  const laserScan2: MessageEvent<LaserScan> = {
    topic: "/scan",
    receiveTime: { sec: 20, nsec: 0 },
    message: {
      timestamp: { sec: 20, nsec: 0 },
      frame_id: "sensor",
      pose: emptyPose(),
      start_angle: 0,
      end_angle: Math.PI / 2,
      ranges: new Array(10).fill(0).map((_, i) => 3 + 0.1 * i),
      intensities: new Array(10).fill(0).map((_, i) => i),
    },
    schemaName: "foxglove.LaserScan",
    sizeInBytes: 0,
  };

  const fixture = {
    topics,
    frame: {
      "/scan": [laserScan1, laserScan2],
    },
    capabilities: [],
    activeData: {
      currentTime: fromSec(20),
    },
  };

  return (
    <div style={{ width: 600, height: 400, flexShrink: 0 }}>
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          debugPicking
          overrideConfig={{
            followTf: "base_link",
            scene: { enableStats: false },
            topics: {
              "/scan": {
                visible: true,
                pointSize: 10,
                colorMode: "colormap",
                colorMap: "turbo",
                colorField: "intensity",
                decayTime: 20,
              },
            },
            cameraState: {
              distance: 8,
              perspective: false,
              phi: rad2deg(0),
              targetOffset: [4, 0, 0],
              thetaOffset: rad2deg(0),
              fovy: rad2deg(0.75),
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
          }}
        />
      </PanelSetup>
    </div>
  );
}

/** Click background to render overall hitmap */
export const HistoryPicking: StoryObj = {
  render: HistoryPickingStory,
  async play() {
    await userEvent.click(await screen.findByTestId("ExpandingToolbar-Inspect objects"));
    await userEvent.pointer({
      target: document.querySelector("canvas")!,
      keys: "[MouseLeft]",
      coords: { clientX: 0, clientY: 0 },
    });
  },
};

/** Click first scan */
export const HistoryPickingInstances1: StoryObj = {
  render: HistoryPickingStory,
  async play() {
    await userEvent.click(await screen.findByTestId("ExpandingToolbar-Inspect objects"));
    await userEvent.pointer({
      target: document.querySelector("canvas")!,
      keys: "[MouseLeft]",
      coords: { clientX: 212, clientY: 181 },
    });
  },
};

/** Click second scan */
export const HistoryPickingInstances2: StoryObj = {
  render: HistoryPickingStory,
  async play() {
    await userEvent.click(await screen.findByTestId("ExpandingToolbar-Inspect objects"));
    await userEvent.pointer({
      target: document.querySelector("canvas")!,
      keys: "[MouseLeft]",
      coords: { clientX: 255, clientY: 191 },
    });
  },
};
