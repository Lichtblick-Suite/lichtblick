// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTreeNode, Topic } from "@lichtblick/suite";
import { DynamicBufferGeometry } from "@lichtblick/suite-base/panels/ThreeDeeRender/DynamicBufferGeometry";
import { IRenderer } from "@lichtblick/suite-base/panels/ThreeDeeRender/IRenderer";
import { BaseUserData, Renderable } from "@lichtblick/suite-base/panels/ThreeDeeRender/Renderable";
import { rgbaToCssString } from "@lichtblick/suite-base/panels/ThreeDeeRender/color";
import {
  MISSING_TRANSFORM,
  missingTransformMessage,
} from "@lichtblick/suite-base/panels/ThreeDeeRender/renderables/transforms";
import { BaseSettings } from "@lichtblick/suite-base/panels/ThreeDeeRender/settings";
import { MAX_DURATION } from "@lichtblick/suite-base/panels/ThreeDeeRender/transforms";
import { updatePose } from "@lichtblick/suite-base/panels/ThreeDeeRender/updatePose";
import { t } from "i18next";
import * as THREE from "three";

import { LaserScanMaterial } from "./LaserScans";
import {
  colorHasTransparency,
  ColorModeSettings,
  colorModeSettingsFields,
  FS_SRGB_TO_LINEAR,
} from "./colorMode";
import { POINTCLOUD_DATATYPES as LICHTBLICK_POINTCLOUD_DATATYPES } from "../foxglove";
import { POINTCLOUD_DATATYPES as ROS_POINTCLOUD_DATATYPES } from "../ros";

export type LayerSettingsPointExtension = BaseSettings &
  ColorModeSettings & {
    pointSize: number;
    pointShape: "circle" | "square";
    decayTime: number;
  };

const DEFAULT_POINT_SIZE = 1.5;
const DEFAULT_POINT_SHAPE = "circle";
const DEFAULT_COLOR_MAP = "turbo";
const DEFAULT_FLAT_COLOR = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_MIN_COLOR = { r: 100 / 255, g: 47 / 255, b: 105 / 255, a: 1 };
const DEFAULT_MAX_COLOR = { r: 227 / 255, g: 177 / 255, b: 135 / 255, a: 1 };

// used by LaserScans, VelodyneScans, and PointClouds
export const DEFAULT_POINT_SETTINGS: LayerSettingsPointExtension = {
  visible: false,
  frameLocked: false,
  pointSize: DEFAULT_POINT_SIZE,
  pointShape: DEFAULT_POINT_SHAPE,
  decayTime: 0,
  colorMode: "flat",
  flatColor: rgbaToCssString(DEFAULT_FLAT_COLOR),
  colorField: undefined,
  gradient: [rgbaToCssString(DEFAULT_MIN_COLOR), rgbaToCssString(DEFAULT_MAX_COLOR)],
  colorMap: DEFAULT_COLOR_MAP,
  explicitAlpha: 1,
  minValue: undefined,
  maxValue: undefined,
};

export const POINT_CLOUD_REQUIRED_FIELDS = ["x", "y", "z"];

/**
 * Creates settings node for Point cloud and scan topics
 * @param topic - topic to get settings node for
 * @param messageFields - message fields or required fields for the topic
 * @param config - current topic settings
 * @param defaultSettings - (optional) default settings to use
 * @returns  - settings node for the topic
 */
export function pointSettingsNode(
  topic: Topic,
  messageFields: string[],
  config: Partial<LayerSettingsPointExtension>,
  defaultSettings: LayerSettingsPointExtension = DEFAULT_POINT_SETTINGS,
): SettingsTreeNode {
  const pointSize = config.pointSize;
  const pointShape = config.pointShape ?? "circle";
  const decayTime = config.decayTime;

  const colorModeFields = colorModeSettingsFields({
    msgFields: messageFields,
    config,
    defaults: defaultSettings,
    modifiers: {
      supportsPackedRgbModes: ROS_POINTCLOUD_DATATYPES.has(topic.schemaName),
      supportsRgbaFieldsMode: LICHTBLICK_POINTCLOUD_DATATYPES.has(topic.schemaName),
    },
  });

  const node: SettingsTreeNode = {
    order: topic.name.toLocaleLowerCase(),
    visible: config.visible ?? defaultSettings.visible,
    fields: {
      pointSize: {
        label: t("threeDee:pointSize"),
        input: "number",
        step: 1,
        placeholder: "2",
        precision: 2,
        value: pointSize,
        min: 0,
      },
      pointShape: {
        label: t("threeDee:pointShape"),
        input: "select",
        options: [
          { label: t("threeDee:pointShapeCircle"), value: "circle" },
          { label: t("threeDee:pointShapeSquare"), value: "square" },
        ],
        value: pointShape,
      },
      decayTime: {
        label: t("threeDee:decayTime"),
        input: "number",
        step: 0.5,
        placeholder: t("threeDee:decayTimeDefaultZeroSeconds"),
        min: 0,
        precision: 3,
        value: decayTime,
      },
      ...colorModeFields,
    },
  };

  return node;
}

/**
 * Creates a THREE.Points object for a point cloud and scan messages
 * @param topic - topic name string for naming geometry
 * @param usage - THREE draw usage (ex: THREE.StaticDrawUsage)
 * @returns
 */
export function createGeometry(topic: string, usage: THREE.Usage): DynamicBufferGeometry {
  const geometry = new DynamicBufferGeometry(usage);
  geometry.name = `${topic}:PointScans:geometry`;
  geometry.createAttribute("position", Float32Array, 3);
  geometry.createAttribute("color", Uint8Array, 4, true);
  return geometry;
}

type Material = THREE.PointsMaterial | LaserScanMaterial;

export function pointCloudColorEncoding<T extends LayerSettingsPointExtension>(
  settings: T,
): "srgb" | "linear" {
  switch (settings.colorMode) {
    case "flat":
    case "colormap":
    case "gradient":
      // converted to linear by getColorConverter
      return "linear";
    case "rgb":
    case "rgba":
    case "rgba-fields":
      return "srgb";
  }
}

export class PointsRenderable<TUserData extends BaseUserData = BaseUserData> extends Renderable<
  TUserData,
  /*TRenderer=*/ undefined
> {
  #points: THREE.Points<DynamicBufferGeometry, Material>;
  public readonly geometry: DynamicBufferGeometry;
  public override pickableInstances = true;

  public constructor(
    name: string,
    userData: TUserData,
    geometry: DynamicBufferGeometry,
    material: Material,
    pickingMaterial: THREE.Material,
    instancePickingMaterial: THREE.Material,
  ) {
    super(name, undefined, userData);
    this.geometry = geometry;

    const points = new THREE.Points<DynamicBufferGeometry, Material>(geometry, material);
    // We don't calculate the bounding sphere for points, so frustum culling is disabled
    points.frustumCulled = false;
    points.name = `${userData.topic}:PointCloud:points`;
    points.userData = {
      pickingMaterial,
      instancePickingMaterial,
      pose: userData.pose,
    };
    this.#points = points;
    this.add(points);
  }

  public override dispose(): void {
    this.#points.geometry.dispose();
  }

  public updateMaterial(material: Material): void {
    this.#points.material = material;
  }
}

// Fragment shader chunk to convert sRGB to linear RGB
const FS_POINTCLOUD_SRGB_TO_LINEAR = /* glsl */ `
outgoingLight = sRGBToLinear(outgoingLight);
`;

// Fragment shader chunk to render a GL_POINT as a circle
const FS_POINTCLOUD_CIRCLE = /* glsl */ `
vec2 cxy = 2.0 * gl_PointCoord - 1.0;
if (dot(cxy, cxy) > 1.0) { discard; }
`;

export function pointCloudMaterial<T extends LayerSettingsPointExtension>(
  settings: T,
): THREE.PointsMaterial {
  const transparent = colorHasTransparency(settings);
  const encoding = pointCloudColorEncoding(settings);
  const scale = settings.pointSize;
  const shape = settings.pointShape;

  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: scale,
    sizeAttenuation: false,
    transparent,
    // The sorting issues caused by writing semi-transparent pixels to the depth buffer are less
    // distracting for point clouds than the self-sorting artifacts when depth writing is disabled
    depthWrite: true,
  });

  // Tell three.js to recompile the shader when `shape` or `encoding` change
  material.customProgramCacheKey = () => `${shape}-${encoding}`;
  material.onBeforeCompile = (shader) => {
    const SEARCH = "#include <opaque_fragment>";
    if (shape === "circle") {
      // Patch the fragment shader to render points as circles
      shader.fragmentShader = shader.fragmentShader.replace(SEARCH, FS_POINTCLOUD_CIRCLE + SEARCH);
    }
    if (encoding === "srgb") {
      // Patch the fragment shader to add sRGB->linear color conversion
      shader.fragmentShader =
        FS_SRGB_TO_LINEAR +
        shader.fragmentShader.replace(SEARCH, FS_POINTCLOUD_SRGB_TO_LINEAR + SEARCH);
    }
  };

  return material;
}

export function createPickingMaterial<T extends LayerSettingsPointExtension>(
  settings: T,
): THREE.ShaderMaterial {
  const MIN_PICKING_POINT_SIZE = 8;

  // Use a custom shader for picking that sets a minimum point size to make
  // individual points easier to click on
  const pointSize = Math.max(settings.pointSize, MIN_PICKING_POINT_SIZE);
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      uniform float pointSize;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = pointSize;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec4 objectId;
      void main() {
        gl_FragColor = objectId;
      }
    `,
    side: THREE.DoubleSide,
    uniforms: { pointSize: { value: pointSize }, objectId: { value: [NaN, NaN, NaN, NaN] } },
  });
}

export function createInstancePickingMaterial<T extends LayerSettingsPointExtension>(
  settings: T,
): THREE.ShaderMaterial {
  const MIN_PICKING_POINT_SIZE = 8;

  // Use a custom shader for picking that sets a minimum point size to make
  // individual points easier to click on
  const pointSize = Math.max(settings.pointSize, MIN_PICKING_POINT_SIZE);
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
        uniform float pointSize;
        varying vec4 objectId;
        void main() {
          objectId = vec4(
            float((gl_VertexID >> 24) & 255) / 255.0,
            float((gl_VertexID >> 16) & 255) / 255.0,
            float((gl_VertexID >> 8) & 255) / 255.0,
            float(gl_VertexID & 255) / 255.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize;
        }
      `,
    fragmentShader: /* glsl */ `
        varying vec4 objectId;
        void main() {
          gl_FragColor = objectId;
        }
      `,
    side: THREE.DoubleSide,
    uniforms: { pointSize: { value: pointSize } },
  });
}

type RenderObjectHistoryUserData = BaseUserData & {
  topic: string;
  settings: LayerSettingsPointExtension;
};

type DisposableObject = THREE.Object3D & { dispose(): void };
type HistoryEntry<TRenderable extends DisposableObject> = {
  receiveTime: bigint;
  messageTime: bigint;
  renderable: TRenderable;
};

/**
 * Class that handles lifecycle of 3d object history over the decay time
 * This class encapsulates the functionality of showing the history of an object within a specified decay time.
 * Meant to be extensible for all kinds of renderables that need to show old points over decay time.
 * See LaserScansRenderable and PointCloudsRenderable for examples.
 */
export class RenderObjectHistory<TRenderable extends DisposableObject> {
  #history: HistoryEntry<TRenderable>[];
  #parentRenderable: Renderable<RenderObjectHistoryUserData>;
  #renderer: IRenderer;

  public constructor({
    initial,
    renderer,
    parentRenderable,
  }: {
    initial: HistoryEntry<TRenderable>;
    renderer: IRenderer;
    parentRenderable: Renderable<RenderObjectHistoryUserData>;
  }) {
    this.#history = [initial];
    this.#renderer = renderer;
    this.#parentRenderable = parentRenderable;
  }

  public addHistoryEntry(entry: HistoryEntry<TRenderable>): void {
    this.#history.push(entry);
  }

  public forEach(callback: (entry: HistoryEntry<TRenderable>) => void): void {
    this.#history.forEach(callback);
  }

  public updateHistoryFromCurrentTime(currentTime: bigint): void {
    // Remove expired entries from the history of points when decayTime is enabled
    const pointsHistory = this.#history;
    const decayTime = this.#parentRenderable.userData.settings.decayTime;
    const expireTime =
      decayTime > 0 ? currentTime - BigInt(Math.round(decayTime * 1e9)) : MAX_DURATION;
    while (pointsHistory.length > 1 && pointsHistory[0]!.receiveTime < expireTime) {
      const entry = this.#history.shift()!;
      this.#parentRenderable.remove(entry.renderable);
      entry.renderable.dispose();
    }
  }

  public updatePoses(currentTime: bigint, renderFrameId: string, fixedFrameId: string): void {
    // Update the pose on each entry
    let hadTfError = false;
    for (const entry of this.#history) {
      const srcTime = entry.messageTime;
      const frameId = this.#parentRenderable.userData.frameId;
      const updated = updatePose(
        entry.renderable,
        this.#renderer.transformTree,
        renderFrameId,
        fixedFrameId,
        frameId,
        currentTime,
        srcTime,
      );
      if (!updated && !hadTfError) {
        const message = missingTransformMessage(renderFrameId, fixedFrameId, frameId);
        this.#renderer.settings.errors.add(
          this.#parentRenderable.userData.settingsPath,
          MISSING_TRANSFORM,
          message,
        );
        hadTfError = true;
      }
    }
  }

  public latest(): HistoryEntry<TRenderable> {
    if (this.#history.length === 0) {
      throw new Error("RenderObjectHistory is empty");
    }
    return this.#history[this.#history.length - 1]!;
  }

  /** Removes all but the last renderable, which would be the current object used in rendering. */
  public clearHistory(): void {
    for (const entry of this.#history.splice(0, this.#history.length - 1)) {
      entry.renderable.dispose();
      this.#parentRenderable.remove(entry.renderable);
    }
  }

  public dispose(): void {
    for (const entry of this.#history) {
      entry.renderable.dispose();
    }
    this.#history.length = 0;
  }
}
