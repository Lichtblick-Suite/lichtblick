//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { GlobalVariables } from "@foxglove-studio/app/hooks/useGlobalVariables";
// @ts-expect-error: flow import has 'any' type
import { LinkedGlobalVariables } from "@foxglove-studio/app/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";
// @ts-expect-error: flow import has 'any' type
import { PanelsState } from "@foxglove-studio/app/reducers/panels";
// @ts-expect-error: flow import has 'any' type
import { TimestampMethod } from "@foxglove-studio/app/util/time";

// Mosaic Types
export type MosaicBranch = "first" | "second";
export type MosaicPath = MosaicBranch[];
export type MosaicKey = string;
export type MosaicDirection = "row" | "column";
export type MosaicDropTargetPosition = "top" | "bottom" | "left" | "right";
export type MosaicNode =
  | {
    direction: MosaicDirection;
    first: MosaicNode;
    second: MosaicNode;
    splitPercentage?: number;
  }
  | MosaicKey;

export type PanelConfig = {
  [key: string]: any;
};
export type PerPanelFunc<Config> = (arg0: Config) => Config;

export type PlaybackConfig = {
  speed: number;
  messageOrder: TimestampMethod;
  timeDisplayMethod: "ROS" | "TOD";
};

export type UserNode = { name: string; sourceCode: string };
export type UserNodes = {
  [nodeId: string]: UserNode;
};

// May want finer-grained controls in the future, currently just a boolean "suppress" condition.
// Unused, but should be used for intermediate states like during a panel move when the panel isn't
// present in the layout.
export type EditHistoryOptions = "SUPPRESS_HISTORY_ENTRY";

export type ConfigsPayload = {
  id: string;
  override?: boolean;
  config: PanelConfig;
  defaultConfig?: PanelConfig;
};
export type ChangePanelLayoutPayload = {
  layout: MosaicNode | null | undefined;
  trimSavedProps?: boolean;
  historyOptions?: EditHistoryOptions;
};
export type SaveConfigsPayload = {
  // if you set override to true, existing config will be completely overriden by new passed in config
  configs: ConfigsPayload[];
  historyOptions?: EditHistoryOptions;
};

export type SaveFullConfigPayload = {
  panelType: string;
  perPanelFunc: PerPanelFunc<any>;
  historyOptions?: EditHistoryOptions;
};

export type SavedProps = {
  [panelId: string]: PanelConfig;
};

export type CreateTabPanelPayload = {
  idToReplace: string | null | undefined;
  layout: MosaicNode;
  idsToRemove: string[];
  singleTab: boolean;
};

export type ImportPanelLayoutPayload = {
  // layout is the object passed to react-mosaic
  layout: MosaicNode | null | undefined;
  savedProps?: SavedProps;
  globalVariables?: GlobalVariables;
  userNodes?: UserNodes;
  linkedGlobalVariables?: LinkedGlobalVariables;
  skipSettingLocalStorage?: boolean;
};

export type LayoutFetchResult = {
  content: PanelsState;
  name: string;
  savedBy: string;
  releasedVersion: number;
  fileSuffix?: string;
};
export type LayoutUrl = {
  layoutId: string | null | undefined;
  layoutUrl: string | null | undefined;
  patch: string | null | undefined;
};
export type InitialLayoutFetchResult = {
  layoutUrlReplacedByDefault?: LayoutUrl | null | undefined;
  // The layoutFetchResult will be null if there is no layout to load in the URL.
  layoutFetchResult: LayoutFetchResult | null | undefined;
};
export type SetFetchedLayoutPayload = {
  isLoading: boolean;
  error?: Error;
  data?: LayoutFetchResult;
  isFromLayoutUrlParam?: boolean;
  isInitializedFromLocalStorage?: boolean;
  layoutUrlReplacedByDefault?: LayoutUrl | null | undefined;
};

export type SaveConfig<Config> = (
  arg0: Partial<Config>,
  arg1: { historyOptions?: EditHistoryOptions } | null | undefined,
) => void;

export type UpdatePanelConfig<Config> = (
  panelType: string,
  perPanelFunc: PerPanelFunc<Config>,
  historyOptions?: EditHistoryOptions,
) => void;

export type OpenSiblingPanel = (arg0: string, cb: (arg0: PanelConfig) => PanelConfig) => void;
