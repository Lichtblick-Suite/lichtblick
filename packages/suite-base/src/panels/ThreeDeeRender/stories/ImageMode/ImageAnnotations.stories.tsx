// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { ImageModeConfig } from "@lichtblick/suite-base/panels/ThreeDeeRender/IRenderer";
import { makeRawImageAndCalibration } from "@lichtblick/suite-base/panels/ThreeDeeRender/stories/ImageMode/imageCommon";
import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { useReadySignal } from "@lichtblick/suite-base/stories/ReadySignalContext";
import delay from "@lichtblick/suite-base/util/delay";
import { StoryObj } from "@storybook/react";
import { screen, userEvent } from "@storybook/testing-library";
import * as _ from "lodash-es";
import { useEffect, useState } from "react";

import { ImageAnnotations, PointsAnnotationType } from "@foxglove/schemas";

import { ImagePanel } from "../../index";

export default {
  title: "panels/ThreeDeeRender/Images/Annotations",
  component: ImagePanel,
  parameters: {
    colorScheme: "light",
  },
};

const AnnotationsStory = (
  args: { debugPicking?: boolean; imageModeConfigOverride?: Partial<ImageModeConfig> } = {},
): JSX.Element => {
  const { debugPicking, imageModeConfigOverride } = args;
  const width = 60;
  const height = 45;
  const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
    width,
    height,
    frameId: "camera",
    imageTopic: "camera",
    calibrationTopic: "calibration",
  });

  const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
    topic: "annotations",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      circles: [
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          outline_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 25, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 0.5 },
          outline_color: { r: 0, g: 0, b: 0, a: 0 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 30, y: 5 },
          diameter: 4,
          thickness: 0.5,
          fill_color: { r: 1, g: 1, b: 0, a: 0 },
          outline_color: { r: 0, g: 1, b: 1, a: 0.5 },
        },
      ],
      points: [
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.POINTS,
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 8 },
            { x: 2, y: 6 },
            { x: 5, y: 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.POINTS,
          points: [
            { x: 10 + 0, y: 0 },
            { x: 10 + 0, y: 8 },
            { x: 10 + 2, y: 6 },
            { x: 10 + 5, y: 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 0.75 },
            { r: 0, g: 0, b: 1, a: 1 },
            { r: 0, g: 1, b: 1, a: 0.75 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 0, y: 10 + 0 },
            { x: 0, y: 10 + 8 },
            { x: 2, y: 10 + 6 },
            { x: 5, y: 10 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 10 + 0, y: 10 + 0 },
            { x: 10 + 0, y: 10 + 8 },
            { x: 10 + 2, y: 10 + 6 },
            { x: 10 + 5, y: 10 + 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            // 1 color per point
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 1 },
            { r: 0, g: 0, b: 1, a: 0.75 },
            { r: 0, g: 1, b: 1, a: 1 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 20 + 0, y: 10 + 0 },
            { x: 20 + 0, y: 10 + 8 },
            { x: 20 + 2, y: 10 + 6 },
            { x: 20 + 5, y: 10 + 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            // 1 color per line
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 0.75 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_STRIP,
          points: [
            { x: 0, y: 20 + 0 },
            { x: 0, y: 20 + 8 },
            { x: 2, y: 20 + 6 },
            { x: 5, y: 20 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_STRIP,
          points: [
            { x: 10 + 0, y: 20 + 0 },
            { x: 10 + 0, y: 20 + 8 },
            { x: 10 + 2, y: 20 + 6 },
            { x: 10 + 5, y: 20 + 2 },
          ],
          outline_color: { r: 1, g: 1, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          thickness: 0.5,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LOOP,
          points: [
            { x: 0, y: 30 + 0 },
            { x: 0, y: 30 + 8 },
            { x: 2, y: 30 + 6 },
            { x: 5, y: 30 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LOOP,
          points: [
            { x: 10 + 0, y: 30 + 0 },
            { x: 10 + 0, y: 30 + 8 },
            { x: 10 + 2, y: 30 + 6 },
            { x: 10 + 5, y: 30 + 2 },
          ],
          outline_color: { r: 1, g: 0.5, b: 0, a: 0.5 },
          outline_colors: [],
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          thickness: 0.5,
        },
      ],
      texts: [
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 30 },
          text: "Hi",
          font_size: 5,
          text_color: { r: 1, g: 0, b: 0, a: 1 },
          background_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 32 },
          text: "hello",
          font_size: 3,
          text_color: { r: 0.3, g: 0.5, b: 0.5, a: 0.8 },
          background_color: { r: 1, g: 1, b: 1, a: 0.2 },
        },
      ],
    },
    schemaName: "foxglove.ImageAnnotations",
    sizeInBytes: 0,
  };

  const fixture: Fixture = {
    topics: [
      { name: "calibration", schemaName: "foxglove.CameraCalibration" },
      { name: "camera", schemaName: "foxglove.RawImage" },
      { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
    ],
    frame: {
      calibration: [calibrationMessage],
      camera: [cameraMessage],
      annotations: [annotationsMessage],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
    },
  };
  return (
    <div style={{ width: 1200, height: 900, flexShrink: 0 }}>
      <PanelSetup fixture={fixture}>
        <ImagePanel
          debugPicking={debugPicking}
          overrideConfig={{
            ...ImagePanel.defaultConfig,
            imageMode: {
              calibrationTopic: "calibration",
              imageTopic: "camera",
              annotations: { annotations: { visible: true } },
              ...imageModeConfigOverride,
            },
          }}
        />
      </PanelSetup>
    </div>
  );
};

export const Annotations: StoryObj = {
  render: AnnotationsStory,
};

export const AnnotationsPicking: StoryObj = {
  render: AnnotationsStory,
  args: {
    debugPicking: true,
  },
  async play() {
    await delay(1000);
    await userEvent.hover(await screen.findByTestId(/panel-mouseenter-container/));
    await userEvent.click(await screen.findByTestId("ExpandingToolbar-Inspect objects"));
    await userEvent.pointer({
      target: document.querySelector("canvas")!,
      keys: "[MouseLeft]",
      coords: { clientX: 0, clientY: 0 },
    });
  },
};

export const AnnotationsWithoutCalibration: StoryObj = {
  render: AnnotationsStory,
  args: {
    imageModeConfigOverride: { calibrationTopic: undefined },
  },
};

export const MessageConverterSupport: StoryObj = {
  render: function Story() {
    const width = 60;
    const height = 45;

    const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
      width,
      height,
      frameId: "camera",
      imageTopic: "camera",
      calibrationTopic: "calibration",
    });

    const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
      topic: "annotations",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.POINTS,
            points: [
              { x: 10 + 0, y: 10 + 0 },
              { x: 10 + 0, y: 10 + 8 },
              { x: 10 + 2, y: 10 + 6 },
              { x: 10 + 5, y: 10 + 2 },
            ],
            outline_color: { r: 0, g: 0, b: 0, a: 1 },
            outline_colors: [
              { r: 1, g: 0, b: 0, a: 1 },
              { r: 0, g: 1, b: 0, a: 1 },
              { r: 0, g: 0, b: 1, a: 1 },
              { r: 0, g: 1, b: 1, a: 1 },
            ],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 1,
          },
        ],
      },
      schemaName: "foxglove.ImageAnnotations",
      sizeInBytes: 0,
    };

    const customAnnotationsMessage: MessageEvent<Partial<unknown>> = {
      topic: "custom_annotations",
      receiveTime: { sec: 10, nsec: 0 },
      message: { foo: "bar" },
      schemaName: "MyCustomSchema",
      sizeInBytes: 0,
    };

    const fixture: Fixture = {
      topics: [
        { name: "calibration", schemaName: "foxglove.CameraCalibration" },
        { name: "camera", schemaName: "foxglove.RawImage" },
        { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
        { name: "custom_annotations", schemaName: "MyCustomSchema" },
      ],
      frame: {
        calibration: [calibrationMessage],
        camera: [cameraMessage],
        annotations: [annotationsMessage],
        custom_annotations: [customAnnotationsMessage],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
      messageConverters: [
        // both original and converted schemas are supported
        {
          fromSchemaName: "foxglove.ImageAnnotations",
          toSchemaName: "foxglove_msgs/ImageAnnotations",
          converter: (_msg: unknown): Partial<ImageAnnotations> => ({
            points: [
              {
                timestamp: { sec: 0, nsec: 0 },
                type: PointsAnnotationType.LINE_LOOP,
                points: [
                  { x: 20 + 0, y: 10 + 0 },
                  { x: 20 + 0, y: 10 + 8 },
                  { x: 20 + 2, y: 10 + 6 },
                  { x: 20 + 5, y: 10 + 2 },
                ],
                outline_color: { r: 1, g: 1, b: 0, a: 1 },
                outline_colors: [],
                fill_color: { r: 0, g: 1, b: 1, a: 0 },
                thickness: 1,
              },
            ],
          }),
        },
        // original schema is not supported, but two converters are supported
        {
          fromSchemaName: "MyCustomSchema",
          toSchemaName: "foxglove_msgs/ImageAnnotations",
          converter: (_msg: unknown): Partial<ImageAnnotations> => ({
            points: [
              {
                timestamp: { sec: 0, nsec: 0 },
                type: PointsAnnotationType.LINE_LIST,
                points: [
                  { x: 30 + 0, y: 10 + 0 },
                  { x: 30 + 0, y: 10 + 8 },
                  { x: 30 + 2, y: 10 + 6 },
                  { x: 30 + 5, y: 10 + 2 },
                ],
                outline_color: { r: 0, g: 0, b: 0, a: 1 },
                outline_colors: [
                  // 1 color per point
                  { r: 1, g: 0, b: 0, a: 1 },
                  { r: 0, g: 1, b: 0, a: 1 },
                  { r: 0, g: 0, b: 1, a: 1 },
                  { r: 0, g: 1, b: 1, a: 1 },
                ],
                fill_color: { r: 0, g: 0, b: 0, a: 0 },
                thickness: 2,
              },
            ],
          }),
        },
        {
          fromSchemaName: "MyCustomSchema",
          toSchemaName: "foxglove_msgs/msg/ImageAnnotations",
          converter: (_msg: unknown): Partial<ImageAnnotations> => ({
            points: [
              {
                timestamp: { sec: 0, nsec: 0 },
                type: PointsAnnotationType.LINE_STRIP,
                points: [
                  { x: 40 + 0, y: 10 + 0 },
                  { x: 40 + 0, y: 10 + 8 },
                  { x: 40 + 2, y: 10 + 6 },
                  { x: 40 + 5, y: 10 + 2 },
                ],
                outline_color: { r: 1, g: 1, b: 1, a: 1 },
                outline_colors: [],
                fill_color: { r: 0, g: 0, b: 0, a: 0 },
                thickness: 2,
              },
            ],
          }),
        },
        // unrelated converter should not be shown
        {
          fromSchemaName: "MyCustomSchema",
          toSchemaName: "foxglove.SceneUpdate",
          converter: (msg: unknown) => msg,
        },
      ],
    };
    return (
      <PanelSetup fixture={fixture} includeSettings>
        <ImagePanel
          overrideConfig={{
            ...ImagePanel.defaultConfig,
            imageMode: {
              calibrationTopic: "calibration",
              imageTopic: "camera",
              annotations: {
                annotations: { visible: true },
                custom_annotations: { visible: true },
              },
            },
          }}
        />
      </PanelSetup>
    );
  },
};

const AnnotationsUpdateStory = (
  imageModeConfigOverride: Partial<ImageModeConfig> = {},
): JSX.Element => {
  const readySignal = useReadySignal();
  const width = 60;
  const height = 45;
  const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
    width,
    height,
    frameId: "camera",
    imageTopic: "camera",
    calibrationTopic: "calibration",
  });

  const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
    topic: "annotations",
    receiveTime: { sec: 0, nsec: 0 },
    message: {
      circles: [
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          outline_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 25, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 0.5 },
          outline_color: { r: 0, g: 0, b: 0, a: 0 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 30, y: 5 },
          diameter: 4,
          thickness: 0.5,
          fill_color: { r: 1, g: 1, b: 0, a: 0 },
          outline_color: { r: 0, g: 1, b: 1, a: 0.5 },
        },
      ],
      points: [
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.POINTS,
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 8 },
            { x: 2, y: 6 },
            { x: 5, y: 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.POINTS,
          points: [
            { x: 10 + 0, y: 0 },
            { x: 10 + 0, y: 8 },
            { x: 10 + 2, y: 6 },
            { x: 10 + 5, y: 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 1 },
            { r: 0, g: 0, b: 1, a: 1 },
            { r: 0, g: 1, b: 1, a: 1 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 0, y: 10 + 0 },
            { x: 0, y: 10 + 8 },
            { x: 2, y: 10 + 6 },
            { x: 5, y: 10 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 10 + 0, y: 10 + 0 },
            { x: 10 + 0, y: 10 + 8 },
            { x: 10 + 2, y: 10 + 6 },
            { x: 10 + 5, y: 10 + 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            // 1 color per point
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 1 },
            { r: 0, g: 0, b: 1, a: 1 },
            { r: 0, g: 1, b: 1, a: 1 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LIST,
          points: [
            { x: 20 + 0, y: 10 + 0 },
            { x: 20 + 0, y: 10 + 8 },
            { x: 20 + 2, y: 10 + 6 },
            { x: 20 + 5, y: 10 + 2 },
          ],
          outline_color: { r: 0, g: 0, b: 0, a: 1 },
          outline_colors: [
            // 1 color per line
            { r: 1, g: 0, b: 0, a: 1 },
            { r: 0, g: 1, b: 0, a: 1 },
          ],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 2,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_STRIP,
          points: [
            { x: 0, y: 20 + 0 },
            { x: 0, y: 20 + 8 },
            { x: 2, y: 20 + 6 },
            { x: 5, y: 20 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_STRIP,
          points: [
            { x: 10 + 0, y: 20 + 0 },
            { x: 10 + 0, y: 20 + 8 },
            { x: 10 + 2, y: 20 + 6 },
            { x: 10 + 5, y: 20 + 2 },
          ],
          outline_color: { r: 1, g: 1, b: 0, a: 0.75 },
          outline_colors: [],
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          thickness: 0.5,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LOOP,
          points: [
            { x: 0, y: 30 + 0 },
            { x: 0, y: 30 + 8 },
            { x: 2, y: 30 + 6 },
            { x: 5, y: 30 + 2 },
          ],
          outline_color: { r: 1, g: 0, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 0, g: 0, b: 0, a: 0 },
          thickness: 1,
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          type: PointsAnnotationType.LINE_LOOP,
          points: [
            { x: 10 + 0, y: 30 + 0 },
            { x: 10 + 0, y: 30 + 8 },
            { x: 10 + 2, y: 30 + 6 },
            { x: 10 + 5, y: 30 + 2 },
          ],
          outline_color: { r: 1, g: 1, b: 0, a: 1 },
          outline_colors: [],
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          thickness: 0.5,
        },
      ],
      texts: [
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 30 },
          text: "Hi",
          font_size: 5,
          text_color: { r: 1, g: 0, b: 0, a: 1 },
          background_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 20, y: 32 },
          text: "hello",
          font_size: 3,
          text_color: { r: 0.3, g: 0.5, b: 0.5, a: 0.8 },
          background_color: { r: 1, g: 1, b: 1, a: 0.2 },
        },
      ],
    },
    schemaName: "foxglove.ImageAnnotations",
    sizeInBytes: 0,
  };

  const annotationShouldDisappear: MessageEvent<Partial<ImageAnnotations>> = {
    topic: "annotationsToClear",
    receiveTime: { sec: 0, nsec: 0 },
    message: {
      circles: [],
      points: [],
      texts: [
        {
          timestamp: { sec: 0, nsec: 0 },
          position: { x: 30, y: 40 },
          text: "erase me",
          font_size: 5,
          text_color: { r: 1, g: 0, b: 0, a: 1 },
          background_color: { r: 1, g: 1, b: 0, a: 1 },
        },
      ],
    },
    schemaName: "foxglove.ImageAnnotations",
    sizeInBytes: 0,
  };

  const [fixture, setFixture] = useState({
    topics: [
      { name: "calibration", schemaName: "foxglove.CameraCalibration" },
      { name: "camera", schemaName: "foxglove.RawImage" },
      { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
      { name: "annotationsToClear", schemaName: "foxglove.ImageAnnotations" },
    ],
    frame: {
      calibration: [calibrationMessage],
      camera: [cameraMessage],
      annotations: [annotationsMessage],
      annotationsToClear: [annotationShouldDisappear],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
      isPlaying: true,
    },
  });

  useEffect(() => {
    const newAnnotations: MessageEvent<Partial<ImageAnnotations>> = {
      topic: "annotations",
      schemaName: "foxglove.ImageAnnotations",
      receiveTime: { sec: 1, nsec: 0 },
      message: moveAnnotations(annotationsMessage.message, { x: 5, y: 5 }),
      sizeInBytes: 0,
    };

    const emptyAnnotations: MessageEvent<Partial<ImageAnnotations>> = {
      topic: "annotationsToClear",
      schemaName: "foxglove.ImageAnnotations",
      receiveTime: { sec: 1, nsec: 0 },
      message: {},
      sizeInBytes: 0,
    };

    let timeOutID2: NodeJS.Timeout;

    const timeOutID = setTimeout(() => {
      setFixture((oldFixture) => {
        const newFixture = { ...oldFixture };
        newFixture.frame = {
          annotations: [newAnnotations],
          annotationsToClear: [emptyAnnotations],
          calibration: [],
          camera: [],
        };
        newFixture.activeData = {
          currentTime: { sec: 1, nsec: 0 },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readySignal]);

  return (
    <PanelSetup fixture={fixture}>
      <ImagePanel
        overrideConfig={{
          ...ImagePanel.defaultConfig,
          imageMode: {
            calibrationTopic: "calibration",
            imageTopic: "camera",
            annotations: { annotations: { visible: true }, annotationsToClear: { visible: true } },
            ...imageModeConfigOverride,
          },
        }}
      />
    </PanelSetup>
  );
};

function moveAnnotations(annotation: Partial<ImageAnnotations>, vector: { x: number; y: number }) {
  const newAnnotation = _.cloneDeep(annotation);

  newAnnotation.circles?.forEach(({ position }) => {
    position.x += vector.x;
    position.y += vector.y;
  });

  newAnnotation.points?.forEach(({ points }) => {
    points.forEach((point) => {
      point.x += vector.x;
      point.y += vector.y;
    });
  });

  newAnnotation.texts?.forEach(({ position }) => {
    position.x += vector.x;
    position.y += vector.y;
  });

  return newAnnotation;
}

export const AnnotationsUpdate: StoryObj = {
  parameters: {
    useReadySignal: true,
  },
  render: AnnotationsUpdateStory,

  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },
};

type UpdateLineArgs = {
  messages: readonly Partial<ImageAnnotations>[];
};

function UpdateLineStory({ messages }: UpdateLineArgs): JSX.Element {
  const readySignal = useReadySignal();
  const width = 60;
  const height = 45;
  const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
    width,
    height,
    frameId: "camera",
    imageTopic: "camera",
    calibrationTopic: "calibration",
  });

  const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
    topic: "annotations",
    receiveTime: { sec: 0, nsec: 0 },
    message: messages[0]!,
    schemaName: "foxglove.ImageAnnotations",
    sizeInBytes: 0,
  };

  const [fixture, setFixture] = useState<Fixture>({
    topics: [
      { name: "calibration", schemaName: "foxglove.CameraCalibration" },
      { name: "camera", schemaName: "foxglove.RawImage" },
      { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
    ],
    frame: {
      calibration: [calibrationMessage],
      camera: [cameraMessage],
      annotations: [annotationsMessage],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
      isPlaying: true,
    },
  });

  useEffect(() => {
    void (async () => {
      for (let i = 1; i < messages.length; i++) {
        const newAnnotations: MessageEvent<Partial<ImageAnnotations>> = {
          ...annotationsMessage,
          message: messages[i]!,
        };
        await new Promise((resolve) => setTimeout(resolve, 500));

        setFixture((oldFixture) => ({
          ...oldFixture,
          frame: { annotations: [newAnnotations] },
        }));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      readySignal();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readySignal]);

  return (
    <PanelSetup fixture={fixture}>
      <ImagePanel
        overrideConfig={{
          ...ImagePanel.defaultConfig,
          imageMode: {
            calibrationTopic: "calibration",
            imageTopic: "camera",
            annotations: { annotations: { visible: true } },
          },
        }}
      />
    </PanelSetup>
  );
}

/** Vertex colors remain enabled, but colors change */
export const UpdateLineChangeVertexColors: StoryObj<UpdateLineArgs> = {
  parameters: {
    useReadySignal: true,
  },
  render: UpdateLineStory,
  args: {
    messages: [
      {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.LINE_LIST,
            points: [
              { x: 0, y: 0 },
              { x: 0, y: 8 },
              { x: 2, y: 6 },
              { x: 5, y: 2 },
            ],
            outline_color: { r: 1, g: 0, b: 0, a: 1 },
            outline_colors: [
              { r: 0, g: 0.5, b: 1, a: 1 },
              { r: 0, g: 0, b: 0.5, a: 1 },
              { r: 0, g: 0.5, b: 0, a: 1 },
              { r: 0.5, g: 0, b: 0, a: 1 },
            ],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 1,
          },
        ],
      },
      {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.LINE_LIST,
            points: [
              { x: 10 + 0, y: 0 },
              { x: 10 + 0, y: 8 },
              { x: 10 + 2, y: 6 },
              { x: 10 + 5, y: 2 },
            ],
            outline_color: { r: 1, g: 0, b: 0, a: 1 },
            outline_colors: [
              { r: 1, g: 0, b: 0, a: 1 },
              { r: 0, g: 1, b: 0, a: 1 },
              { r: 0, g: 0, b: 1, a: 1 },
              { r: 0, g: 1, b: 1, a: 1 },
            ],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 2,
          },
        ],
      },
    ],
  },

  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },
};

/** Change from vertex colors off to on */
export const UpdateLineEnableVertexColors: StoryObj<UpdateLineArgs> = {
  parameters: {
    useReadySignal: true,
  },
  render: UpdateLineStory,
  args: {
    messages: [
      {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.LINE_LOOP,
            points: [
              { x: 0, y: 0 },
              { x: 0, y: 8 },
              { x: 2, y: 6 },
              { x: 5, y: 2 },
            ],
            outline_color: { r: 1, g: 0, b: 0, a: 1 },
            outline_colors: [],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 1,
          },
        ],
      },
      {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.LINE_LIST,
            points: [
              { x: 10 + 0, y: 0 },
              { x: 10 + 0, y: 8 },
              { x: 10 + 2, y: 6 },
              { x: 10 + 5, y: 2 },
            ],
            outline_color: { r: 1, g: 0, b: 0, a: 1 },
            outline_colors: [
              { r: 1, g: 0, b: 0, a: 1 },
              { r: 0, g: 1, b: 0, a: 1 },
              { r: 0, g: 0, b: 1, a: 1 },
              { r: 0, g: 1, b: 1, a: 1 },
            ],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 2,
          },
        ],
      },
    ],
  },

  play: async (ctx) => {
    await ctx.parameters.storyReady;
  },
};

export const OddLengthLineList: StoryObj = {
  render: function Story() {
    const width = 60;
    const height = 45;
    const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
      width,
      height,
      frameId: "camera",
      imageTopic: "camera",
      calibrationTopic: "calibration",
    });

    const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
      topic: "annotations",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        points: [
          {
            timestamp: { sec: 0, nsec: 0 },
            type: PointsAnnotationType.LINE_LIST,
            points: [
              { x: 20 + 0, y: 10 + 0 },
              { x: 20 + 0, y: 10 + 8 },
              { x: 20 + 2, y: 10 + 6 },
              { x: 20 + 5, y: 10 + 2 },
              { x: 20 + 3, y: 10 + 1 },
            ],
            outline_color: { r: 0, g: 0, b: 0, a: 1 },
            outline_colors: [
              // 1 color per line
              { r: 1, g: 0, b: 0, a: 1 },
              { r: 0, g: 1, b: 0, a: 0.75 },
              { r: 0, g: 0, b: 1, a: 0.75 },
            ],
            fill_color: { r: 0, g: 0, b: 0, a: 0 },
            thickness: 2,
          },
        ],
      },
      schemaName: "foxglove.ImageAnnotations",
      sizeInBytes: 0,
    };

    const fixture: Fixture = {
      topics: [
        { name: "calibration", schemaName: "foxglove.CameraCalibration" },
        { name: "camera", schemaName: "foxglove.RawImage" },
        { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
      ],
      frame: {
        calibration: [calibrationMessage],
        camera: [cameraMessage],
        annotations: [annotationsMessage],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    };
    return (
      <div style={{ width: 1200, height: 900, flexShrink: 0 }}>
        <PanelSetup fixture={fixture} includeSettings>
          <ImagePanel
            overrideConfig={{
              ...ImagePanel.defaultConfig,
              imageMode: {
                calibrationTopic: "calibration",
                imageTopic: "camera",
                annotations: { annotations: { visible: true } },
              },
            }}
          />
        </PanelSetup>
      </div>
    );
  },
};

export const LinesWithAndWithoutVertexColors: StoryObj = {
  render: function Story() {
    const width = 60;
    const height = 45;
    const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
      width,
      height,
      frameId: "camera",
      imageTopic: "camera",
      calibrationTopic: "calibration",
    });
    const points = [
      { x: 10 + 0, y: 10 + 0 },
      { x: 10 - 5, y: 10 + 2 },
      { x: 10 - 5, y: 10 + 8 },
      { x: 10 + 0, y: 10 + 10 },
      { x: 10 + 5, y: 10 + 8 },
      { x: 10 + 5, y: 10 + 2 },
    ];
    const defaultPoints = {
      timestamp: { sec: 0, nsec: 0 },
      outline_color: { r: 0, g: 0, b: 0, a: 1 },
      outline_colors: [
        { r: 1, g: 0, b: 0, a: 1 },
        { r: 0, g: 1, b: 0, a: 0.75 },
        { r: 0, g: 0, b: 1, a: 0.75 },
        { r: 1, g: 0, b: 1, a: 0.75 },
      ],
      fill_color: { r: 0, g: 0, b: 0, a: 0 },
      thickness: 1,
    };

    const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
      topic: "annotations",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        points: [
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_LIST,
            points,
          },
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_LOOP,
            points: points.map(({ x, y }) => ({ x: x + 20, y })),
          },
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_STRIP,
            points: points.map(({ x, y }) => ({ x: x + 40, y })),
          },
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_LIST,
            points: points.map(({ x, y }) => ({ x, y: y + 20 })),
            outline_colors: [],
          },
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_LOOP,
            points: points.map(({ x, y }) => ({ x: x + 20, y: y + 20 })),
            outline_colors: [],
          },
          {
            ...defaultPoints,
            type: PointsAnnotationType.LINE_STRIP,
            points: points.map(({ x, y }) => ({ x: x + 40, y: y + 20 })),
            outline_colors: [],
          },
        ],
      },
      schemaName: "foxglove.ImageAnnotations",
      sizeInBytes: 0,
    };

    const fixture: Fixture = {
      topics: [
        { name: "calibration", schemaName: "foxglove.CameraCalibration" },
        { name: "camera", schemaName: "foxglove.RawImage" },
        { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
      ],
      frame: {
        calibration: [calibrationMessage],
        camera: [cameraMessage],
        annotations: [annotationsMessage],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    };
    return (
      <div style={{ width: 1200, height: 900, flexShrink: 0 }}>
        <PanelSetup fixture={fixture} includeSettings>
          <ImagePanel
            overrideConfig={{
              ...ImagePanel.defaultConfig,
              imageMode: {
                calibrationTopic: "calibration",
                imageTopic: "camera",
                annotations: { annotations: { visible: true } },
              },
            }}
          />
        </PanelSetup>
      </div>
    );
  },
};

type SyncAnnotationsStoryArgs = {
  status: "waiting" | "ready";
  hasCalibrationTopic: boolean;
};

const SyncAnnotationsStory = (args: SyncAnnotationsStoryArgs): JSX.Element => {
  const { status, hasCalibrationTopic } = args;
  const width = 60;
  const height = 45;
  const { calibrationMessage, cameraMessage } = makeRawImageAndCalibration({
    width,
    height,
    frameId: "camera",
    imageTopic: "camera",
    calibrationTopic: "calibration",
  });

  const annotationTimestamp =
    status === "ready" ? cameraMessage.message.timestamp! : { sec: 5, nsec: 0 };

  const annotationsMessage: MessageEvent<Partial<ImageAnnotations>> = {
    topic: "annotations",
    receiveTime: { sec: 10, nsec: 0 },
    message: {
      circles: [
        {
          timestamp: annotationTimestamp,
          position: { x: 20, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 1 },
          outline_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: annotationTimestamp,
          position: { x: 25, y: 5 },
          diameter: 4,
          thickness: 1,
          fill_color: { r: 1, g: 0, b: 1, a: 0.5 },
          outline_color: { r: 0, g: 0, b: 0, a: 0 },
        },
        {
          timestamp: annotationTimestamp,
          position: { x: 30, y: 5 },
          diameter: 4,
          thickness: 0.5,
          fill_color: { r: 1, g: 1, b: 0, a: 0 },
          outline_color: { r: 0, g: 1, b: 1, a: 0.5 },
        },
      ],
      points: [],
      texts: [
        {
          timestamp: annotationTimestamp,
          position: { x: 20, y: 30 },
          text: "Hi",
          font_size: 5,
          text_color: { r: 1, g: 0, b: 0, a: 1 },
          background_color: { r: 1, g: 1, b: 0, a: 1 },
        },
        {
          timestamp: annotationTimestamp,
          position: { x: 20, y: 32 },
          text: "hello",
          font_size: 3,
          text_color: { r: 0.3, g: 0.5, b: 0.5, a: 0.8 },
          background_color: { r: 1, g: 1, b: 1, a: 0.2 },
        },
      ],
    },
    schemaName: "foxglove.ImageAnnotations",
    sizeInBytes: 0,
  };

  const fixture: Fixture = {
    topics: [
      { name: "calibration", schemaName: "foxglove.CameraCalibration" },
      { name: "camera", schemaName: "foxglove.RawImage" },
      { name: "annotations", schemaName: "foxglove.ImageAnnotations" },
    ],
    frame: {
      calibration: [calibrationMessage],
      camera: [cameraMessage],
      annotations: [annotationsMessage],
    },
    capabilities: [],
    activeData: {
      currentTime: { sec: 0, nsec: 0 },
    },
  };
  return (
    <div style={{ width: 1200, height: 900, flexShrink: 0 }}>
      <PanelSetup fixture={fixture}>
        <ImagePanel
          overrideConfig={{
            ...ImagePanel.defaultConfig,
            imageMode: {
              calibrationTopic: hasCalibrationTopic ? "calibration" : undefined,
              imageTopic: "camera",
              annotations: { annotations: { visible: true } },
              synchronize: true,
            },
          }}
        />
      </PanelSetup>
    </div>
  );
};

export const SyncAnnotationsWaitingWithCalibration: StoryObj<SyncAnnotationsStoryArgs> = {
  render: SyncAnnotationsStory,
  args: {
    hasCalibrationTopic: true,
    status: "waiting",
  },
};
export const SyncAnnotationsWaitingWithoutCalibration: StoryObj<SyncAnnotationsStoryArgs> = {
  render: SyncAnnotationsStory,
  args: {
    hasCalibrationTopic: false,
    status: "waiting",
  },
};
export const SyncAnnotationsReadyWithCalibration: StoryObj<SyncAnnotationsStoryArgs> = {
  render: SyncAnnotationsStory,
  args: {
    hasCalibrationTopic: true,
    status: "ready",
  },
};
export const SyncAnnotationsReadyWithoutCalibration: StoryObj<SyncAnnotationsStoryArgs> = {
  render: SyncAnnotationsStory,
  args: {
    hasCalibrationTopic: false,
    status: "ready",
  },
};
