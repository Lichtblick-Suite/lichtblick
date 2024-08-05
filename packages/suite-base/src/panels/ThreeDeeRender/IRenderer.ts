// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Immutable,
  MessageEvent,
  ParameterValue,
  SettingsIcon,
  Topic,
  VariableValue,
} from "@lichtblick/suite";
import { PanelContextMenuItem } from "@lichtblick/suite-base/components/PanelContextMenu";
import {
  BuiltinPanelExtensionContext,
  DraggedMessagePath,
  MessagePathDropStatus,
} from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { HUDItemManager } from "@lichtblick/suite-base/panels/ThreeDeeRender/HUDItemManager";
import { ICameraHandler } from "@lichtblick/suite-base/panels/ThreeDeeRender/renderables/ICameraHandler";
import IAnalytics from "@lichtblick/suite-base/services/IAnalytics";
import EventEmitter from "eventemitter3";
import * as THREE from "three";

import { LabelPool } from "@foxglove/three-text";

import { HUDItem } from "./HUDItemManager";
import { Input } from "./Input";
import { MeshUpAxis, ModelCache } from "./ModelCache";
import { PickedRenderable } from "./Picker";
import { SceneExtension } from "./SceneExtension";
import { SettingsManager } from "./SettingsManager";
import { SharedGeometry } from "./SharedGeometry";
import { CameraState } from "./camera";
import { DetailLevel } from "./lod";
import { LayerSettingsTransform } from "./renderables/FrameAxes";
import { MeasurementTool } from "./renderables/MeasurementTool";
import { PublishClickTool, PublishClickType } from "./renderables/PublishClickTool";
import { ColorModeSettings } from "./renderables/colorMode";
import { MarkerPool } from "./renderables/markers/MarkerPool";
import { Quaternion, Vector3 } from "./ros";
import { BaseSettings, CustomLayerSettings, SelectEntry } from "./settings";
import { TransformTree } from "./transforms";
import { InterfaceMode } from "./types";

export type RendererEvents = {
  startFrame: (currentTime: bigint, renderer: IRenderer) => void;
  endFrame: (currentTime: bigint, renderer: IRenderer) => void;
  cameraMove: (renderer: IRenderer) => void;
  renderablesClicked: (
    selections: PickedRenderable[],
    cursorCoords: { x: number; y: number },
    renderer: IRenderer,
  ) => void;
  selectedRenderable: (selection: PickedRenderable | undefined, renderer: IRenderer) => void;
  parametersChange: (
    parameters: ReadonlyMap<string, ParameterValue> | undefined,
    renderer: IRenderer,
  ) => void;
  /** Fired when the structure of the transform tree changes ie: new frame added/removed or frame assigned new parent */
  transformTreeUpdated: (renderer: IRenderer) => void;
  settingsTreeChange: (renderer: IRenderer) => void;
  configChange: (renderer: IRenderer) => void;
  schemaSubscriptionsChanged: (renderer: IRenderer) => void;
  topicSubscriptionsChanged: (renderer: IRenderer) => void;
  topicsChanged: (renderer: IRenderer) => void;
  resetViewChanged: (renderer: IRenderer) => void;
  resetAllFramesCursor: (renderer: IRenderer) => void;
  hudItemsChanged: (renderer: IRenderer) => void;
};

export type FollowMode = "follow-pose" | "follow-position" | "follow-none";

export type ImageAnnotationSettings = {
  visible: boolean;
};

/** Arguments that can be passed to the renderer for local testing */
export type TestOptions = {
  /** Override default downloading behavior, used for Storybook */
  onDownloadImage?: (blob: Blob, fileName: string) => void;
  debugPicking?: boolean;
};

/** Settings pertaining to Image mode */
export type ImageModeConfig = Partial<ColorModeSettings> & {
  /** Image topic to display */
  imageTopic?: string;
  /** Topic containing CameraCalibration or CameraInfo */
  calibrationTopic?: string;
  /** Annotation topicName -> settings, analogous to {@link RendererConfig.topics} */
  annotations?: Record<string, Partial<ImageAnnotationSettings> | undefined>;
  synchronize?: boolean;
  /** Rotation */
  rotation?: 0 | 90 | 180 | 270;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  /** Minimum (black) value for single-channel images */
  minValue?: number;
  /** Maximum (white) value for single-channel images */
  maxValue?: number;
};

export type RendererConfig = {
  /** Camera settings for the currently rendering scene */
  cameraState: CameraState;
  /** Coordinate frameId of the rendering frame */
  followTf: string | undefined;
  /** Camera follow mode */
  followMode: FollowMode;
  scene: {
    /** Show rendering metrics in a DOM overlay */
    enableStats?: boolean;
    /** Background color override for the scene, sent to `glClearColor()` */
    backgroundColor?: string;
    /* Scale factor to apply to all labels */
    labelScaleFactor?: number;
    /** Ignore the <up_axis> tag in COLLADA files (matching rviz behavior) */
    ignoreColladaUpAxis?: boolean;
    meshUpAxis?: MeshUpAxis;
    transforms?: {
      /** Toggles translation and rotation offset controls for frames */
      editable?: boolean;
      /** Toggles visibility of frame axis labels */
      showLabel?: boolean;
      /** Size of frame axis labels */
      labelSize?: number;
      /** Size of coordinate frame axes */
      axisScale?: number;
      /** Width of the connecting line between child and parent frames */
      lineWidth?: number;
      /** Color of the connecting line between child and parent frames */
      lineColor?: string;
      /** Enable transform preloading */
      enablePreloading?: boolean;
    };
    /** Sync camera with other 3d panels */
    syncCamera?: boolean;
    /** Toggles visibility of all topics */
    topicsVisible?: boolean;
  };
  publish: {
    /** The type of message to publish when clicking in the scene */
    type: PublishClickType;
    /** The topic on which to publish poses */
    poseTopic: string;
    /** The topic on which to publish points */
    pointTopic: string;
    /** The topic on which to publish pose estimates */
    poseEstimateTopic: string;
    /** The X standard deviation to publish with poses */
    poseEstimateXDeviation: number;
    /** The Y standard deviation to publish with poses */
    poseEstimateYDeviation: number;
    /** The theta standard deviation to publish with poses */
    poseEstimateThetaDeviation: number;
  };
  /** frameId -> settings */
  transforms: Record<string, Partial<LayerSettingsTransform> | undefined>;
  /** topicName -> settings */
  topics: Record<string, Partial<BaseSettings> | undefined>;
  /** instanceId -> settings */
  layers: Record<string, Partial<CustomLayerSettings> | undefined>;

  /** Settings pertaining to Image mode */
  imageMode: ImageModeConfig;
};

export type RendererSubscription<T = unknown> = {
  /** Preload the full history of topic messages as a best effort */
  preload?: boolean;
  /**
   * By default, topic subscriptions are only created when the topic visibility
   * has been toggled on by the user in the settings sidebar. Override this
   * behavior with a custom shouldSubscribe callback. This callback will be
   * called whenever the list of available topics changes or when any 3D panel
   * settings are changed.
   */
  shouldSubscribe?: (topic: string) => boolean;
  /** Callback that will be fired for each matching incoming message */
  handler: (messageEvent: MessageEvent<T>) => void;
  /** Queue of messages to be handled since last frame. Will be reassigned to new empty array each frame. */
  queue?: MessageEvent<T>[] | undefined;
  /** Optional callback to be called on `queue` to filter. Returns new queue. */
  filterQueue?: (queue: MessageEvent<T>[]) => MessageEvent<T>[];
};

export type AnyRendererSubscription = Immutable<
  | {
      type: "schema";
      schemaNames: Set<string>;
      // any is used here to allow storing heterogeneous arrays of subscriptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscription: RendererSubscription<any>;
    }
  | {
      type: "topic";
      topicName: string;
      // any is used here to allow storing heterogeneous arrays of subscriptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscription: RendererSubscription<any>;
    }
>;

export class InstancedLineMaterial extends THREE.LineBasicMaterial {
  public constructor(...args: ConstructorParameters<typeof THREE.LineBasicMaterial>) {
    super(...args);
    this.defines ??= {};
    this.defines.USE_INSTANCING = true;
  }
}

export interface IRenderer extends EventEmitter<RendererEvents> {
  readonly interfaceMode: InterfaceMode;
  readonly gl: THREE.WebGLRenderer;
  readonly testOptions: TestOptions;
  maxLod: DetailLevel;
  config: Immutable<RendererConfig>;
  settings: SettingsManager;
  hud: HUDItemManager;
  debugPicking: boolean;
  // [{ name, datatype }]
  topics: ReadonlyArray<Topic> | undefined;
  // topicName -> { name, datatype }
  topicsByName: ReadonlyMap<string, Topic> | undefined;
  // parameterKey -> parameterValue
  parameters: ReadonlyMap<string, ParameterValue> | undefined;
  // variableName -> variableValue
  variables: ReadonlyMap<string, VariableValue>;
  // extensionId -> SceneExtension
  sceneExtensions: Map<string, SceneExtension>;
  // datatype -> RendererSubscription[]
  schemaSubscriptions: Map<string, RendererSubscription[]>;
  // topicName -> RendererSubscription[]
  topicSubscriptions: Map<string, RendererSubscription[]>;
  // layerId -> { action, handler }
  input: Input;
  readonly outlineMaterial: THREE.LineBasicMaterial;
  readonly instancedOutlineMaterial: InstancedLineMaterial;

  measurementTool: MeasurementTool;
  publishClickTool: PublishClickTool;

  /** only public for testing - prefer to use `getCameraState` instead */
  cameraHandler: ICameraHandler;

  // Are we connected to a ROS data source? Normalize coordinate frames if so by
  // stripping any leading "/" prefix. See `normalizeFrameId()` for details.
  ros: boolean;

  colorScheme: "dark" | "light";
  modelCache: ModelCache;
  transformTree: TransformTree;
  coordinateFrameList: SelectEntry[];
  currentTime: bigint;
  /** Coordinate frame that transforms are applied through to the follow frame. Should be unchanging. */
  fixedFrameId: string | undefined;
  /**
   * The frameId that we _want_ to follow and render in if it exists.
   */
  readonly followFrameId: string | undefined;

  labelPool: LabelPool;
  markerPool: MarkerPool;
  sharedGeometry: SharedGeometry;

  /** Optional analytics API to log events in Renderer or SceneExtensions */
  analytics?: IAnalytics;
  setAnalytics(analytics: IAnalytics): void;
  enableImageOnlySubscriptionMode: () => void;
  disableImageOnlySubscriptionMode: () => void;

  dispose(): void;
  cameraSyncError(): undefined | string;
  setCameraSyncError(error: undefined | string): void;
  getPixelRatio(): number;

  /**
   *
   * @param currentTime what renderer.currentTime will be set to
   */
  setCurrentTime(newTimeNs: bigint): void;

  /**
   * Updates renderer state according to seek delta. Handles clearing of future state and resetting of allFrames cursor if seeked backwards
   * Should be called after `setCurrentTime` as been called
   * @param oldTime used to determine if seeked backwards
   */
  handleSeek(oldTimeNs: bigint): void;

  /**
   * Clears:
   *  - Rendered objects (a backfill is performed to ensure that they are regenerated with new messages from current frame)
   *  - Errors in settings. Messages that caused errors in the past are cleared, but will be re-added if they are still causing errors when read in.
   *  - [Optional] Transform tree. This should be set to true when a seek to a previous time is performed in order to flush potential future state to the newly set time.
   *  - [Optional] allFramesCursor. This is the cursor that iterates through allFrames up to currentTime. It should be reset when seeking backwards to avoid keeping future state.
   * @param {Object} params - modifiers to the clear operation
   * @param {boolean} params.clearTransforms - whether to clear the transform tree. This should be set to true when a seek to a previous time is performed in order
   * order to flush potential future state to the newly set time.
   * @param {boolean} params.resetAllFramesCursor - whether to reset the cursor for the allFrames array.
   */
  clear(args: { clearTransforms?: boolean; resetAllFramesCursor?: boolean }): void;

  /**
   * Iterates through allFrames and handles messages with a receiveTime <= currentTime
   * @param allFrames - array of all preloaded messages
   * @returns {boolean} - whether the allFramesCursor has been updated and new messages were read in
   */
  handleAllFramesMessages(allFrames?: readonly MessageEvent[]): boolean;

  updateConfig(updateHandler: (draft: RendererConfig) => void): void;

  addCustomLayerAction(options: {
    layerId: string;
    label: string;
    icon?: SettingsIcon;
    handler: (instanceId: string) => void;
  }): void;

  /** Enable or disable object selection mode */
  setPickingEnabled(enabled: boolean): void;

  /** Update the color scheme and background color, rebuilding any materials as necessary */
  setColorScheme(colorScheme: "dark" | "light", backgroundColor: string | undefined): void;

  /** Update the list of topics and rebuild all settings nodes when the identity
   * of the topics list changes */
  setTopics(topics: ReadonlyArray<Topic> | undefined): void;

  setParameters(parameters: Immutable<Map<string, ParameterValue>> | undefined): void;

  updateCustomLayersCount(): void;

  setCameraState(cameraState: CameraState): void;

  getCameraState(): CameraState | undefined;

  /** Whether the view has been modified and a reset button should be shown (image mode only). */
  canResetView(): boolean;
  /** Reset any manual view modifications (image mode only). */
  resetView(): void;

  setSelectedRenderable(selection: PickedRenderable | undefined): void;

  addMessageEvent(messageEvent: Readonly<MessageEvent>): void;

  /**  Set desired render/display frame, will render using fallback if id is undefined or frame does not exist */
  setFollowFrameId(frameId: string | undefined): void;

  /** Match the behavior of `tf::Transformer` by stripping leading slashes from
   * frame_ids. This preserves compatibility with earlier versions of ROS while
   * not breaking any current versions where:
   * > tf2 does not accept frame_ids starting with "/"
   * Source: <http://wiki.ros.org/tf2/Migration#tf_prefix_backwards_compatibility>
   */
  normalizeFrameId(frameId: string): string;

  addCoordinateFrame(frameId: string): void;

  // Create a new transform and add it to the renderer's TransformTree
  addTransform(
    parentFrameId: string,
    childFrameId: string,
    stamp: bigint,
    translation: Vector3,
    rotation: Quaternion,
    errorSettingsPath?: string[],
  ): void;

  removeTransform(childFrameId: string, parentFrameId: string, stamp: bigint): void;

  // Callback handlers
  animationFrame: () => void;
  queueAnimationFrame: () => void;

  // Function to fetch an asset from Studio's asset manager.
  fetchAsset: BuiltinPanelExtensionContext["unstable_fetchAsset"];

  /** Returns whether active scene extensions can handle the MessagePaths being dropped */
  getDropStatus: (paths: readonly DraggedMessagePath[]) => MessagePathDropStatus;

  /** Handles MessagePaths being dropped into the 3D panel. Allows scene extensions to update in response */
  handleDrop: (paths: readonly DraggedMessagePath[]) => void;

  /** Returns context menu items for active scene extensions. Takes Enqueue snackbar function for showing info that might result from option. */
  getContextMenuItems: () => PanelContextMenuItem[];

  /** Items to render in an over-canvas Heads-up display*/
  hudItems: HUDItem[];

  displayTemporaryError?: (message: string) => void;
}
