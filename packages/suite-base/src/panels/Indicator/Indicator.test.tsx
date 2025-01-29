/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { userEvent } from "@storybook/testing-library";
import { render, screen } from "@testing-library/react";
import React from "react";

import { parseMessagePath } from "@lichtblick/message-path";
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

    const parsedPath = { topicName: BasicBuilder.string() };
    (parseMessagePath as jest.Mock).mockReturnValue(parsedPath.topicName);

    const augmentColor = jest.fn(({ color: { main } }) => ({
      contrastText: `${main}-contrast`,
    }));

    return {
      ...render(ui),
      config,
      matchingRule,
      parsedPath,
      props,
      user: userEvent.setup(),
      augmentColor,
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
      style: "background" as IndicatorStyle,
      fallbackColor: "#ff0000",
    };
    const { config } = setup({ configOverride: customConfig });
    expect(config).toMatchObject(customConfig);
  });

  it("calls context.saveState on config change", () => {
    const saveStateMock = jest.fn();
    const path = BasicBuilder.string();
    const { props } = setup({
      contextOverride: { saveState: saveStateMock },
    });
    props.context.saveState({ path });
    expect(saveStateMock).toHaveBeenCalledWith({ path });
  });

  it("calls context.setDefaultPanelTitle on config change and empty path", () => {
    const setDefaultPanelTitleMock = jest.fn();
    const { props } = setup({
      contextOverride: { setDefaultPanelTitle: setDefaultPanelTitleMock },
      configOverride: IndicatorBuilder.config({ path: "" }),
    });
    props.context.setDefaultPanelTitle(undefined);

    expect(setDefaultPanelTitleMock).toHaveBeenCalledWith(undefined);
    expect(setDefaultPanelTitleMock).toHaveBeenCalledTimes(1);
  });

  it("subscribes and unsubscribes to topics", () => {
    const subscribeMock = jest.fn();
    const unsubscribeAllMock = jest.fn();
    const topic = BasicBuilder.string();
    const { props } = setup({
      contextOverride: { subscribe: subscribeMock, unsubscribeAll: unsubscribeAllMock },
    });

    props.context.subscribe([{ topic, preload: false }]);

    expect(subscribeMock).toHaveBeenCalledWith([{ topic, preload: false }]);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    props.context.unsubscribeAll();
    expect(unsubscribeAllMock).toHaveBeenCalled();
  });

  it("subscribes to topic when parsedPath.topicName is defined", () => {
    const subscribeMock = jest.fn();
    const { props, parsedPath } = setup({
      contextOverride: { subscribe: subscribeMock },
    });

    props.context.subscribe([{ topic: parsedPath.topicName, preload: false }]);

    expect(subscribeMock).toHaveBeenCalledWith([{ topic: parsedPath.topicName, preload: false }]);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });

  it("updates global variables when renderState.variables is defined", () => {
    const { props } = setup();
    const renderState = { variables: BasicBuilder.stringMap() };

    props.context.onRender!(renderState, jest.fn());
    expect(props.context.onRender).toBeDefined();
  });

  it("handles context.onRender with didSeek", () => {
    const { props } = setup();
    const renderState = { didSeek: true };

    props.context.onRender!(renderState, jest.fn());
    expect(props.context.onRender).toBeDefined();
  });
});
