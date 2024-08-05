// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { ColorRGBA } from "@lichtblick/suite-base/panels/ThreeDeeRender/ros";
import { xyzrpyToPose } from "@lichtblick/suite-base/panels/ThreeDeeRender/transforms";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { useReadySignal } from "@lichtblick/suite-base/stories/ReadySignalContext";
import { StoryObj } from "@storybook/react";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry";
import tinycolor from "tinycolor2";

import { FrameTransform, LineType, SceneEntity, SceneUpdate } from "@foxglove/schemas";

import { makeColor, QUAT_IDENTITY, rad2deg } from "./common";
import ThreeDeePanel from "../index";

export default {
  title: "panels/ThreeDeeRender/SceneEntities",
  component: ThreeDeePanel,
};

const icospherePointsAndIndices = {
  points: [
    { x: 0, y: 0.15771933363574006, z: 0.255195242505612 },
    { x: 0, y: -0.15771933363574006, z: 0.255195242505612 },
    { x: 0.15771933363574006, y: 0.255195242505612, z: 0 },
    { x: -0.15771933363574006, y: 0.255195242505612, z: 0 },
    { x: 0.255195242505612, y: 0, z: 0.15771933363574006 },
    { x: -0.255195242505612, y: 0, z: 0.15771933363574006 },
    { x: 0, y: -0.15771933363574006, z: -0.255195242505612 },
    { x: 0, y: 0.15771933363574006, z: -0.255195242505612 },
    { x: -0.15771933363574006, y: -0.255195242505612, z: 0 },
    { x: 0.15771933363574006, y: -0.255195242505612, z: 0 },
    { x: -0.255195242505612, y: 0, z: -0.15771933363574006 },
    { x: 0.255195242505612, y: 0, z: -0.15771933363574006 },
  ],
  indices: [
    0, 5, 1, 0, 3, 5, 0, 2, 3, 0, 4, 2, 0, 1, 4, 1, 5, 8, 5, 3, 10, 3, 2, 7, 2, 4, 11, 4, 1, 9, 7,
    11, 6, 11, 9, 6, 9, 8, 6, 8, 10, 6, 10, 7, 6, 2, 11, 7, 4, 9, 11, 1, 8, 9, 5, 10, 8, 3, 7, 10,
  ],
};
const teapotMesh = new THREE.Mesh(new TeapotGeometry(1));
const teapotSTL = new STLExporter().parse(teapotMesh);

/** Reorder points for testing `indices` */
function rearrange<T>(arr: T[]): T[] {
  for (let i = 0; i + 1 < arr.length; i += 2) {
    [arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!];
  }
  return arr;
}
const primitives = {
  arrows: [
    {
      pose: xyzrpyToPose([0, 4, 0], [0, 0, 0]),
      shaft_diameter: 0.5,
      shaft_length: 0.5,
      head_diameter: 1,
      head_length: 0.3,
      color: makeColor("#f4b136", 0.5),
    },
    {
      pose: xyzrpyToPose([1, 4, 0], [0, 0, 30]),
      shaft_diameter: 0.5,
      shaft_length: 0.5,
      head_diameter: 1,
      head_length: 0.3,
      color: makeColor("#afe663", 0.9),
    },
  ],

  cubes: [
    {
      pose: xyzrpyToPose([0, 0, 0], [0, 0, 0]),
      size: { x: 0.8, y: 0.5, z: 1 },
      color: makeColor("#f4b136", 0.5),
    },
    {
      pose: xyzrpyToPose([1, 0, 0], [0, 0, 30]),
      size: { x: 0.4, y: 0.2, z: 1 },
      color: makeColor("#afe663", 0.9),
    },
  ],

  spheres: [
    {
      pose: xyzrpyToPose([0, 6, 0], [0, 0, 0]),
      size: { x: 0.8, y: 0.5, z: 1 },
      color: makeColor("#ff6136", 0.5),
    },
    {
      pose: xyzrpyToPose([1, 6, 0], [0, 0, 30]),
      size: { x: 0.4, y: 0.2, z: 1 },
      color: makeColor("#afe6c3", 0.9),
    },
  ],

  cylinders: [
    {
      pose: xyzrpyToPose([0, 5, 0], [0, 0, 0]),
      size: { x: 0.8, y: 0.5, z: 1 },
      color: makeColor("#f4b136", 0.5),
      top_scale: 1,
      bottom_scale: 0,
    },
    {
      pose: xyzrpyToPose([1, 5, 0], [0, 0, 30]),
      size: { x: 0.4, y: 0.2, z: 1 },
      color: makeColor("#afe663", 0.9),
      top_scale: 0.25,
      bottom_scale: 0.75,
    },
  ],

  lines: [LineType.LINE_STRIP, LineType.LINE_LOOP, LineType.LINE_LIST].flatMap(
    (type, typeIndex) => [
      {
        // non-indexed, single color
        type,
        pose: xyzrpyToPose([-0.2 + typeIndex * 0.2, 0.8 + typeIndex * 0.2, 0], [0, 0, 0]),
        thickness: 0.05,
        scale_invariant: false,
        points: new Array(10).fill(0).map((_, i, { length }) => ({
          x: 0.25 * Math.cos((2 * Math.PI * i) / length),
          y: 0.25 * Math.sin((2 * Math.PI * i) / length),
          z: 0,
        })),
        color: makeColor("#7995fb", 0.8),
        colors: [],
        indices: [],
      },
      {
        // indexed, single color
        type,
        pose: xyzrpyToPose([-0.2 + typeIndex * 0.2, 1.8 + typeIndex * 0.2, 0], [0, 0, 0]),
        thickness: 0.05,
        scale_invariant: false,
        points: rearrange(
          new Array(10).fill(0).map((_, i, { length }) => ({
            x: 0.25 * Math.cos((2 * Math.PI * i) / length),
            y: 0.25 * Math.sin((2 * Math.PI * i) / length),
            z: 0,
          })),
        ),
        color: makeColor("#7995fb", 0.8),
        colors: [],
        // Should make a flat-pointed star, LINE_LOOP should have a line across it
        indices: rearrange(new Array(14).fill(0).map((_, i) => (i * 3) % 10)),
      },
      {
        // non-indexed, vertex colors
        type,
        pose: xyzrpyToPose([0.8 + typeIndex * 0.2, 0.8 + typeIndex * 0.2, 0], [0, 0, 0]),
        thickness: 5,
        scale_invariant: true,
        points: new Array(10).fill(0).map((_, i, { length }) => ({
          x: 0.25 * Math.cos((2 * Math.PI * i) / length),
          y: 0.25 * Math.sin((2 * Math.PI * i) / length),
          z: 0,
        })),
        color: makeColor("#7995fb", 0.8),
        colors: new Array(10).fill(0).map((_, i, { length }) => {
          const { r, g, b, a } = tinycolor.fromRatio({ h: i / (length - 1), s: 1, v: 1 }).toRgb();
          return { r: r / 255, g: g / 255, b: b / 255, a };
        }),
        indices: [],
      },
      {
        // indexed, vertex colors
        type,
        pose: xyzrpyToPose([0.8 + typeIndex * 0.2, 1.8 + typeIndex * 0.2, 0], [0, 0, 0]),
        thickness: 4,
        scale_invariant: true,
        points: rearrange(
          new Array(10).fill(0).map((_, i, { length }) => ({
            x: 0.25 * Math.cos((2 * Math.PI * i) / length),
            y: 0.25 * Math.sin((2 * Math.PI * i) / length),
            z: 0,
          })),
        ),
        color: makeColor("#7995fb", 0.8),
        colors: rearrange(
          new Array(10).fill(0).map((_, i, { length }) => {
            const { r, g, b, a } = tinycolor.fromRatio({ h: i / (length - 1), s: 1, v: 1 }).toRgb();
            return { r: r / 255, g: g / 255, b: b / 255, a };
          }),
        ),
        // Should make a flat-pointed star, LINE_LOOP should have a line across it
        indices: rearrange(new Array(14).fill(0).map((_, i) => (i * 3) % 10)),
      },
      {
        // empty points
        type,
        pose: xyzrpyToPose([1, 1.8 + typeIndex * 0.2, 0], [0, 0, 0]),
        thickness: 5,
        scale_invariant: true,
        points: [],
        color: makeColor("#7995fb", 0.8),
        colors: [],
        indices: [],
      },
    ],
  ),

  triangles: [
    {
      ...icospherePointsAndIndices,
      pose: xyzrpyToPose([0, 9, 0], [0.5685618507342682, 0, 0]),
      color: makeColor("#ff0048", 1.0),
      colors: [],
    },
    {
      ...icospherePointsAndIndices,
      pose: xyzrpyToPose([1, 9, 0], [0.5685618507342682, 0, 0]),
      color: makeColor("#ff0048", 0.5),
      colors: [
        { r: 1, g: 0, b: 0, a: 0 },
        { r: 1, g: 0.6000000000000001, b: 0, a: 0.1 },
        { r: 0.7999999999999998, g: 1, b: 0, a: 0.2 },
        { r: 0.20000000000000018, g: 1, b: 0, a: 0.3 },
        { r: 0, g: 1, b: 0.40000000000000036, a: 0.4 },
        { r: 0, g: 1, b: 1, a: 0.5 },
        { r: 0, g: 0.40000000000000036, b: 1, a: 0.6 },
        { r: 0.1999999999999993, g: 0, b: 1, a: 0.7 },
        { r: 0.8000000000000007, g: 0, b: 1, a: 0.8 },
        { r: 1, g: 0, b: 0.5999999999999996, a: 0.9 },
        { r: 1, g: 0, b: 0, a: 1 },
        { r: 1, g: 0.6000000000000005, b: 0, a: 1.1 },
      ] as ColorRGBA[],
    },
  ],

  texts: [
    {
      pose: xyzrpyToPose([0, 7, 0], [0, 0, 0]),
      color: makeColor("#f6f136", 0.5),
      font_size: 0.2,
      text: "3d size",
      scale_invariant: false,
      billboard: true,
    },
    {
      pose: xyzrpyToPose([1, 7, 0], [0, 0, 30]),
      color: makeColor("#ae6fc3", 0.9),
      font_size: 10,
      text: "pixel size",
      scale_invariant: true,
      billboard: true,
    },
    {
      pose: xyzrpyToPose([0, 8, 0], [0, 0, 0]),
      color: makeColor("#f6f136", 0.5),
      font_size: 0.2,
      text: "scale invariant false",
      scale_invariant: false,
      billboard: false,
    },
    {
      pose: xyzrpyToPose([1, 8, 0], [0, 0, 30]),
      color: makeColor("#ae6fc3", 0.9),
      font_size: 0.2,
      text: "scale invariant true",
      scale_invariant: true,
      billboard: false,
    },
  ],

  models: [
    {
      pose: xyzrpyToPose([0, 3, 0], [0, 0, 0]),
      scale: { x: 0.3, y: 0.2, z: 0.2 },
      color: makeColor("#59e860", 0.8),
      override_color: false,
      url: "",
      media_type: "model/stl",
      data: new TextEncoder().encode(teapotSTL),
    },
    {
      pose: xyzrpyToPose([1, 3, 0], [0, 0, 30]),
      scale: { x: 0.3, y: 0.2, z: 0.2 },
      color: makeColor("#59e860", 0.8),
      override_color: true,
      url: encodeURI(`data:model/stl;utf8,${teapotSTL}`),
      media_type: "",
      data: new Uint8Array(),
    },
  ],
};

function makeStoryScene({
  topic,
  frameId,
}: {
  topic: string;
  frameId: string;
}): MessageEvent<SceneUpdate> {
  return {
    topic,
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      deletions: [],
      entities: [
        {
          timestamp: { sec: 0, nsec: 0 },
          frame_id: frameId,
          id: "entity1",
          lifetime: { sec: 0, nsec: 0 },
          frame_locked: true,
          metadata: [],
          ...primitives,
        },
      ],
    },
    schemaName: "foxglove.SceneUpdate",
    sizeInBytes: 0,
  };
}

export const BasicEntities: StoryObj = {
  render: function Story() {
    const topics: Topic[] = [
      { name: "transforms", schemaName: "foxglove.FrameTransform" },
      { name: "scene1", schemaName: "foxglove.SceneUpdate" },
      { name: "scene2", schemaName: "foxglove.SceneUpdate" },
      { name: "scene3", schemaName: "foxglove.SceneUpdate" },
    ];

    const scene1 = makeStoryScene({ topic: "scene1", frameId: "frame1" });
    const scene2 = makeStoryScene({ topic: "scene2", frameId: "frame2" });
    const scene3 = makeStoryScene({ topic: "scene3", frameId: "frame3" });

    const tf1: MessageEvent<FrameTransform> = {
      topic: "transforms",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: 0, nsec: 0 },
        parent_frame_id: "map",
        child_frame_id: "root",
        translation: { x: 1e7, y: 0, z: 0 },
        rotation: QUAT_IDENTITY,
      },
      schemaName: "foxglove.FrameTransform",
      sizeInBytes: 0,
    };
    const tf2: MessageEvent<FrameTransform> = {
      topic: "transforms",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: 0, nsec: 0 },
        parent_frame_id: "root",
        child_frame_id: "frame1",
        translation: { x: -5, y: -4, z: 0 },
        rotation: QUAT_IDENTITY,
      },
      schemaName: "foxglove.FrameTransform",
      sizeInBytes: 0,
    };
    const tf3: MessageEvent<FrameTransform> = {
      topic: "transforms",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: -1, nsec: 0 },
        parent_frame_id: "root",
        child_frame_id: "frame2",
        translation: { x: -1, y: -4, z: 0 },
        rotation: QUAT_IDENTITY,
      },
      schemaName: "foxglove.FrameTransform",
      sizeInBytes: 0,
    };
    const tf4: MessageEvent<FrameTransform> = {
      topic: "transforms",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        timestamp: { sec: -1, nsec: 0 },
        parent_frame_id: "root",
        child_frame_id: "frame3",
        translation: { x: 3, y: -4, z: 0 },
        rotation: QUAT_IDENTITY,
      },
      schemaName: "foxglove.FrameTransform",
      sizeInBytes: 0,
    };

    const fixture = {
      topics,
      frame: {
        transforms: [tf1, tf2, tf3, tf4],
        scene1: [scene1],
        scene2: [scene2],
        scene3: [scene3],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    };

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "root",
            layers: {
              grid: { layerId: "foxglove.Grid" },
            },
            cameraState: {
              distance: 14,
              perspective: true,
              phi: 40,
              targetOffset: [0, 0, 0],
              thetaOffset: rad2deg(-0.25),
              fovy: 45,
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
            topics: {
              scene1: { visible: true },
              scene2: { visible: true, color: "#6324c7ff" },
              scene3: { visible: true, showOutlines: false },
            },
          }}
        />
      </PanelSetup>
    );
  },

  parameters: { colorScheme: "light", chromatic: { delay: 100 } },
};

// Sample data across two frames for testing `LINE_LOOP` primitives
// each message contains two loops, one has points that make it a closed square
// the other has points that make it an open square. They should both render as squares however
// because we always close `LINE_LOOP` point arrays.
const lineLoopSampleData = [
  {
    deletions: [
      {
        timestamp: {
          sec: 23,
          nsec: 0,
        },
        type: 1,
        id: "",
      },
    ],
    entities: [
      {
        timestamp: {
          sec: 23,
          nsec: 0,
        },
        frame_id: "test_frame",
        id: "4",
        lifetime: {
          sec: 0,
          nsec: 0,
        },
        frame_locked: true,
        metadata: [],
        arrows: [],
        cubes: [],
        spheres: [],
        cylinders: [],
        lines: [
          {
            type: 1,
            pose: {
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              orientation: {
                x: 0,
                y: 0,
                z: 0,
                w: 1,
              },
            },
            thickness: 1.5,
            scale_invariant: true,
            points: [
              {
                x: -0.5,
                y: 0.7999999999999998,
                z: 0,
              },
              {
                x: 0.5,
                y: 0.7999999999999998,
                z: 0,
              },
              {
                x: 0.5,
                y: -0.20000000000000018,
                z: 0,
              },
              {
                x: -0.5,
                y: -0.20000000000000018,
                z: 0,
              },
              {
                x: -0.5,
                y: 0.7999999999999998,
                z: 0,
              },
            ],
            color: {
              r: 1,
              g: 1,
              b: 1,
              a: 1,
            },
            colors: [],
            indices: [],
          },
        ],
        triangles: [],
        texts: [],
        models: [],
      },
      {
        timestamp: {
          sec: 23,
          nsec: 0,
        },
        frame_id: "test_frame",
        id: "5",
        lifetime: {
          sec: 0,
          nsec: 0,
        },
        frame_locked: true,
        metadata: [],
        arrows: [],
        cubes: [],
        spheres: [],
        cylinders: [],
        lines: [
          {
            type: 1,
            pose: {
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              orientation: {
                x: 0,
                y: 0,
                z: 0,
                w: 1,
              },
            },
            thickness: 1.5,
            scale_invariant: true,
            points: [
              {
                x: -0.20000000000000018,
                y: 0.5,
                z: 0,
              },
              {
                x: 0.7999999999999998,
                y: 0.5,
                z: 0,
              },
              {
                x: 0.7999999999999998,
                y: -0.5,
                z: 0,
              },
              {
                x: -0.20000000000000018,
                y: -0.5,
                z: 0,
              },
            ],
            color: {
              r: 1,
              g: 1,
              b: 1,
              a: 1,
            },
            colors: [],
            indices: [],
          },
        ],
        triangles: [],
        texts: [],
        models: [],
      },
    ],
  },
  {
    deletions: [
      {
        timestamp: {
          sec: 23,
          nsec: 100000000,
        },
        type: 1,
        id: "",
      },
    ],
    entities: [
      {
        timestamp: {
          sec: 23,
          nsec: 100000000,
        },
        frame_id: "test_frame",
        id: "4",
        lifetime: {
          sec: 0,
          nsec: 0,
        },
        frame_locked: true,
        metadata: [],
        arrows: [],
        cubes: [],
        spheres: [],
        cylinders: [],
        lines: [
          {
            type: 1,
            pose: {
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              orientation: {
                x: 0,
                y: 0,
                z: 0,
                w: 1,
              },
            },
            thickness: 1.5,
            scale_invariant: true,
            points: [
              {
                x: -0.5,
                y: 0.8599999999999999,
                z: 0,
              },
              {
                x: 0.5,
                y: 0.8599999999999999,
                z: 0,
              },
              {
                x: 0.5,
                y: -0.14000000000000012,
                z: 0,
              },
              {
                x: -0.5,
                y: -0.14000000000000012,
                z: 0,
              },
              {
                x: -0.5,
                y: 0.8599999999999999,
                z: 0,
              },
            ],
            color: {
              r: 1,
              g: 1,
              b: 1,
              a: 1,
            },
            colors: [],
            indices: [],
          },
        ],
        triangles: [],
        texts: [],
        models: [],
      },
      {
        timestamp: {
          sec: 23,
          nsec: 100000000,
        },
        frame_id: "test_frame",
        id: "5",
        lifetime: {
          sec: 0,
          nsec: 0,
        },
        frame_locked: true,
        metadata: [],
        arrows: [],
        cubes: [],
        spheres: [],
        cylinders: [],
        lines: [
          {
            type: 1,
            pose: {
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              orientation: {
                x: 0,
                y: 0,
                z: 0,
                w: 1,
              },
            },
            thickness: 1.5,
            scale_invariant: true,
            points: [
              {
                x: -0.14000000000000012,
                y: 0.5,
                z: 0,
              },
              {
                x: 0.8599999999999999,
                y: 0.5,
                z: 0,
              },
              {
                x: 0.8599999999999999,
                y: -0.5,
                z: 0,
              },
              {
                x: -0.14000000000000012,
                y: -0.5,
                z: 0,
              },
            ],
            color: {
              r: 1,
              g: 1,
              b: 1,
              a: 1,
            },
            colors: [],
            indices: [],
          },
        ],
        triangles: [],
        texts: [],
        models: [],
      },
    ],
  },
];

function LineLoops(): JSX.Element {
  const readySignal = useReadySignal();

  // We're testing a Line loop using a position buffer bigger than it needs from a previous frame
  // So we need to test across multiple frames
  const frames = useMemo(() => {
    const frame1: MessageEvent<Partial<SceneUpdate>> = {
      topic: "scene",
      schemaName: "foxglove.SceneUpdate",
      sizeInBytes: 0,
      receiveTime: { sec: 10, nsec: 0 },
      message: lineLoopSampleData[0]!,
    };
    const frame2: MessageEvent<Partial<SceneUpdate>> = {
      topic: "scene",
      schemaName: "foxglove.SceneUpdate",
      sizeInBytes: 0,
      receiveTime: { sec: 11, nsec: 0 },
      message: lineLoopSampleData[1]!,
    };
    return [frame1, frame2];
  }, []);

  const [fixture, setFixture] = useState({
    topics: [{ name: "scene", schemaName: "foxglove.SceneUpdate" }],
    frame: {
      scene: [frames[0]!],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 10, nsec: 0 },
      isPlaying: true,
    },
  });

  useEffect(() => {
    let timeOutID2: NodeJS.Timeout;

    const timeOutID = setTimeout(() => {
      setFixture((oldFixture) => {
        const newFixture = { ...oldFixture };
        newFixture.frame = {
          scene: [frames[1]!],
        };
        newFixture.activeData = {
          currentTime: { sec: 11, nsec: 0 },
          isPlaying: true,
        };
        return newFixture;
      });
      timeOutID2 = setTimeout(() => {
        readySignal();
      }, 100);
    }, 500);

    return () => {
      clearTimeout(timeOutID);
      clearTimeout(timeOutID2);
    };
  }, [readySignal, frames]);

  return (
    <PanelSetup fixture={fixture}>
      <ThreeDeePanel
        overrideConfig={{
          ...ThreeDeePanel.defaultConfig,
          followTf: "root",
          layers: {
            grid: { layerId: "foxglove.Grid" },
          },
          cameraState: {
            distance: 7,
            perspective: true,
            phi: 40,
            targetOffset: [0, 0, 0],
            thetaOffset: rad2deg(-0.25),
            fovy: 45,
            near: 0.01,
            far: 5000,
            target: [0, 0, 0],
            targetOrientation: [0, 0, 0, 1],
          },
          topics: {
            scene: { visible: true },
          },
        }}
      />
    </PanelSetup>
  );
}
// Tests `LinePrimitives` reusing of larger `#positionBuffers`. These squares move across frames and test
// that we correctly handle the case where the `#positionBuffer` in `RenderableLines/LinePrimitiveRenderable` is bigger than
// the number of points after a `SceneUpdate`
export const UpdatedLineLoopsDontHaveExtraLines: StoryObj = {
  parameters: {
    useReadySignal: true,
    colorScheme: "dark",
  },
  render: LineLoops,
  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },
};

function makeMultiEntityScene({
  topic,
  frameId,
}: {
  topic: string;
  frameId: string;
}): MessageEvent<SceneUpdate> {
  const entityData = {
    timestamp: { sec: 0, nsec: 0 },
    frame_id: frameId,
    lifetime: { sec: 0, nsec: 0 },
    frame_locked: true,
    metadata: [],
  };

  const entities: SceneEntity[] = [];
  const allPrimitivesAsEmpty = Object.keys(primitives).reduce(
    (acc, primitiveType) => ({ ...acc, [primitiveType]: [] }),
    {},
  ) as Record<keyof typeof primitives, any[]>;
  for (const primitiveType of Object.keys(primitives)) {
    const primitiveArray = primitives[primitiveType as keyof typeof primitives]!;
    let i = 0;
    for (const primitive of primitiveArray) {
      // Each primitive has it's own entity
      // This is important because entities will use other entities' primitives from the
      // PrimitivePool after seeking because primitives are `push`ed when `released`
      // and `pop`ed when `acquired`
      entities.push({
        ...entityData,
        id: `${primitiveType}-entity-${i}`,
        ...allPrimitivesAsEmpty,
        [primitiveType]: [primitive],
      });
      i++;
    }
  }

  return {
    topic,
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      deletions: [],
      entities,
    },
    schemaName: "foxglove.SceneUpdate",
    sizeInBytes: 0,
  };
}

function CheckVisibleAfterSeek(): JSX.Element {
  const readySignal = useReadySignal();

  const frames = useMemo(() => {
    const frame1 = makeMultiEntityScene({ topic: "/markers/annotations", frameId: "root" });
    const frame2 = makeMultiEntityScene({ topic: "/markers/annotations", frameId: "root" });
    return [frame1, frame2];
  }, []);

  const [fixture, setFixture] = useState<Fixture>({
    topics: [{ name: "/markers/annotations", schemaName: "foxglove.SceneUpdate" }],
    frame: {
      "/markers/annotations": [frames[0]!],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 10, nsec: 0 },
      isPlaying: true,
    },
  });

  useEffect(() => {
    let timeOutID2: NodeJS.Timeout;

    const timeOutID = setTimeout(() => {
      setFixture((oldFixture) => {
        const newFixture = {
          ...oldFixture,
        };
        newFixture.frame = {
          "/markers/annotations": [frames[1]!],
        };
        newFixture.activeData = {
          currentTime: { sec: 11, nsec: 0 },
          isPlaying: true,
          // Make Renderer handle seek to clear renderables
          lastSeekTime: 11,
        };
        return newFixture;
      });
      timeOutID2 = setTimeout(() => {
        readySignal();
      }, 100);
    }, 500);

    return () => {
      clearTimeout(timeOutID);
      clearTimeout(timeOutID2);
    };
  }, [readySignal, frames]);

  return (
    <PanelSetup fixture={fixture}>
      <ThreeDeePanel
        overrideConfig={{
          ...ThreeDeePanel.defaultConfig,
          followTf: "root",
          layers: {
            grid: { layerId: "foxglove.Grid" },
          },
          cameraState: {
            distance: 5.84,
            perspective: true,
            phi: 0.2,
            targetOffset: [-2.348, 3.351, 0],
            thetaOffset: -89.5,
            fovy: 45,
            near: 0.01,
            far: 5000,
            target: [0, 0, 0],
            targetOrientation: [0, 0, 0, 1],
          },
          topics: {
            "/markers/annotations": { visible: true },
          },
        }}
      />
    </PanelSetup>
  );
}
// Tests `LinePrimitives` reusing of larger `#positionBuffers`. These squares move across frames and test
// that we correctly handle the case where the `#positionBuffer` in `RenderableLines/LinePrimitiveRenderable` is bigger than
// the number of points after a `SceneUpdate`
export const ProcessesSameSceneTwice: StoryObj = {
  parameters: {
    useReadySignal: true,
    colorScheme: "dark",
  },
  render: CheckVisibleAfterSeek,
  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },
};
