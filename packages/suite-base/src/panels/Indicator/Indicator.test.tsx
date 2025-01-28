/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { userEvent } from "@storybook/testing-library";
import { render, screen } from "@testing-library/react";
import React from "react";

import { PanelExtensionContext } from "@lichtblick/suite";
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

type Setup = {
  configOverride?: Partial<IndicatorConfig>;
  contextOverride?: Partial<PanelExtensionContext>;
};

jest.mock("@lichtblick/suite-base/testing/builders/IndicatorBuilder", () => ({
  config: jest.fn(() => ({})),
}));

describe("Indicator Component", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setup({ contextOverride, configOverride }: Setup = {}) {
    const path = BasicBuilder.string();
    const props: IndicatorProps = {
      context: {
        initialState: {},
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

    const config: IndicatorConfig = {
      ...IndicatorBuilder.config(),
      ...configOverride,
    };
    const saveConfig = () => {};
    const initPanel = jest.fn();

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
      path,
    };
  }

  it("renders Indicator component", () => {
    const { matchingRule } = setup();

    const element = screen.getByText(matchingRule.label);
    expect(element).toBeTruthy();
  });

  it("renders with default configuration", () => {
    const { config } = setup();
    expect(config).toEqual(IndicatorBuilder.config());
  });

  it("renders with custom configuration", () => {
    const customConfig: Partial<IndicatorConfig> = {
      path: BasicBuilder.string(),
      style: "background" as IndicatorStyle,
      fallbackColor: "#ff0000",
    };
    const { config } = setup({ configOverride: customConfig });
    expect(config).toMatchObject(customConfig);
  });

  it("calls context.saveState on config change", () => {
    const saveStateMock = jest.fn();
    const { props, path } = setup({
      contextOverride: { saveState: saveStateMock },
    });
    props.context.saveState({ path: path });
    expect(saveStateMock).toHaveBeenCalledWith({ path: path });
  });

  it("calls context.setDefaultPanelTitle on config change", () => {
    const setDefaultPanelTitleMock = jest.fn();
    const { props, path } = setup({
      contextOverride: { setDefaultPanelTitle: setDefaultPanelTitleMock },
    });
    props.context.setDefaultPanelTitle(path);
    expect(setDefaultPanelTitleMock).toHaveBeenCalledWith(path);
  });

  it("calls context.setDefaultPanelTitle with undefined path", () => {
    const setDefaultPanelTitleMock = jest.fn();
    const { props, path } = setup({
      contextOverride: { setDefaultPanelTitle: setDefaultPanelTitleMock },
      configOverride: { path: undefined },
    });
    props.context.setDefaultPanelTitle(path);
    expect(setDefaultPanelTitleMock).toHaveBeenCalledWith(path);
  });

  it("calls context.setDefaultPanelTitle with empty path", () => {
    const setDefaultPanelTitleMock = jest.fn();
    const { props, path } = setup({
      contextOverride: { setDefaultPanelTitle: setDefaultPanelTitleMock },
      configOverride: { path: "" },
    });
    props.context.setDefaultPanelTitle(path);
    expect(setDefaultPanelTitleMock).toHaveBeenCalledWith(path);
  });

  it("subscribes and unsubscribes to topics", () => {
    const subscribeMock = jest.fn();
    const unsubscribeAllMock = jest.fn();
    const TEST_TOPIC = BasicBuilder.string();
    const { props } = setup({
      contextOverride: { subscribe: subscribeMock, unsubscribeAll: unsubscribeAllMock },
    });
    props.context.subscribe([{ topic: TEST_TOPIC, preload: false }]);
    expect(subscribeMock).toHaveBeenCalledWith([{ topic: TEST_TOPIC, preload: false }]);
    props.context.unsubscribeAll();
    expect(unsubscribeAllMock).toHaveBeenCalled();
  });

  it("updates global variables when renderState.variables is defined", () => {
    const { props } = setup();
    const variables = BasicBuilder.stringMap();
    const renderState = { variables };

    props.context.onRender!(renderState, jest.fn());
    expect(props.context.onRender).toBeDefined();
  });
});
