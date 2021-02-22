//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { PersistedState, Store } from "@foxglove-studio/app/reducers";

// We put all the internal requires inside functions, so that when they load the hooks have been properly set.
/* eslint-disable @typescript-eslint/no-var-requires */

let importedPanelsByCategory: unknown;
let importedPerPanelHooks: any;
const defaultHooks = {
  areHooksImported: () => importedPanelsByCategory && importedPerPanelHooks,
  getLayoutFromUrl: async (search: string) => {
    const { LAYOUT_URL_QUERY_KEY } = require("@foxglove-studio/app/util/globalConstants");
    const params = new URLSearchParams(search);
    const layoutUrl = params.get(LAYOUT_URL_QUERY_KEY);
    if (!layoutUrl) {
      throw new Error(`Missing query argument: ${LAYOUT_URL_QUERY_KEY}`);
    }
    return fetch(layoutUrl)
      .then((result) => {
        try {
          return result.json();
        } catch (e) {
          throw new Error(`Failed to parse JSON layout: ${e.message}`);
        }
      })
      .catch((e) => {
        throw new Error(`Failed to fetch layout from URL: ${e.message}`);
      });
  },
  getDemoModeComponent: () => null,
  async importHooksAsync() {
    return new Promise<void>((resolve, reject) => {
      if (importedPanelsByCategory && importedPerPanelHooks) {
        resolve();
      }
      import("./hooksImporter")
        .then((hooksImporter) => {
          importedPerPanelHooks = hooksImporter.perPanelHooks();
          importedPanelsByCategory = hooksImporter.panelsByCategory();
          resolve();
        })
        .catch((reason) => {
          reject(`Failed to import hooks bundle: ${reason}`);
        });
    });
  },
  nodes: () => [],
  getDefaultPersistedState() {
    const { defaultPlaybackConfig } = require("@foxglove-studio/app/reducers/panels");

    // All panel fields have to be present.
    const state: PersistedState = {
      fetchedLayout: { isLoading: false, data: undefined },
      search: "",
      panels: {
        layout: {
          direction: "row",
          first: "DiagnosticSummary!3edblo1",
          second: {
            direction: "row",
            first: "RosOut!1f38b3d",
            second: "3D Panel!1my2ydk",
            splitPercentage: 50,
          },
          splitPercentage: 33.3333333333,
        },
        savedProps: {},
        globalVariables: {},
        userNodes: {},
        linkedGlobalVariables: [],
        playbackConfig: defaultPlaybackConfig,
      },
    };
    return state;
  },
  panelCategories() {
    return [
      { label: "ROS", key: "ros" },
      { label: "Utilities", key: "utilities" },
      { label: "Debugging", key: "debugging" },
    ];
  },
  panelsByCategory: () => {
    if (!importedPanelsByCategory) {
      throw new Error("panelsByCategory requested before hooks have been imported");
    }
    return importedPanelsByCategory;
  },
  helpPageFootnote: () => null,
  perPanelHooks: () => {
    if (!importedPerPanelHooks) {
      throw new Error("perPanelHooks requested before hooks have been imported");
    }
    return importedPerPanelHooks;
  },
  startupPerPanelHooks: () => {
    return {
      ThreeDimensionalViz: {
        getDefaultTopicSettingsByColumn() {
          return undefined;
        },
        getDefaultSettings: () => ({}),
        getDefaultTopicTree: () => ({
          name: "root",
          children: [
            {
              name: "TF",
              topicName: "/tf",
              children: [],
              description: "Visualize relationships between /tf frames.",
            },
          ],
        }),
        getStaticallyAvailableNamespacesByTopic: () => ({}),
      },
    };
  },
  load: async () => {
    const { initializeLogEvent } = require("@foxglove-studio/app/util/logEvent");
    initializeLogEvent(() => undefined, {}, {});
  },
  getAdditionalDataProviders: () => {
    // do nothing
  },
  experimentalFeaturesList() {
    return {
      diskBagCaching: {
        name: "Disk Bag Caching (requires reload)",
        description:
          "When streaming bag data, persist it on disk, so that when reloading the page we don't have to download the data again. However, this might result in an overall slower experience, and is generally experimental, so we only recommend it if you're on a slow network connection. Alternatively, you can download the bag to disk manually, and drag it into Webviz.",
        developmentDefault: false,
        productionDefault: false,
      },
      unlimitedMemoryCache: {
        name: "Unlimited in-memory cache (requires reload)",
        description:
          "If you have a lot of memory in your computer, and you frequently have to play all the way through large bags, you can turn this on to fully buffer the bag into memory. However, use at your own risk, as this might crash the browser.",
        developmentDefault: false,
        productionDefault: false,
      },
    };
  },
  linkMessagePathSyntaxToHelpPage: () => true,
  getSecondSourceUrlParams() {
    const { REMOTE_BAG_URL_2_QUERY_KEY } = require("@foxglove-studio/app/util/globalConstants");
    return [REMOTE_BAG_URL_2_QUERY_KEY];
  },
  updateUrlToTrackLayoutChanges: async (opt: { store: Store; skipPatch: boolean }) => {
    // Persist the layout state in URL or remote storage if needed.
    await Promise.resolve();
  },
  getPoseErrorScaling() {
    const scaling = {
      x: 1,
      y: 1,
    };

    return { originalScaling: scaling, updatedScaling: scaling };
  },
};

let hooks = defaultHooks;

export function getGlobalConfig() {
  return hooks;
}

export function setGlobalConfig(hooksToSet: Record<string, unknown>) {
  hooks = { ...hooks, ...hooksToSet };
}

export function resetGlobalConfigToDefault() {
  hooks = defaultHooks;
}
