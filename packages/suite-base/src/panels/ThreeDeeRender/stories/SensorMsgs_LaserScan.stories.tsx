// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { StoryObj } from "@storybook/react";
import * as THREE from "three";

import { fromSec } from "@foxglove/rostime";

import { QUAT_IDENTITY, rad2deg } from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";
import { LaserScan, PointCloud2, TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender/LaserScan",
  component: ThreeDeePanel,
  parameters: { colorScheme: "dark" },
};

function SensorMsgs_LaserScan({
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
    { name: "/scan", schemaName: "sensor_msgs/LaserScan" },
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
        rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
      },
    },
    schemaName: "geometry_msgs/TransformStamped",
    sizeInBytes: 0,
  };
  const tf3: MessageEvent<TransformStamped> = {
    topic: "/tf",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 10, nsec: 0 }, frame_id: "base_link" },
      child_frame_id: "sensor",
      transform: {
        translation: { x: 0, y: 5, z: 1 },
        rotation: QUAT_IDENTITY,
      },
    },
    schemaName: "geometry_msgs/TransformStamped",
    sizeInBytes: 0,
  };

  const count = 100;

  const ranges = new Float32Array(count);
  const intensities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / (count + 1);
    ranges[i] = 1 + 3 * t;
    intensities[i] = Math.cos(2 * Math.PI * 4 * t);
  }

  const laserScan: MessageEvent<LaserScan> = {
    topic: "/scan",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "sensor" },
      angle_min: 0,
      angle_max: 2 * Math.PI,
      angle_increment: (2 * Math.PI) / (count - 1),
      time_increment: 0,
      scan_time: 0,
      range_min: rangeMin,
      range_max: rangeMax,
      ranges,
      intensities,
    },
    schemaName: "sensor_msgs/LaserScan",
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

export const Square: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    settings: {
      pointShape: "square",
    },
  },
};

export const Size20: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    settings: {
      pointSize: 20,
    },
  },
};

export const FlatColor: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    settings: {
      colorMode: "flat",
      flatColor: "#ff00ff",
    },
  },
};

export const CustomGradient: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    settings: {
      colorMode: "gradient",
      gradient: ["#00ffff", "#0000ff"],
    },
  },
};

export const RangeLimits: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    rangeMin: 2,
    rangeMax: 3,
  },
};

export const Time0: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    time: 0,
  },
};

export const Time5: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    time: 5,
  },
};

export const Time10: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> = {
  render: SensorMsgs_LaserScan,
  args: {
    time: 10,
  },
};

export const ComparisonWithPointCloudColors: StoryObj<Parameters<typeof SensorMsgs_LaserScan>[0]> =
  {
    render: function Story() {
      const topics: Topic[] = [
        { name: "/scan", schemaName: "sensor_msgs/LaserScan" },
        { name: "/cloud", schemaName: "sensor_msgs/PointCloud2" },
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
          header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "base_link" },
          angle_min: 0,
          angle_max: angleMax,
          angle_increment: angleMax / (count - 1),
          time_increment: 0,
          scan_time: 0,
          range_min: -Infinity,
          range_max: Infinity,
          ranges,
          intensities,
        },
        schemaName: "sensor_msgs/LaserScan",
        sizeInBytes: 0,
      };

      const pointCloud: MessageEvent<PointCloud2> = {
        topic: "/cloud",
        receiveTime: { sec: 10, nsec: 0 },
        message: {
          header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: "base_link" },
          height: 1,
          width: count,
          fields: [
            { name: "x", offset: 0, datatype: 7, count: 1 },
            { name: "y", offset: 4, datatype: 7, count: 1 },
            { name: "z", offset: 8, datatype: 7, count: 1 },
            { name: "intensity", offset: 12, datatype: 7, count: 1 },
          ],
          is_bigendian: false,
          point_step: 16,
          row_step: count * 16,
          data: new Uint8Array(
            pointCloudData.buffer,
            pointCloudData.byteOffset,
            pointCloudData.byteLength,
          ),
          is_dense: true,
        },
        schemaName: "sensor_msgs/PointCloud2",
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
