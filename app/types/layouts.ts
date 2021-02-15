//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @ts-expect-error: flow import has 'any' type
import { PanelsState } from "@foxglove-studio/app/reducers/panels";
import { MosaicNode } from "@foxglove-studio/app/types/panels";

export type LayoutDescription = {
  id: string;
  name: string;
  folderId: string;
  private: boolean;
};
export type SaveLayoutPayload = {
  name: string;
  folderId: string;
  layout: PanelsState;
  fileSuffix?: string;
  isAutosaved?: boolean;
};

export type TabConfig = { title: string; layout: MosaicNode | null | undefined };

export type TabPanelConfig = {
  activeTabIdx: number;
  tabs: Array<TabConfig>;
};

export type TabLocation = {
  panelId: string;
  tabIndex?: number;
};
