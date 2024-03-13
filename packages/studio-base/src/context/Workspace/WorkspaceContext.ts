// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@foxglove/hooks";
import { AppSettingsTab } from "@foxglove/studio-base/components/AppSettingsDialog/AppSettingsDialog";
import { DataSourceDialogItem } from "@foxglove/studio-base/components/DataSourceDialog";
import { IDataSourceFactory } from "@foxglove/studio-base/context/PlayerSelectionContext";

export const SidebarItemKeys = [
  "account",
  "add-panel",
  "app-bar-tour",
  "app-settings",
  "connection",
  "extensions",
  "help",
  "layouts",
  "panel-settings",
  "studio-logs-settings",
  "variables",
] as const;
export type SidebarItemKey = (typeof SidebarItemKeys)[number];

export const LeftSidebarItemKeys = ["panel-settings", "topics", "problems"] as const;
export type LeftSidebarItemKey = (typeof LeftSidebarItemKeys)[number];

export const RightSidebarItemKeys = [
  "events",
  "variables",
  "studio-logs-settings",
  "performance",
] as const;
export type RightSidebarItemKey = (typeof RightSidebarItemKeys)[number];

export type WorkspaceContextStore = {
  dialogs: {
    dataSource: {
      activeDataSource: undefined | IDataSourceFactory;
      item: undefined | DataSourceDialogItem;
      open: boolean;
    };
    preferences: {
      initialTab: undefined | AppSettingsTab;
      open: boolean;
    };
  };
  featureTours: {
    active: undefined | string;
    shown: string[];
  };
  playbackControls: {
    repeat: boolean;
  };
  sidebars: {
    left: {
      item: undefined | LeftSidebarItemKey;
      open: boolean;
      size: undefined | number;
    };
    right: {
      item: undefined | RightSidebarItemKey;
      open: boolean;
      size: undefined | number;
    };
  };
};

export const WorkspaceContext = createContext<undefined | StoreApi<WorkspaceContextStore>>(
  undefined,
);

WorkspaceContext.displayName = "WorkspaceContext";

export const WorkspaceStoreSelectors = {
  selectPanelSettingsOpen: (store: WorkspaceContextStore): boolean => {
    return store.sidebars.left.open && store.sidebars.left.item === "panel-settings";
  },
};

/**
 * Fetches values from the workspace store.
 */
export function useWorkspaceStore<T>(selector: (store: WorkspaceContextStore) => T): T {
  const context = useGuaranteedContext(WorkspaceContext);
  return useStore(context, selector);
}
