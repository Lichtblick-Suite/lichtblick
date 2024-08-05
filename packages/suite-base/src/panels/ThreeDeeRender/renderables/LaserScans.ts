// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTreeAction, MessageEvent } from "@lichtblick/suite";
import {
  DEFAULT_POINT_SETTINGS,
  LayerSettingsPointExtension,
  pointSettingsNode,
  PointsRenderable,
  RenderObjectHistory,
} from "@lichtblick/suite-base/panels/ThreeDeeRender/renderables/pointExtensionUtils";
import type { RosObject, RosValue } from "@lichtblick/suite-base/players/types";
import { emptyPose } from "@lichtblick/suite-base/util/Pose";
import * as _ from "lodash-es";
import * as THREE from "three";

import { Time, toNanoSec } from "@foxglove/rostime";
import { LaserScan as FoxgloveLaserScan } from "@foxglove/schemas";

import { colorHasTransparency, getColorConverter } from "./colorMode";
import { DynamicBufferGeometry } from "../DynamicBufferGeometry";
import { AnyRendererSubscription, IRenderer } from "../IRenderer";
import { BaseUserData, Renderable } from "../Renderable";
import { PartialMessage, PartialMessageEvent, SceneExtension } from "../SceneExtension";
import { SettingsTreeEntry, SettingsTreeNodeWithActionHandler } from "../SettingsManager";
import { LASERSCAN_DATATYPES as FOXGLOVE_LASERSCAN_DATATYPES } from "../foxglove";
import { normalizeFloat32Array, normalizeTime, normalizePose } from "../normalizeMessages";
import { LASERSCAN_DATATYPES as ROS_LASERSCAN_DATATYPES, LaserScan as RosLaserScan } from "../ros";
import { topicIsConvertibleToSchema } from "../topicIsConvertibleToSchema";
import { Pose } from "../transforms";

type LayerSettingsLaserScan = LayerSettingsPointExtension;
const DEFAULT_SETTINGS = DEFAULT_POINT_SETTINGS;

type NormalizedLaserScan = {
  timestamp: Time;
  frame_id: string;
  pose: Pose;
  start_angle: number;
  end_angle: number;
  range_min: number;
  range_max: number;
  ranges: Float32Array;
  intensities: Float32Array;
};

type LaserScanHistoryUserData = BaseUserData & {
  settings: LayerSettingsLaserScan;
  topic: string;
  latestLaserScan: NormalizedLaserScan;
  latestOriginalMessage: Record<string, RosValue> | undefined;
};

const LASERSCAN_FIELDS = ["range", "intensity"];

const ALL_LASERSCAN_DATATYPES = new Set<string>([
  ...FOXGLOVE_LASERSCAN_DATATYPES,
  ...ROS_LASERSCAN_DATATYPES,
]);

const INVALID_LASERSCAN = "INVALID_LASERSCAN";

const VEC3_ZERO = new THREE.Vector3();

const tempColor = { r: 0, g: 0, b: 0, a: 0 };

function createLaserScanGeometry(topic: string, usage: THREE.Usage): DynamicBufferGeometry {
  const geometry = new DynamicBufferGeometry(usage);
  geometry.name = `${topic}:LaserScan:geometry`;
  // Three.JS doesn't render anything if there is no attribute named position, so we use the name position for the "range" parameter.
  geometry.createAttribute("position", Float32Array, 1);
  geometry.createAttribute("color", Uint8Array, 4, true);
  return geometry;
}

type LaserScanUserData = BaseUserData & {
  laserScan: NormalizedLaserScan;
  originalMessage: Record<string, RosValue> | undefined;
};

class LaserScanRenderable extends PointsRenderable<LaserScanUserData> {
  // Since these materials have uniforms based on message data, each renderable needs its own
  // instance of the materials. Three.js internally caches WebGL programs to avoid compiling the
  // shaders more than once.
  #material: LaserScanMaterial;
  #pickingMaterial: LaserScanMaterial;
  #instancePickingMaterial: LaserScanInstancePickingMaterial;

  public constructor(name: string, userData: LaserScanUserData, geometry: DynamicBufferGeometry) {
    const material = new LaserScanMaterial();
    const pickingMaterial = new LaserScanMaterial({ picking: true });
    const instancePickingMaterial = new LaserScanInstancePickingMaterial();
    super(name, userData, geometry, material, pickingMaterial, instancePickingMaterial);
    this.#material = material;
    this.#pickingMaterial = pickingMaterial;
    this.#instancePickingMaterial = instancePickingMaterial;
  }

  public override details(): Record<string, RosValue> {
    return this.userData.originalMessage ?? {};
  }

  public override instanceDetails(instanceId: number): Record<string, RosValue> | undefined {
    const range =
      instanceId >= 0 && instanceId < this.userData.laserScan.ranges.length
        ? this.userData.laserScan.ranges[instanceId]
        : undefined;
    const intensity =
      instanceId >= 0 && instanceId < this.userData.laserScan.intensities.length
        ? this.userData.laserScan.intensities[instanceId]
        : undefined;
    return { range, intensity };
  }

  public updateUniforms(settings: LayerSettingsLaserScan, laserScan: NormalizedLaserScan): void {
    this.#material.updateUniforms(settings, laserScan);
    this.#pickingMaterial.updateUniforms(settings, laserScan);
    this.#instancePickingMaterial.updateUniforms(settings, laserScan);
  }

  public setPixelRatio(pixelRatio: number): void {
    this.#material.setPixelRatio(pixelRatio);
    this.#pickingMaterial.setPixelRatio(pixelRatio);
    this.#instancePickingMaterial.setPixelRatio(pixelRatio);
  }

  public override dispose(): void {
    super.dispose();
    this.#material.dispose();
    this.#pickingMaterial.dispose();
    this.#instancePickingMaterial.dispose();
  }
}

class LaserScanHistoryRenderable extends Renderable<LaserScanHistoryUserData> {
  public override pickable = false; // Picking happens on child renderables
  #pointsHistory: RenderObjectHistory<LaserScanRenderable>;

  public constructor(topic: string, renderer: IRenderer, userData: LaserScanHistoryUserData) {
    super(topic, renderer, userData);

    const isDecay = userData.settings.decayTime > 0;

    const geometry = createLaserScanGeometry(
      topic,
      isDecay ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage,
    );
    const points = new LaserScanRenderable(
      topic,
      {
        receiveTime: -1n, // unused
        messageTime: -1n, // unused
        frameId: "", //unused
        pose: userData.latestLaserScan.pose,
        settingsPath: [], //unused
        settings: { visible: true }, //unused
        topic,
        laserScan: userData.latestLaserScan,
        originalMessage: userData.latestOriginalMessage,
      },
      geometry,
    );

    this.#pointsHistory = new RenderObjectHistory({
      initial: {
        messageTime: userData.receiveTime,
        receiveTime: userData.receiveTime,
        renderable: points,
      },
      parentRenderable: this,
      renderer,
    });
    this.add(points);
  }
  public override dispose(): void {
    this.userData.latestOriginalMessage = undefined;
    this.#pointsHistory.dispose();
    super.dispose();
  }

  public updateLaserScan(
    laserScan: NormalizedLaserScan,
    originalMessage: RosObject | undefined,
    settings: LayerSettingsLaserScan,
    receiveTime: bigint,
  ): void {
    const messageTime = toNanoSec(laserScan.timestamp);
    this.userData.receiveTime = receiveTime;
    this.userData.messageTime = messageTime;
    this.userData.frameId = this.renderer.normalizeFrameId(laserScan.frame_id);
    this.userData.latestLaserScan = laserScan;
    this.userData.latestOriginalMessage = originalMessage;

    this.userData.settings = settings;
    const { colorField } = settings;
    const { intensities, ranges } = laserScan;

    // Invalid laser scan checks
    if (intensities.length !== 0 && intensities.length !== ranges.length) {
      const message = `LaserScan intensities length (${intensities.length}) does not match ranges length (${ranges.length})`;
      invalidLaserScanError(this.renderer, this, message);
      return;
    }
    if (colorField !== "intensity" && colorField !== "range") {
      const message = `LaserScan color field must be either 'intensity' or 'range', found '${colorField}'`;
      invalidLaserScanError(this.renderer, this, message);
      return;
    }

    const topic = this.userData.topic;
    const pointsHistory = this.#pointsHistory;
    const isDecay = settings.decayTime > 0;
    if (isDecay) {
      // Push a new (empty) entry to the history of points
      const geometry = createLaserScanGeometry(topic, THREE.StaticDrawUsage);
      const points = new LaserScanRenderable(
        topic,
        {
          receiveTime: -1n, // unused
          messageTime: -1n, // unused
          frameId: "", //unused
          pose: laserScan.pose,
          settingsPath: [], //unused
          settings: { visible: true }, //unused
          topic,
          laserScan,
          originalMessage,
        },
        geometry,
      );
      pointsHistory.addHistoryEntry({ receiveTime, messageTime, renderable: points });
      this.add(points);
    }

    const latestEntry = pointsHistory.latest();
    latestEntry.receiveTime = receiveTime;
    latestEntry.messageTime = messageTime;
    latestEntry.renderable.userData.pose = laserScan.pose;
    latestEntry.renderable.userData.laserScan = laserScan;
    latestEntry.renderable.userData.originalMessage = originalMessage;

    const geometry = latestEntry.renderable.geometry;
    geometry.resize(ranges.length);
    const rangeAttribute = geometry.attributes.position!;
    const colorAttribute = geometry.attributes.color!;
    rangeAttribute.set(ranges);

    // Update material uniforms
    latestEntry.renderable.updateUniforms(settings, laserScan);

    // Determine min/max color values (if needed) and max range
    let minColorValue = settings.minValue ?? Number.POSITIVE_INFINITY;
    let maxColorValue = settings.maxValue ?? Number.NEGATIVE_INFINITY;
    if (settings.minValue == undefined || settings.maxValue == undefined) {
      let maxRange = 0;

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]!;
        if (Number.isFinite(range)) {
          maxRange = Math.max(maxRange, range);
        }

        const colorValue = colorField === "range" ? range : intensities[i];
        if (Number.isFinite(colorValue)) {
          minColorValue = Math.min(minColorValue, colorValue!);
          maxColorValue = Math.max(maxColorValue, colorValue!);
        }
      }
      minColorValue = settings.minValue ?? minColorValue;
      maxColorValue = settings.maxValue ?? maxColorValue;

      // Update the LaserScan bounding sphere
      latestEntry.renderable.geometry.boundingSphere ??= new THREE.Sphere();
      latestEntry.renderable.geometry.boundingSphere.set(VEC3_ZERO, maxRange);
      latestEntry.renderable.frustumCulled = true;
    } else {
      latestEntry.renderable.geometry.boundingSphere = ReactNull;
      latestEntry.renderable.frustumCulled = false;
    }

    // Build a method to convert raw color field values to RGBA
    const colorConverter =
      settings.colorMode === "rgba-fields"
        ? () => NaN // should never happen: rgba-fields is not supported for LaserScans
        : getColorConverter(
            settings as typeof settings & { colorMode: typeof settings.colorMode },
            minColorValue,
            maxColorValue,
          );

    // Iterate the point cloud data to update color attribute
    for (let i = 0; i < ranges.length; i++) {
      const colorValue = colorField === "range" ? ranges[i]! : intensities[i] ?? 0;
      colorConverter(tempColor, colorValue);
      colorAttribute.setXYZW(i, tempColor.r, tempColor.g, tempColor.b, tempColor.a);
    }

    rangeAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  public invalidateLastEntry() {
    const lastEntry = this.#pointsHistory.latest();
    lastEntry.renderable.geometry.resize(0);
  }

  public startFrame(currentTime: bigint, renderFrameId: string, fixedFrameId: string): void {
    this.#pointsHistory.updateHistoryFromCurrentTime(currentTime);
    this.#pointsHistory.updatePoses(currentTime, renderFrameId, fixedFrameId);
    const pixelRatio = this.renderer.getPixelRatio();
    this.#pointsHistory.forEach((entry) => {
      entry.renderable.setPixelRatio(pixelRatio);
    });
  }
}

export class LaserScans extends SceneExtension<LaserScanHistoryRenderable> {
  public static extensionId = "foxglove.LaserScans";
  public constructor(renderer: IRenderer, name: string = LaserScans.extensionId) {
    super(name, renderer);
  }

  public override getSubscriptions(): readonly AnyRendererSubscription[] {
    return [
      {
        type: "schema",
        schemaNames: ROS_LASERSCAN_DATATYPES,
        subscription: {
          handler: this.#handleLaserScan,
          filterQueue: this.#processMessageQueue.bind(this),
        },
      },
      {
        type: "schema",
        schemaNames: FOXGLOVE_LASERSCAN_DATATYPES,
        subscription: {
          handler: this.#handleLaserScan,
          filterQueue: this.#processMessageQueue.bind(this),
        },
      },
    ];
  }

  #processMessageQueue<T>(msgs: MessageEvent<T>[]): MessageEvent<T>[] {
    if (msgs.length === 0) {
      return msgs;
    }
    const msgsByTopic = _.groupBy(msgs, (msg) => msg.topic);
    const finalQueue: MessageEvent<T>[] = [];
    for (const topic in msgsByTopic) {
      const topicMsgs = msgsByTopic[topic]!;
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsLaserScan>
        | undefined;
      // if the topic has a decaytime add all messages to queue for topic
      if ((userSettings?.decayTime ?? DEFAULT_SETTINGS.decayTime) > 0) {
        finalQueue.push(...topicMsgs);
        continue;
      }
      const latestMsg = topicMsgs[topicMsgs.length - 1];
      if (latestMsg) {
        finalQueue.push(latestMsg);
      }
    }
    return finalQueue;
  }
  public override settingsNodes(): SettingsTreeEntry[] {
    const configTopics = this.renderer.config.topics;
    const handler = this.handleSettingsAction;
    const entries: SettingsTreeEntry[] = [];
    for (const topic of this.renderer.topics ?? []) {
      const isLaserScan = topicIsConvertibleToSchema(topic, ALL_LASERSCAN_DATATYPES);
      if (!isLaserScan) {
        continue;
      }
      const config = (configTopics[topic.name] ?? {}) as Partial<LayerSettingsLaserScan>;
      const messageFields = LASERSCAN_FIELDS;
      const node: SettingsTreeNodeWithActionHandler = pointSettingsNode(
        topic,
        messageFields,
        config,
      );
      node.handler = handler;
      node.icon = "Radar";
      entries.push({ path: ["topics", topic.name], node });
    }
    return entries;
  }

  public override startFrame(
    currentTime: bigint,
    renderFrameId: string,
    fixedFrameId: string,
  ): void {
    // Do not call super.startFrame() since we handle updatePose() manually.
    // Instead of updating the pose for each Renderable in this.renderables, we
    // update the pose of each THREE.Points object in the pointsHistory of each
    // renderable

    for (const [topic, renderable] of this.renderables) {
      if (!renderable.userData.settings.visible) {
        renderable.removeFromParent();
        renderable.dispose();
        this.renderables.delete(topic);
        continue;
      }
      renderable.startFrame(currentTime, renderFrameId, fixedFrameId);
    }
  }

  public override handleSettingsAction = (action: SettingsTreeAction): void => {
    const path = action.payload.path;
    if (action.action !== "update" || path.length !== 3) {
      return;
    }

    this.saveSetting(path, action.payload.value);

    // Update the renderable
    const topicName = path[1]!;
    const renderable = this.renderables.get(topicName);
    if (renderable) {
      const prevSettings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsLaserScan>
        | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...prevSettings };

      renderable.updateLaserScan(
        renderable.userData.latestLaserScan,
        renderable.userData.latestOriginalMessage,
        settings,
        renderable.userData.receiveTime,
      );
    }
  };

  #handleLaserScan = (
    messageEvent: PartialMessageEvent<RosLaserScan | FoxgloveLaserScan>,
  ): void => {
    const topic = messageEvent.topic;
    const laserScan =
      "header" in messageEvent.message
        ? normalizeRosLaserScan(messageEvent.message)
        : normalizeFoxgloveLaserScan(messageEvent.message as PartialMessage<FoxgloveLaserScan>);
    const receiveTime = toNanoSec(messageEvent.receiveTime);

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsLaserScan>
        | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...userSettings };
      if (settings.colorField == undefined) {
        settings.colorField = "intensity";
        settings.colorMode = "colormap";
        settings.colorMap = "turbo";

        // Update user settings with the newly selected color field
        this.renderer.updateConfig((draft) => {
          const updatedUserSettings = { ...userSettings };
          updatedUserSettings.colorField = settings.colorField;
          updatedUserSettings.colorMode = settings.colorMode;
          updatedUserSettings.colorMap = settings.colorMap;
          draft.topics[topic] = updatedUserSettings;
        });
      }

      const messageTime = toNanoSec(laserScan.timestamp);
      renderable = new LaserScanHistoryRenderable(topic, this.renderer, {
        receiveTime,
        messageTime,
        frameId: this.renderer.normalizeFrameId(laserScan.frame_id),
        pose: laserScan.pose,
        settingsPath: ["topics", topic],
        settings,
        topic,
        latestLaserScan: laserScan,
        latestOriginalMessage: messageEvent.message as RosObject,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    renderable.updateLaserScan(
      laserScan,
      messageEvent.message as RosObject,
      renderable.userData.settings,
      receiveTime,
    );
  };
}

export class LaserScanMaterial extends THREE.RawShaderMaterial {
  static #MIN_PICKING_POINT_SIZE = 8;

  public constructor({ picking = false }: { picking?: boolean } = {}) {
    super({
      glslVersion: THREE.GLSL3,
      vertexShader: /*glsl*/ `
        precision highp float;
        precision highp int;
        uniform mat4 projectionMatrix, modelViewMatrix;

        uniform float pointSize;
        uniform float pixelRatio;
        uniform float angleMin, angleIncrement;
        uniform float rangeMin, rangeMax;
        in float position; // range, but must be named position in order for three.js to render anything
        in mediump vec4 color;
        out mediump vec4 vColor;
        void main() {
          if (position < rangeMin || position > rangeMax) {
            gl_PointSize = 0.0;
            return;
          }
          vColor = color;
          float angle = angleMin + angleIncrement * float(gl_VertexID);
          vec4 pos = vec4(position * cos(angle), position * sin(angle), 0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * pos;
          ${
            picking
              ? /* glsl */ `gl_PointSize = pixelRatio * max(pointSize, ${LaserScanMaterial.#MIN_PICKING_POINT_SIZE.toFixed(
                  1,
                )});`
              : "gl_PointSize = pixelRatio * pointSize;"
          }

        }
      `,
      fragmentShader: `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
        uniform bool isCircle;
        ${picking ? "uniform vec4 objectId;" : "in mediump vec4 vColor;"}
        out vec4 outColor;

        ${THREE.ShaderChunk.colorspace_pars_fragment /* for LinearTosRGB() */}

        void main() {
          if (isCircle) {
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            if (dot(cxy, cxy) > 1.0) { discard; }
          }
          ${picking ? "outColor = objectId;" : "outColor = LinearTosRGB(vColor);"}
        }
      `,
    });
    this.uniforms = {
      isCircle: { value: false },
      pointSize: { value: 1 },
      pixelRatio: { value: 1 },
      angleMin: { value: NaN },
      angleIncrement: { value: NaN },
      rangeMin: { value: NaN },
      rangeMax: { value: NaN },
    };
    if (picking) {
      this.uniforms.objectId = { value: [NaN, NaN, NaN, NaN] };
    }
  }

  public updateUniforms(settings: LayerSettingsLaserScan, laserScan: NormalizedLaserScan): void {
    this.uniforms.isCircle!.value = settings.pointShape === "circle";
    this.uniforms.pointSize!.value = settings.pointSize;
    this.uniforms.angleMin!.value = laserScan.start_angle;
    this.uniforms.angleIncrement!.value =
      (laserScan.end_angle - laserScan.start_angle) / (laserScan.ranges.length - 1);
    this.uniforms.rangeMin!.value = laserScan.range_min;
    this.uniforms.rangeMax!.value = laserScan.range_max;
    this.uniformsNeedUpdate = true;

    const transparent = colorHasTransparency(settings);
    if (transparent !== this.transparent) {
      this.transparent = transparent;
      this.depthWrite = !this.transparent;
      this.needsUpdate = true;
    }
  }

  public setPixelRatio(pixelRatio: number): void {
    this.uniforms.pixelRatio!.value = pixelRatio;
  }
}

class LaserScanInstancePickingMaterial extends THREE.RawShaderMaterial {
  static #MIN_PICKING_POINT_SIZE = 8;

  public constructor() {
    const minPointSize = LaserScanInstancePickingMaterial.#MIN_PICKING_POINT_SIZE.toFixed(1);
    super({
      glslVersion: THREE.GLSL3,
      vertexShader: /* glsl */ `
        precision highp float;
        precision highp int;
        uniform mat4 projectionMatrix, modelViewMatrix;

        uniform float pointSize;
        uniform float pixelRatio;
        uniform float angleMin, angleIncrement;
        uniform float rangeMin, rangeMax;
        in float position; // range, but must be named position in order for three.js to render anything
        out vec4 objectId;
        void main() {
          if (position < rangeMin || position > rangeMax) {
            gl_PointSize = 0.0;
            return;
          }
          objectId = vec4(
            float((gl_VertexID >> 24) & 255) / 255.0,
            float((gl_VertexID >> 16) & 255) / 255.0,
            float((gl_VertexID >> 8) & 255) / 255.0,
            float(gl_VertexID & 255) / 255.0);
          float angle = angleMin + angleIncrement * float(gl_VertexID);
          vec4 pos = vec4(position * cos(angle), position * sin(angle), 0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * pos;
          gl_PointSize = pixelRatio * max(pointSize, ${minPointSize});
        }
      `,
      fragmentShader: /* glsl */ `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
        #else
          precision mediump float;
        #endif
        uniform bool isCircle;
        in vec4 objectId;
        out vec4 outColor;

        void main() {
          if (isCircle) {
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            if (dot(cxy, cxy) > 1.0) { discard; }
          }
          outColor = objectId;
        }
      `,
    });
    this.uniforms = {
      isCircle: { value: false },
      pointSize: { value: 1 },
      pixelRatio: { value: 1 },
      angleMin: { value: NaN },
      angleIncrement: { value: NaN },
      rangeMin: { value: NaN },
      rangeMax: { value: NaN },
    };
  }

  public updateUniforms(settings: LayerSettingsLaserScan, laserScan: NormalizedLaserScan): void {
    this.uniforms.isCircle!.value = settings.pointShape === "circle";
    this.uniforms.pointSize!.value = settings.pointSize;
    this.uniforms.angleMin!.value = laserScan.start_angle;
    this.uniforms.angleIncrement!.value =
      (laserScan.end_angle - laserScan.start_angle) / (laserScan.ranges.length - 1);
    this.uniforms.rangeMin!.value = laserScan.range_min;
    this.uniforms.rangeMax!.value = laserScan.range_max;
    this.uniformsNeedUpdate = true;
  }

  public setPixelRatio(pixelRatio: number): void {
    this.uniforms.pixelRatio!.value = pixelRatio;
  }
}

function invalidLaserScanError(
  renderer: IRenderer,
  renderable: LaserScanHistoryRenderable,
  message: string,
): void {
  renderer.settings.errors.addToTopic(renderable.userData.topic, INVALID_LASERSCAN, message);
  renderable.invalidateLastEntry();
}

function normalizeFoxgloveLaserScan(
  message: PartialMessage<FoxgloveLaserScan>,
): NormalizedLaserScan {
  return {
    timestamp: normalizeTime(message.timestamp),
    frame_id: message.frame_id ?? "",
    pose: normalizePose(message.pose),
    start_angle: message.start_angle ?? 0,
    end_angle: message.end_angle ?? 0,
    range_min: -Infinity,
    range_max: Infinity,
    ranges: normalizeFloat32Array(message.ranges),
    intensities: normalizeFloat32Array(message.intensities),
  };
}

function normalizeRosLaserScan(message: PartialMessage<RosLaserScan>): NormalizedLaserScan {
  return {
    timestamp: normalizeTime(message.header?.stamp),
    frame_id: message.header?.frame_id ?? "",
    pose: emptyPose(),
    start_angle: message.angle_min ?? 0,
    end_angle: message.angle_max ?? 0,
    range_min: message.range_min ?? -Infinity,
    range_max: message.range_max ?? Infinity,
    ranges: normalizeFloat32Array(message.ranges),
    intensities: normalizeFloat32Array(message.intensities),
  };
}
