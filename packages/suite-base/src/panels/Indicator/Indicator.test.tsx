/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { userEvent } from "@storybook/testing-library";
import { act, render, screen, waitFor } from "@testing-library/react";
import * as _ from "lodash-es";
import React from "react";

import { parseMessagePath } from "@lichtblick/message-path";
import { Immutable, PanelExtensionContext, RenderState } from "@lichtblick/suite";
import MockPanelContextProvider from "@lichtblick/suite-base/components/MockPanelContextProvider";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import Indicator from "@lichtblick/suite-base/panels/Indicator";
import { getMatchingRule } from "@lichtblick/suite-base/panels/Indicator/getMatchingRule";
import {
  IndicatorConfig,
  IndicatorProps,
  IndicatorStyle,
} from "@lichtblick/suite-base/panels/Indicator/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import IndicatorBuilder from "@lichtblick/suite-base/testing/builders/IndicatorBuilder";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";

jest.mock("./getMatchingRule", () => ({
  getMatchingRule: jest.fn(),
}));

jest.mock("@lichtblick/message-path", () => ({
  parseMessagePath: jest.fn(),
}));

type Setup = {
  configOverride?: Partial<IndicatorConfig>;
  contextOverride?: Partial<PanelExtensionContext>;
};

describe("Indicator Component", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setup({ contextOverride, configOverride }: Setup = {}) {
    const config: IndicatorConfig = {
      ...IndicatorBuilder.config(),
      ...configOverride,
    };

    const props: IndicatorProps = {
      context: {
        initialState: config,
        layout: {
          addPanel: jest.fn(),
        },
        onRender: jest.fn(),
        panelElement: document.createElement("div"),
        saveState: jest.fn(),
        setDefaultPanelTitle: jest.fn(),
        setParameter: jest.fn(),
        setPreviewTime: jest.fn(),
        setSharedPanelState: jest.fn(),
        setVariable: jest.fn(),
        subscribe: jest.fn(),
        subscribeAppSettings: jest.fn(),
        unsubscribeAll: jest.fn(),
        updatePanelSettingsEditor: jest.fn(),
        watch: jest.fn(),
        ...contextOverride,
      },
    };

    const saveConfig = () => {};
    // const initPanel = jest.fn();
    const renderStates: Immutable<RenderState>[] = [];
    const initPanel = jest.fn((context: PanelExtensionContext) => {
      context.watch("currentFrame");
      context.watch("didSeek");
      context.subscribe([{ topic: "x", preload: false }]);
      context.onRender = (renderState, done) => {
        renderStates.push({ ...renderState });
        done();
      };
    });

    const ui: React.ReactElement = (
      <ThemeProvider isDark>
        <MockPanelContextProvider>
          <PanelSetup>
            <PanelExtensionAdapter config={config} saveConfig={saveConfig} initPanel={initPanel}>
              <Indicator {...props} />
            </PanelExtensionAdapter>
          </PanelSetup>
        </MockPanelContextProvider>
      </ThemeProvider>
    );

    const matchingRule = {
      color: "#68e24a",
      label: BasicBuilder.string(),
    };
    (getMatchingRule as jest.Mock).mockReturnValue(matchingRule);

    const augmentColor = jest.fn(({ color: { main } }) => ({
      contrastText: `${main}-contrast`,
    }));

    return {
      ...render(ui),
      config,
      matchingRule,
      props,
      user: userEvent.setup(),
      augmentColor,
      saveConfig,
      initPanel,
    };
  }

  it("renders Indicator component", () => {
    const { matchingRule } = setup();

    const element = screen.getByText(matchingRule.label);
    expect(element).toBeTruthy();
  });

  it("renders with custom configuration", () => {
    const customConfig: Partial<IndicatorConfig> = {
      path: BasicBuilder.string(),
      style: "background",
      fallbackColor: "#ff0000",
    };

    const { config } = setup({ configOverride: customConfig });

    expect(config).toMatchObject(customConfig);
  });

  // it("calls context.saveState on config change", () => {
  //   const newConfig = IndicatorBuilder.config();
  //   const { props } = setup();

  //   props.context.saveState(newConfig);

  //   const saveState = jest.spyOn(props.context, "saveState");
  //   expect(saveState).toHaveBeenCalledWith(newConfig);
  // });

  // it("calls context.setDefaultPanelTitle with undefined when path is empty string", () => {
  //   const { props } = setup({
  //     configOverride: { path: "" },
  //   });

  //   props.context.setDefaultPanelTitle(undefined);

  //   const setDefaultPanelTitle = jest.spyOn(props.context, "setDefaultPanelTitle");
  //   expect(setDefaultPanelTitle).toHaveBeenCalledWith(undefined);
  //   expect(setDefaultPanelTitle).toHaveBeenCalledTimes(1);
  // });

  // it("calls context.setDefaultPanelTitle with path when path is populated", async () => {
  //   const { props, config } = setup({
  //     configOverride: { path: BasicBuilder.string() },
  //   });

  //   // props.context.setDefaultPanelTitle(config.path);
  //   console.log("AQUIIII", (props.context.setDefaultPanelTitle as jest.Mock).mock.calls);
  //   await act(async () => {});

  //   const setDefaultPanelTitle = jest.spyOn(props.context, "setDefaultPanelTitle");
  //   expect(setDefaultPanelTitle).toHaveBeenCalledWith(config.path);
  //   expect(setDefaultPanelTitle).toHaveBeenCalledTimes(1);
  // });

  // it("should subscribe when topicName is defined", async () => {
  //   const parsedPath = { topicName: "test-topic" };
  //   (parseMessagePath as jest.Mock).mockReturnValue(parsedPath);
  //   const { props, config, rerender, saveConfig, initPanel, unmount } = setup();

  //   // eslint-disable-next-line @typescript-eslint/no-deprecated
  //   props.context.subscribe(parsedPath);

  //   console.log("subscribe CALLS: ", (props.context.subscribe as jest.Mock).mock.calls);

  //   const subscribe = jest.spyOn(props.context, "subscribe");
  //   // const unsubscribeAll = jest.spyOn(props.context, "unsubscribeAll");
  //   expect(subscribe).toHaveBeenCalled();
  //   // unmount();
  // });

  // it("subscribes to topic when parsedPath.topicName is defined", () => {
  //   const { props, parsedPath } = setup();

  //   props.context.subscribe([{ topic: parsedPath.topicName, preload: false }]);

  //   const subscribe = jest.spyOn(props.context, "subscribe");
  //   expect(subscribe).toHaveBeenCalledWith([{ topic: parsedPath.topicName, preload: false }]);
  //   expect(subscribe).toHaveBeenCalledTimes(1);
  // });

  // it("handles context.onRender with didSeek and renderState.variables", () => {
  //   const { props } = setup();
  //   const renderState = { didSeek: true, variables: BasicBuilder.stringMap() };

  //   props.context.onRender!(renderState, jest.fn());
  //   expect(props.context.onRender).toBeDefined();
  // });
});
