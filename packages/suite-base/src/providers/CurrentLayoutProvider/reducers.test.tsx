// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import {
  CreateTabPanelPayload,
  LayoutData,
} from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { TabPanelConfig } from "@lichtblick/suite-base/types/layouts";
import { MosaicDropTargetPosition } from "@lichtblick/suite-base/types/panels";
import { TAB_PANEL_TYPE } from "@lichtblick/suite-base/util/globalConstants";
import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";
import { getLeaves, MosaicNode, MosaicParent } from "react-mosaic-component";

import panelsReducer, { defaultPlaybackConfig } from "./reducers";

const emptyLayout: LayoutData = {
  configById: {},
  globalVariables: {},
  userNodes: {},
  playbackConfig: defaultPlaybackConfig,
};

describe("layout reducers", () => {
  describe("adds panel to a layout", () => {
    it("adds panel to main app layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        },
      };
      const originalLayout = panels;
      panels = panelsReducer(panels, {
        type: "ADD_PANEL",
        payload: {
          id: "Audio!x",
          tabId: undefined,
          config: { foo: "bar" },
        },
      });

      const layout = panels.layout as MosaicParent<string>;
      const firstStr = layout.first as string;
      const secondStr = layout.second as string;
      expect(layout.direction).toEqual("row");
      expect(firstStr).toEqual("Audio!x");
      expect(layout.second).toEqual("Tab!a");

      expect(panels.configById[firstStr]).toEqual({ foo: "bar" });
      expect(panels.configById[secondStr]).toEqual(originalLayout.configById["Tab!a"]);
    });
    it("adds panel to empty Tab layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        },
      };
      panels = panelsReducer(panels, {
        type: "ADD_PANEL",
        payload: {
          id: "Audio!x",
          tabId: "Tab!a",
          config: { foo: "bar" },
        },
      });

      const { layout, configById } = panels;
      const tabs = (configById["Tab!a"] as TabPanelConfig).tabs;
      const newAudioId = tabs[0]!.layout as string;
      expect(layout).toEqual("Tab!a");
      expect(configById["Tab!a"]?.activeTabIdx).toEqual(0);
      expect(tabs[0]!.title).toEqual("A");
      expect(newAudioId).toEqual("Audio!x");
      expect(tabs.length).toEqual(3);

      expect(configById[newAudioId]).toEqual({ foo: "bar" });
      expect(configById[layout as string]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: newAudioId }, { title: "B" }, { title: "C" }],
      });
    });

    it("adds panel to uninitialized Tab layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": {},
        },
      };
      panels = panelsReducer(panels, {
        type: "ADD_PANEL",
        payload: {
          id: "Audio!x",
          tabId: "Tab!a",
          config: { foo: "bar" },
        },
      });

      const { configById } = panels;
      const tabs = (configById["Tab!a"] as TabPanelConfig).tabs;
      expect(tabs.length).toEqual(1);
    });
  });

  describe("drops panel into a layout", () => {
    it("drops panel into app layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        },
      };
      panels = panelsReducer(panels, {
        type: "DROP_PANEL",
        payload: {
          newPanelType: "Audio",
          destinationPath: [],
          position: "right",
          config: { foo: "bar" },
        },
      });

      const layout = panels.layout as MosaicParent<string>;
      expect(layout.direction).toEqual("row");
      expect(layout.first).toEqual("Tab!a");
      expect(getPanelTypeFromId(layout.second as string)).toEqual("Audio");
    });
    it("drops Tab panel into app layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Audio!a",
        configById: { "Audio!a": { foo: "bar" } },
      };
      panels = panelsReducer(panels, {
        type: "DROP_PANEL",
        payload: {
          newPanelType: "Tab",
          destinationPath: [],
          position: "right",
          config: { activeTabIdx: 0, tabs: [{ title: "A", layout: undefined }] },
        },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(layout.direction).toEqual("row");
      expect(layout.first).toEqual("Audio!a");
      expect(getPanelTypeFromId(layout.second as string)).toEqual("Tab");

      expect(configById["Audio!a"]).toEqual({ foo: "bar" });
      const { activeTabIdx, tabs } = configById[layout.second as string] as TabPanelConfig;
      expect(activeTabIdx).toEqual(0);
      expect(tabs.length).toEqual(1);
      expect(tabs[0]?.title).toEqual("A");

      expect(tabs[0]?.layout).toBeUndefined();
    });
    it("drops panel into empty Tab layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        },
      };
      panels = panelsReducer(panels, {
        type: "DROP_PANEL",
        payload: {
          newPanelType: "Audio",
          destinationPath: [],
          position: "right",
          tabId: "Tab!a",
          config: { foo: "bar" },
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      const tabs = (configById["Tab!a"] as TabPanelConfig).tabs;
      expect(tabs[0]!.title).toEqual("A");
      expect(getPanelTypeFromId(tabs[0]!.layout as string)).toEqual("Audio");
      expect(tabs.length).toEqual(3);
    });
    it("drops panel into nested Tab layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A", layout: "Tab!b" }] },
          "Tab!b": { activeTabIdx: 0, tabs: [{ title: "B", layout: "Plot!a" }] },
        },
      };
      const originalLayout = panels;
      panels = panelsReducer(panels, {
        type: "DROP_PANEL",
        payload: {
          newPanelType: "Audio",
          destinationPath: [],
          position: "right",
          tabId: "Tab!b",
          config: { foo: "bar" },
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      expect(configById["Tab!a"]).toEqual(originalLayout.configById["Tab!a"]);
      const tabBTabs = (configById["Tab!b"] as TabPanelConfig).tabs;
      expect(tabBTabs.length).toEqual(1);
      expect((tabBTabs[0]!.layout as MosaicParent<string>).first).toEqual("Plot!a");
      expect(
        getPanelTypeFromId((tabBTabs[0]!.layout as MosaicParent<string>).second as string),
      ).toEqual("Audio");
      expect(configById[(tabBTabs[0]!.layout as MosaicParent<string>).second as string]).toEqual({
        foo: "bar",
      });
    });
  });

  describe("moves tabs", () => {
    it("reorders tabs within a Tab panel", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        },
      };
      panels = panelsReducer(panels, {
        type: "MOVE_TAB",
        payload: {
          source: { panelId: "Tab!a", tabIndex: 0 },
          target: { panelId: "Tab!a", tabIndex: 1 },
        },
      });
      const { configById } = panels;
      expect(configById).toEqual({
        "Tab!a": { activeTabIdx: 1, tabs: [{ title: "B" }, { title: "A" }, { title: "C" }] },
      });
    });

    it("moves tabs between Tab panels", () => {
      const layout: MosaicParent<string> = { first: "Tab!a", second: "Tab!b", direction: "row" };
      let panels: LayoutData = {
        ...emptyLayout,
        layout,
        configById: {
          "Tab!a": {
            activeTabIdx: 0,
            tabs: [{ title: "A" }, { title: "B" }, { title: "C" }],
          },
          "Tab!b": {
            activeTabIdx: 0,
            tabs: [{ title: "D" }, { title: "E" }, { title: "F" }],
          },
        },
      };
      panels = panelsReducer(panels, {
        type: "MOVE_TAB",
        payload: {
          source: { panelId: "Tab!a", tabIndex: 0 },
          target: { panelId: "Tab!b", tabIndex: 1 },
        },
      });

      const { configById } = panels;
      expect(configById).toEqual({
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "B" }, { title: "C" }] },
        "Tab!b": {
          activeTabIdx: 0,
          tabs: [{ title: "D" }, { title: "A" }, { title: "E" }, { title: "F" }],
        },
      });
    });
  });

  it("closes a panel in single-panel layout", () => {
    let panels: LayoutData = {
      ...emptyLayout,
      layout: "Audio!a",
      configById: { "Audio!a": { foo: "bar" } },
    };
    panels = panelsReducer(panels, {
      type: "CLOSE_PANEL",
      payload: { root: "Audio!a", path: [] },
    });
    const { layout, configById } = panels;
    expect(layout).toEqual(undefined);
    expect(configById).toEqual({});
  });

  it("closes a panel in multi-panel layout", () => {
    const layout: MosaicParent<string> = { first: "Audio!a", second: "Audio!b", direction: "row" };
    let panels: LayoutData = {
      ...emptyLayout,
      layout,
      configById: { "Audio!a": { foo: "bar" }, "Audio!b": { foo: "baz" } },
    };
    panels = panelsReducer(panels, {
      type: "CLOSE_PANEL",
      payload: { root: panels.layout!, path: ["first"] },
    });
    expect(panels.layout).toEqual("Audio!b");
    expect(panels.configById).toEqual({ "Audio!b": { foo: "baz" } });
  });

  it("closes a panel nested inside a Tab panel", () => {
    let panels: LayoutData = {
      ...emptyLayout,
      layout: "Tab!a",
      configById: {
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] },
        "Audio!a": { foo: "bar" },
      },
    };
    panels = panelsReducer(panels, {
      type: "CLOSE_PANEL",
      payload: { root: "Audio!a", path: [], tabId: "Tab!a" },
    });
    expect(panels.layout).toEqual("Tab!a");
    expect(panels.configById).toEqual({
      "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A", layout: undefined }] },
    });
  });

  describe("creates Tab panels from existing panels correctly", () => {
    const regularLayoutPayload: Partial<LayoutData> & { layout: MosaicNode<string> } = {
      layout: {
        first: "Audio!a",
        second: { first: "RawMessages!a", second: "Audio!c", direction: "column" },
        direction: "row",
      },
      configById: { "Audio!a": { foo: "bar" }, "RawMessages!a": { foo: "baz" } },
    };
    const basePayload = {
      idToReplace: "Audio!a",
      newId: "Tab!a",
      idsToRemove: ["Audio!a", "RawMessages!a"],
      singleTab: false,
    };
    const nestedLayoutPayload: Partial<LayoutData> & { layout: MosaicNode<string> } = {
      layout: {
        first: "Audio!a",
        second: "Tab!z",
        direction: "column",
      },
      configById: {
        "Audio!a": { foo: "bar" },
        "Tab!z": {
          activeTabIdx: 0,
          tabs: [
            {
              title: "First tab",
              layout: { first: "Audio!b", second: "RawMessages!a", direction: "row" },
            },
          ],
        },
        "Audio!b": { foo: "baz" },
        "RawMessages!a": { raw: "messages" },
      },
    };
    const createTabPanelPayload: CreateTabPanelPayload = {
      ...basePayload,
      layout: regularLayoutPayload.layout,
    };
    const nestedCreateTabPanelPayload: CreateTabPanelPayload = {
      ...basePayload,
      layout: nestedLayoutPayload.layout,
    };

    it("will group selected panels into a Tab panel", () => {
      let panels: LayoutData = { ...emptyLayout, ...regularLayoutPayload };
      panels = panelsReducer(panels, {
        type: "CREATE_TAB_PANEL",
        payload: { ...createTabPanelPayload, singleTab: true },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(getPanelTypeFromId(layout.first as string)).toEqual(TAB_PANEL_TYPE);
      expect(getPanelTypeFromId(layout.second as string)).toEqual("Audio");
      expect(configById[layout.first as string]).toEqual({
        activeTabIdx: 0,
        tabs: [
          {
            title: "1",
            layout: { direction: "row", first: "Audio!a", second: "RawMessages!a" },
          },
        ],
      });
      expect(configById[layout.second as string]).toEqual(
        regularLayoutPayload.configById?.[layout.second as string],
      );
    });

    it("will group selected panels into a Tab panel, even when a selected panel is nested", () => {
      let panels: LayoutData = { ...emptyLayout, ...nestedLayoutPayload };
      panels = panelsReducer(panels, {
        type: "CREATE_TAB_PANEL",
        payload: { ...nestedCreateTabPanelPayload, singleTab: true },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(getPanelTypeFromId(layout.first as string)).toEqual(TAB_PANEL_TYPE);
      expect(getPanelTypeFromId(layout.second as string)).toEqual(TAB_PANEL_TYPE);
      expect(configById[layout.first as string]).toEqual({
        activeTabIdx: 0,
        tabs: [
          {
            title: "1",
            layout: { direction: "column", first: "Audio!a", second: "RawMessages!a" },
          },
        ],
      });
      expect(configById[layout.second as string]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "First tab", layout: "Audio!b" }],
      });
    });

    it("will create individual tabs for selected panels in a new Tab panel", () => {
      let panels: LayoutData = { ...emptyLayout, ...regularLayoutPayload };
      panels = panelsReducer(panels, {
        type: "CREATE_TAB_PANEL",
        payload: { ...createTabPanelPayload, singleTab: false },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(getPanelTypeFromId(layout.first as string)).toEqual(TAB_PANEL_TYPE);
      expect(getPanelTypeFromId(layout.second as string)).toEqual("Audio");
      expect(configById[layout.first as string]).toEqual({
        activeTabIdx: 0,
        tabs: [
          { title: "Audio", layout: "Audio!a" },
          { title: "RawMessages", layout: "RawMessages!a" },
        ],
      });
      expect(configById[layout.second as string]).toEqual(
        regularLayoutPayload.configById?.[layout.second as string],
      );
    });

    it("will create individual tabs for selected panels in a new Tab panel, even when a selected panel is nested", () => {
      let panels: LayoutData = { ...emptyLayout, ...nestedLayoutPayload };
      panels = panelsReducer(panels, {
        type: "CREATE_TAB_PANEL",
        payload: { ...nestedCreateTabPanelPayload, singleTab: false },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(getPanelTypeFromId(layout.first as string)).toEqual(TAB_PANEL_TYPE);
      expect(getPanelTypeFromId(layout.second as string)).toEqual(TAB_PANEL_TYPE);
      expect(configById[layout.first as string]).toEqual({
        activeTabIdx: 0,
        tabs: [
          { title: "Audio", layout: "Audio!a" },
          { title: "RawMessages", layout: "RawMessages!a" },
        ],
      });
      expect(configById[layout.second as string]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "First tab", layout: "Audio!b" }],
      });
    });
  });

  it("saves and overwrites user nodes", () => {
    let panels: LayoutData = { ...emptyLayout };
    const firstPayload = { foo: { name: "foo", sourceCode: "bar" } };
    const secondPayload = { bar: { name: "bar", sourceCode: "baz" } };

    panels = panelsReducer(panels, {
      type: "SET_USER_NODES",
      payload: firstPayload,
    });
    expect(panels.userNodes).toEqual(firstPayload);

    panels = panelsReducer(panels, {
      type: "SET_USER_NODES",
      payload: secondPayload,
    });
    expect(panels.userNodes).toEqual({ ...firstPayload, ...secondPayload });
  });

  describe("panel toolbar actions", () => {
    it("can split panel", () => {
      const audioConfig = { foo: "bar" };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Audio!a",
        configById: { "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SPLIT_PANEL",
        payload: {
          id: "Audio!a",
          config: audioConfig,
          direction: "row",
          path: [],
          root: "Audio!a",
        },
      });
      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;
      expect(layout.first).toEqual("Audio!a");
      expect(getPanelTypeFromId(layout.second as string)).toEqual("Audio");
      expect(layout.direction).toEqual("row");
      expect(configById["Audio!a"]).toEqual(audioConfig);
      expect(configById[layout.second as string]).toEqual(audioConfig);
    });

    it("can split Tab panel", () => {
      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: { "Tab!a": tabConfig, "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SPLIT_PANEL",
        payload: {
          id: "Tab!a",
          config: tabConfig,
          direction: "row",
          path: [],
          root: "Tab!a",
        },
      });

      const { configById } = panels;
      const layout = panels.layout as MosaicParent<string>;

      const newTabId = layout.second as string;
      expect(getPanelTypeFromId(newTabId)).toEqual("Tab");
      expect(newTabId).not.toEqual("Tab!a");

      expect(layout).toEqual({
        direction: "row",
        first: "Tab!a",
        second: newTabId,
      });

      const newAudioId = (configById[newTabId] as TabPanelConfig).tabs[0]!.layout as string;
      expect(getPanelTypeFromId(newAudioId)).toEqual("Audio");
      expect(newAudioId).not.toEqual("Audio!a");

      expect(configById).toEqual({
        "Tab!a": tabConfig,
        "Audio!a": audioConfig,
        [newTabId]: { activeTabIdx: 0, tabs: [{ title: "A", layout: newAudioId }] },
        [newAudioId]: audioConfig,
      });
    });

    it("can split panel inside Tab panel", () => {
      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: { "Tab!a": tabConfig, "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SPLIT_PANEL",
        payload: {
          id: "Audio!a",
          tabId: "Tab!a",
          config: audioConfig,
          direction: "row",
          path: [],
          root: "Audio!a",
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      const tabLayout = (configById["Tab!a"] as TabPanelConfig).tabs[0]!
        .layout! as MosaicParent<string>;

      const newAudioId = tabLayout.second as string;
      expect(getPanelTypeFromId(newAudioId)).toEqual("Audio");
      expect(newAudioId).not.toEqual("Audio!a");

      expect(configById).toEqual({
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [
            {
              title: "A",
              layout: {
                direction: "row",
                first: "Audio!a",
                second: newAudioId,
              },
            },
          ],
        },
        "Audio!a": audioConfig,
        [newAudioId]: audioConfig,
      });
    });

    it("can split outer Tab of two nested Tabs", () => {
      const audioConfig = { foo: "bar" };
      const tabConfig1 = { activeTabIdx: 0, tabs: [{ title: "A1", layout: "Tab!b" }] };
      const tabConfig2 = { activeTabIdx: 0, tabs: [{ title: "B1", layout: "Audio!a" }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: { "Tab!a": tabConfig1, "Tab!b": tabConfig2, "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SPLIT_PANEL",
        payload: {
          id: "Tab!a",
          tabId: undefined,
          config: tabConfig1,
          direction: "row",
          path: [],
          root: "Tab!a",
        },
      });
      const { layout, configById } = panels;

      const newOuterTabId = (layout as MosaicParent<string>).second as string;
      expect(getPanelTypeFromId(newOuterTabId)).toEqual("Tab");
      expect(newOuterTabId).not.toEqual("Tab!a");
      expect(newOuterTabId).not.toEqual("Tab!b");
      expect(layout).toEqual({ direction: "row", first: "Tab!a", second: newOuterTabId });

      const newInnerTabId = (configById[newOuterTabId] as TabPanelConfig).tabs[0]!.layout as string;
      expect(getPanelTypeFromId(newInnerTabId)).toEqual("Tab");
      expect(newInnerTabId).not.toEqual("Tab!a");
      expect(newInnerTabId).not.toEqual("Tab!b");

      const newAudioId = (configById[newInnerTabId] as TabPanelConfig).tabs[0]!.layout as string;
      expect(getPanelTypeFromId(newAudioId)).toEqual("Audio");
      expect(newAudioId).not.toEqual("Audio!a");
      expect(configById).toEqual({
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A1", layout: "Tab!b" }],
        },
        "Tab!b": {
          activeTabIdx: 0,
          tabs: [{ title: "B1", layout: "Audio!a" }],
        },
        [newOuterTabId]: {
          activeTabIdx: 0,
          tabs: [{ title: "A1", layout: newInnerTabId }],
        },
        [newInnerTabId]: {
          activeTabIdx: 0,
          tabs: [{ title: "B1", layout: newAudioId }],
        },
        "Audio!a": audioConfig,
        [newAudioId]: audioConfig,
      });
    });

    it("can split inner Tab of two nested Tabs", () => {
      const audioConfig = { foo: "bar" };
      const tabConfig1 = { activeTabIdx: 0, tabs: [{ title: "A1", layout: "Tab!b" }] };
      const tabConfig2 = { activeTabIdx: 0, tabs: [{ title: "B2", layout: "Audio!a" }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: { "Tab!a": tabConfig1, "Tab!b": tabConfig2, "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SPLIT_PANEL",
        payload: {
          id: "Tab!b",
          tabId: "Tab!a",
          config: tabConfig2,
          direction: "row",
          path: [],
          root: "Tab!b",
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      const outerTabLayout = (configById["Tab!a"] as TabPanelConfig).tabs[0]!
        .layout! as MosaicParent<string>;
      const newTabId = outerTabLayout.second as string;
      expect(getPanelTypeFromId(newTabId)).toBe("Tab");
      expect(newTabId).not.toBe("Tab!b");

      const newAudioId = (configById[newTabId] as TabPanelConfig).tabs[0]!.layout as string;
      expect(getPanelTypeFromId(newAudioId)).toEqual("Audio");
      expect(newAudioId).not.toEqual("Audio!a");
      expect(configById).toEqual({
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [
            {
              title: "A1",
              layout: {
                direction: "row",
                first: "Tab!b",
                second: newTabId,
              },
            },
          ],
        },
        "Tab!b": {
          activeTabIdx: 0,
          tabs: [{ title: "B2", layout: "Audio!a" }],
        },
        [newTabId]: {
          activeTabIdx: 0,
          tabs: [{ title: "B2", layout: newAudioId }],
        },
        "Audio!a": audioConfig,
        [newAudioId]: audioConfig,
      });
    });

    it("can swap panels", () => {
      const audioConfig = { foo: "bar" };
      const rawMessagesConfig = { foo: "baz" };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Audio!a",
        configById: { "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SWAP_PANEL",
        payload: {
          originalId: "Audio!a",
          type: "RawMessages",
          config: rawMessagesConfig,
          path: [],
          root: "Audio!a",
        },
      });
      const { configById } = panels;
      const layout = panels.layout as string;
      expect(getPanelTypeFromId(layout)).toEqual("RawMessages");
      expect(configById["Audio!a"]).toEqual(undefined);
      expect(configById[layout]).toEqual(rawMessagesConfig);
    });

    it("can swap panel for a Tab panel", () => {
      const audioConfig = { foo: "bar" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: undefined }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Audio!a",
        configById: { "Audio!a": audioConfig },
      };
      panels = panelsReducer(panels, {
        type: "SWAP_PANEL",
        payload: {
          originalId: "Audio!a",
          type: "Tab",
          config: tabConfig,
          path: [],
          root: "Audio!a",
        },
      });

      const { configById } = panels;
      const layout = panels.layout as string;
      expect(getPanelTypeFromId(layout)).toEqual("Tab");
      const tabLayout = (configById[layout] as TabPanelConfig).tabs[0]!.layout;
      expect(tabLayout).toBeUndefined();
    });

    it("can swap panel inside a Tab", () => {
      const rawMessagesConfig = { foo: "baz" };
      const tabConfig = { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: { "Tab!a": tabConfig },
      };
      panels = panelsReducer(panels, {
        type: "SWAP_PANEL",
        payload: {
          originalId: "Audio!a",
          tabId: "Tab!a",
          type: "RawMessages",
          config: rawMessagesConfig,
          path: [],
          root: "Audio!a",
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      const tabLayout = (configById["Tab!a"] as TabPanelConfig)!.tabs[0]!.layout!;
      expect(getPanelTypeFromId(tabLayout as string)).toEqual("RawMessages");
      expect(configById[tabLayout as string]).toEqual(rawMessagesConfig);
    });
  });

  describe("clearing old saved config", () => {
    const panelState = {
      layout: {
        direction: "row",
        first: "FirstPanel!34otwwt",
        second: {
          direction: "column",
          second: "SecondPanel!2wydzut",
          first: { direction: "row", second: "ThirdPanel!ye6m1m", first: "FourthPanel!abc" },
        },
      },
      configById: {},
    } as LayoutData;
    const tabPanelState = {
      layout: {
        direction: "row",
        first: "FirstPanel!34otwwt",
        second: {
          direction: "column",
          second: "SecondPanel!2wydzut",
          first: { direction: "row", second: "ThirdPanel!ye6m1m", first: "Tab!abc" },
        },
      },
      configById: {},
    } as LayoutData;

    it("keeps panel state identity stable when config is unchanged", () => {
      const orig: LayoutData = {
        ...emptyLayout,
        layout: panelState.layout,
      };

      const panelConfig = {
        id: "SecondPanel!2wydzut",
        config: { foo: "bar" },
        defaultConfig: { foo: "" },
      };
      const panels = panelsReducer(orig, {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [
            panelConfig,
            { id: "FirstPanel!34otwwt", config: { baz: true }, defaultConfig: { baz: false } },
          ],
        },
      });

      const panelsTwo = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [
            panelConfig,
            { id: "FirstPanel!34otwwt", config: { baz: true }, defaultConfig: { baz: false } },
          ],
        },
      });

      expect(panelsTwo).toEqual(panels);
    });

    it("removes a panel's configById when it is removed from the layout", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: panelState.layout,
      };
      // eslint-disable-next-line no-restricted-syntax
      const leaves = getLeaves(panelState.layout ?? null);
      expect(leaves).toHaveLength(4);
      expect(leaves).toContain("FirstPanel!34otwwt");
      expect(leaves).toContain("SecondPanel!2wydzut");
      expect(leaves).toContain("ThirdPanel!ye6m1m");
      expect(leaves).toContain("FourthPanel!abc");
      expect(panels.configById).toEqual({});

      const panelConfig = {
        id: "SecondPanel!2wydzut",
        config: { foo: "bar" },
        defaultConfig: { foo: "" },
      };
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [
            panelConfig,
            { id: "FirstPanel!34otwwt", config: { baz: true }, defaultConfig: { baz: false } },
          ],
        },
      });
      expect(panels.configById).toEqual({
        "SecondPanel!2wydzut": { foo: "bar" },
        "FirstPanel!34otwwt": { baz: true },
      });
      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: {
          layout: { direction: "row", first: "FirstPanel!34otwwt", second: "SecondPanel!2wydzut" },
        },
      });
      expect(panels.configById).toEqual({
        "SecondPanel!2wydzut": { foo: "bar" },
        "FirstPanel!34otwwt": { baz: true },
      });
      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: {
          layout: { direction: "row", first: "FirstPanel!34otwwt", second: "ThirdPanel!ye6m1m" },
        },
      });
      expect(panels.configById).toEqual({
        "FirstPanel!34otwwt": { baz: true },
      });
      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: { layout: "foo!1234" },
      });
      expect(panels.configById).toEqual({});
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [{ id: "foo!1234", config: { okay: true }, defaultConfig: { okay: false } }],
        },
      });
      expect(panels.configById).toEqual({
        "foo!1234": { okay: true },
      });
    });

    it("removes a panel's configById when it is removed from Tab panel", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: tabPanelState.layout,
      };
      // eslint-disable-next-line no-restricted-syntax
      const leaves = getLeaves(tabPanelState.layout ?? null);
      expect(leaves).toHaveLength(4);
      expect(leaves).toContain("FirstPanel!34otwwt");
      expect(leaves).toContain("SecondPanel!2wydzut");
      expect(leaves).toContain("ThirdPanel!ye6m1m");
      expect(leaves).toContain("Tab!abc");
      expect(panels.configById).toEqual({});

      const baseTabConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "Tab A", layout: "NestedPanel!xyz" }], activeTabIdx: 0 },
      };
      const nestedPanelConfig = { id: "NestedPanel!xyz", config: { foo: "bar" } };
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [baseTabConfig] },
      });
      expect(panels.configById).toEqual({ "Tab!abc": baseTabConfig.config });

      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [nestedPanelConfig] },
      });
      expect(panels.configById).toEqual({
        "Tab!abc": baseTabConfig.config,
        "NestedPanel!xyz": nestedPanelConfig.config,
      });

      const emptyTabConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "Tab A", layout: undefined }], activeTabIdx: 0 },
      };
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [emptyTabConfig] },
      });
      // "NestedPanel!xyz" key in configById should be gone
      expect(panels.configById).toEqual({ "Tab!abc": emptyTabConfig.config });
    });

    it("does not remove old configById when trimConfigById = false", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "foo!bar",
      };
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [{ id: "foo!bar", config: { foo: "baz" } }] },
      });
      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: { layout: tabPanelState.layout },
      });
      expect(panels.configById).toEqual({});

      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: { layout: "foo!bar" },
      });
      panels = panelsReducer(panels, {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [{ id: "foo!bar", config: { foo: "baz" } }],
        },
      });
      panels = panelsReducer(panels, {
        type: "CHANGE_PANEL_LAYOUT",
        payload: {
          layout: tabPanelState.layout,
          trimConfigById: false,
        },
      });
      expect(panels.configById).toEqual({ "foo!bar": { foo: "baz" } });
    });
  });

  describe("handles dragging panels", () => {
    it("disallows dragging from single-panel layout", () => {
      const panels: LayoutData = {
        ...emptyLayout,
        layout: "Audio!a",
      };
      expect(() =>
        panelsReducer(panels, {
          type: "START_DRAG",
          payload: { sourceTabId: undefined, path: [] },
        }),
      ).toThrow("Can't drag the top-level panel of a layout");
    });

    it("hides panel from multi-panel layout when starting drag", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: { first: "Audio!a", second: "RawMessages!a", direction: "column" },
      } as const;
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: undefined, path: ["second"] },
      });
      expect(panels.layout).toEqual({
        first: "Audio!a",
        second: "RawMessages!a",
        direction: "column",
        splitPercentage: 100,
      });
    });
    it("removes non-Tab panel from single-panel tab layout when starting drag", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: { first: "Tab!a", second: "RawMessages!a", direction: "column" },
        configById: {
          "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A", layout: "Audio!a" }] },
        },
      } as const;
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: [] },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual({ first: "Tab!a", second: "RawMessages!a", direction: "column" });
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: undefined }],
      });
    });
    it("hides panel from multi-panel Tab layout when starting drag", () => {
      let panels: LayoutData = {
        ...emptyLayout,
        layout: { first: "Tab!a", second: "RawMessages!a", direction: "column" },
        configById: {
          "Tab!a": {
            activeTabIdx: 0,
            tabs: [
              { title: "A", layout: { first: "Audio!a", second: "Plot!a", direction: "row" } },
            ],
          },
        },
      } as const;
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });

      const { layout, configById } = panels;
      expect(layout).toEqual({ first: "Tab!a", second: "RawMessages!a", direction: "column" });
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [
          {
            title: "A",
            layout: {
              first: "Audio!a",
              second: "Plot!a",
              direction: "row",
              splitPercentage: 0,
            },
          },
        ],
      });
    });
    it("handles drags within the same tab", () => {
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Audio!a", second: "Plot!a", direction: "row" } }],
        },
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: "Tab!a",
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout: "Tab!a",
          originalSavedProps,
          panelId: "Audio!a",
          sourceTabId: "Tab!a",
          targetTabId: "Tab!a",
          position: "right",
          destinationPath: ["second"],
          ownPath: ["first"],
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: { first: "Plot!a", second: "Audio!a", direction: "row" } }],
      });
    });
    it("handles drags to main layout from Tab panel", () => {
      const originalLayout = {
        first: "Tab!a",
        second: "RawMessages!a",
        direction: "column",
      } as MosaicParent<string>;
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Audio!a", second: "Plot!a", direction: "row" } }],
        },
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps,
          panelId: "Audio!a",
          sourceTabId: "Tab!a",
          targetTabId: undefined,
          position: "right",
          destinationPath: ["second"],
          ownPath: ["first"],
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual({
        first: "Tab!a",
        second: { first: "RawMessages!a", second: "Audio!a", direction: "row" },
        direction: "column",
      });
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: "Plot!a" }],
      });
    });
    it("handles drags to Tab panel from main layout", () => {
      const originalLayout = {
        first: "Tab!a",
        second: "RawMessages!a",
        direction: "column",
      } as MosaicParent<string>;
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Audio!a", second: "Plot!a", direction: "row" } }],
        },
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: undefined, path: ["second"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps,
          panelId: "RawMessages!a",
          sourceTabId: undefined,
          targetTabId: "Tab!a",
          position: "right",
          destinationPath: ["second"],
          ownPath: ["second"],
        },
      });

      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [
          {
            title: "A",
            layout: {
              first: "Audio!a",
              second: { first: "Plot!a", second: "RawMessages!a", direction: "row" },
              direction: "row",
            },
          },
        ],
      });
    });
    it("handles dragging non-Tab panels between Tab panels", () => {
      const originalLayout = {
        first: "Tab!a",
        second: "Tab!b",
        direction: "column",
      } as MosaicParent<string>;
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Audio!a", second: "Plot!a", direction: "row" } }],
        },
        "Tab!b": {
          activeTabIdx: 0,
          tabs: [
            {
              title: "B",
              layout: { first: "RawMessages!a", second: "Publish!a", direction: "row" },
            },
          ],
        },
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps,
          panelId: "Audio!a",
          sourceTabId: "Tab!a",
          targetTabId: "Tab!b",
          position: "right",
          destinationPath: ["first"],
          ownPath: ["first"],
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual({ first: "Tab!a", second: "Tab!b", direction: "column" });
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: "Plot!a" }],
      });
      expect(configById["Tab!b"]).toEqual({
        activeTabIdx: 0,
        tabs: [
          {
            title: "B",
            layout: {
              first: { first: "RawMessages!a", second: "Audio!a", direction: "row" },
              second: "Publish!a",
              direction: "row",
            },
          },
        ],
      });
    });
    it("handles dragging non-Tab panel from Tab to nested Tab", () => {
      const originalLayout = "Tab!a";
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Plot!a", second: "Tab!b", direction: "row" } }],
        },
        "Tab!b": {
          activeTabIdx: 0,
          tabs: [{ title: "B", layout: "RawMessages!a" }],
        },
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps,
          panelId: "Plot!a",
          sourceTabId: "Tab!a",
          targetTabId: "Tab!b",
          position: "right",
          destinationPath: [],
          ownPath: ["first"],
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual("Tab!a");
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: "Tab!b" }],
      });
      expect(configById["Tab!b"]).toEqual({
        activeTabIdx: 0,
        tabs: [
          { title: "B", layout: { first: "RawMessages!a", second: "Plot!a", direction: "row" } },
        ],
      });
    });
    it("handles dragging Tab panels between Tab panels", () => {
      const originalLayout = {
        first: "Tab!a",
        second: "Tab!b",
        direction: "column",
      } as MosaicParent<string>;
      const tabCConfig = {
        activeTabIdx: 0,
        tabs: [
          { title: "C1", layout: "Plot!a" },
          { title: "C2", layout: undefined },
        ],
      };
      const originalSavedProps = {
        "Tab!a": {
          activeTabIdx: 0,
          tabs: [{ title: "A", layout: { first: "Tab!c", second: "Audio!a", direction: "row" } }],
        },
        "Tab!b": { activeTabIdx: 0, tabs: [{ title: "B" }] },
        "Tab!c": tabCConfig,
      };
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
        configById: originalSavedProps,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: "Tab!a", path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps,
          panelId: "Tab!c",
          sourceTabId: "Tab!a",
          targetTabId: "Tab!b",
          position: "right",
          destinationPath: [],
          ownPath: ["first"],
        },
      });
      const { layout, configById } = panels;
      expect(layout).toEqual({ first: "Tab!a", second: "Tab!b", direction: "column" });
      expect(configById["Tab!a"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "A", layout: "Audio!a" }],
      });
      expect(configById["Tab!b"]).toEqual({
        activeTabIdx: 0,
        tabs: [{ title: "B", layout: "Tab!c" }],
      });
      expect(configById["Tab!c"]).toEqual(tabCConfig);
    });
    it("handles drags in multi-panel layouts", () => {
      const originalLayout = {
        first: "Audio!a",
        second: "Plot!a",
        direction: "row",
      } as MosaicParent<string>;
      let panels: LayoutData = {
        ...emptyLayout,
        layout: originalLayout,
      };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: undefined, path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps: {},
          panelId: "Audio!a",
          sourceTabId: undefined,
          targetTabId: undefined,
          position: "right",
          destinationPath: ["second"],
          ownPath: ["first"],
        },
      });
      expect(panels.layout).toEqual({
        first: "Plot!a",
        second: "Audio!a",
        direction: "row",
      });
    });
    it("handles drags in multi-panel layouts - invalid position", () => {
      const originalLayout = {
        first: "Audio!a",
        second: "Plot!a",
        direction: "row",
      } as MosaicParent<string>;
      let panels: LayoutData = { ...emptyLayout, layout: originalLayout };
      panels = panelsReducer(panels, {
        type: "START_DRAG",
        payload: { sourceTabId: undefined, path: ["first"] },
      });
      panels = panelsReducer(panels, {
        type: "END_DRAG",
        payload: {
          originalLayout,
          originalSavedProps: {},
          panelId: "Audio!a",
          sourceTabId: undefined,
          targetTabId: undefined,
          position: undefined as unknown as MosaicDropTargetPosition,
          destinationPath: ["second"],
          ownPath: ["first"],
        },
      });
      expect(panels.layout).toEqual({
        first: "Audio!a",
        second: "Plot!a",
        direction: "row",
        splitPercentage: undefined,
      });
    });
  });
});
