/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { renderHook } from "@testing-library/react";
import * as _ from "lodash-es";

import { SettingsTreeAction } from "@lichtblick/suite";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { settingsActionReducer, useSettingsTree } from "./settings";
import {
  ColorMapConfig,
  ColorModeConfig,
  GaugeConfig,
  SettingsActionReducerProps,
  SettingsTreeNodesProps,
} from "./types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function buildConfig(propsOverride: Partial<GaugeConfig> = {}): GaugeConfig {
  return {
    colorMap: BasicBuilder.sample(ColorMapConfig),
    colorMode: BasicBuilder.sample(ColorModeConfig),
    gradient: ["#000", "#fff"],
    maxValue: BasicBuilder.number(),
    minValue: BasicBuilder.number(),
    path: BasicBuilder.string(),
    reverse: BasicBuilder.boolean(),
    ...propsOverride,
  };
}

describe("settingsActionReducer", () => {
  function buildUpdateAction({
    path,
    value,
  }: { path?: string[]; value?: string } = {}): SettingsTreeAction {
    return {
      action: "update",
      payload: {
        input: "autocomplete",
        path: path ?? BasicBuilder.strings(),
        value: value ?? BasicBuilder.string(),
      },
    };
  }

  function buildPerformNodeAction(): SettingsTreeAction {
    return {
      action: "perform-node-action",
      payload: {
        id: BasicBuilder.string(),
        path: BasicBuilder.strings(),
      },
    };
  }

  function setup(propsOverride: Partial<SettingsActionReducerProps> = {}): {
    props: SettingsActionReducerProps;
  } {
    const settingsTreeAction: "perform-node-action" | "update" = BasicBuilder.sample([
      "perform-node-action",
      "update",
    ]);
    const action: SettingsTreeAction = buildPerformNodeAction();
    if (settingsTreeAction === "update") {
      _.merge(action, buildUpdateAction());
    }

    const props: SettingsActionReducerProps = {
      prevConfig: buildConfig(),
      action,
      ...propsOverride,
    };
    return { props };
  }

  it("should throw an error for 'perform-node-action' action", () => {
    const { props } = setup({
      action: buildPerformNodeAction(),
    });

    expect(() => settingsActionReducer(props)).toThrow(
      `Unhandled node action: ${(props.action.payload as any).id}`,
    );
  });

  it("should update a general property when path is 'general'", () => {
    const value = BasicBuilder.string();
    const path = ["general", ...BasicBuilder.strings()];
    const action = buildUpdateAction({ path, value });
    const { props } = setup({ action });

    const result = settingsActionReducer(props);

    expect(result).toHaveProperty(path[1]!);
    expect((result as any)[path[1]!]).toBe(value);
  });

  it("should throw an error for an unexpected path[0]", () => {
    const action = buildUpdateAction();
    const { props } = setup({ action });

    expect(() => settingsActionReducer(props)).toThrow(
      `Unexpected payload.path[0]: ${props.action.payload.path[0]}`,
    );
  });

  it("Immer should return the same config if the action type is not handled", () => {
    const action = {
      action: "unknown-action",
      payload: {},
    } as unknown as SettingsTreeAction;
    const { props } = setup({ action });

    const result = settingsActionReducer({ prevConfig: props.prevConfig, action });

    expect(result).toEqual(props.prevConfig);
  });
});

describe("useSettingsTree", () => {
  function setup(propsOverride: Partial<SettingsTreeNodesProps> = {}): {
    props: SettingsTreeNodesProps;
  } {
    const props: SettingsTreeNodesProps = {
      config: buildConfig(),
      error: undefined,
      pathParseError: undefined,
      ...propsOverride,
    };
    return { props };
  }

  it("should return general settings node", () => {
    const { props } = setup({
      config: buildConfig({
        colorMap: ColorMapConfig.RAINBOW,
        colorMode: ColorModeConfig.COLORMAP,
      }),
    });

    const { result } = renderHook(() => useSettingsTree(props));
    const { general } = result.current;

    expect(general).toBeDefined();
    expect(general.fields!.path).toEqual({
      label: "messagePath.label",
      input: "messagepath",
      value: props.config.path,
      error: props.pathParseError,
      validTypes: expect.any(Array),
    });
    expect(general.fields!.minValue).toEqual({
      label: "minValue.label",
      input: "number",
      value: props.config.minValue,
    });
    expect(general.fields!.maxValue).toEqual({
      label: "maxValue.label",
      input: "number",
      value: props.config.maxValue,
    });
    expect(general.fields!.colorMode).toEqual({
      label: "colorMode.label",
      input: "select",
      value: props.config.colorMode,
      options: expect.any(Array),
    });
    expect(general.fields!.colorMap).toBeDefined();
  });

  it("should include gradient field when colorMode is GRADIENT", () => {
    const { props } = setup({
      config: buildConfig({
        colorMap: ColorMapConfig.RAINBOW,
        colorMode: ColorModeConfig.GRADIENT,
      }),
    });

    const { result } = renderHook(() => useSettingsTree(props));
    const { general } = result.current;

    expect(general.fields!.gradient).toEqual({
      label: "colorMode.options.gradient",
      input: props.config.colorMode,
      value: props.config.gradient,
    });
    expect(general.fields!.colorMap).toBeUndefined();
  });

  it("should include reverse field", () => {
    const { props } = setup({
      config: buildConfig({
        reverse: true,
      }),
    });

    const { result } = renderHook(() => useSettingsTree(props));
    const { general } = result.current;

    expect(general.fields!.reverse).toEqual({
      label: "reverse.label",
      input: "boolean",
      value: props.config.reverse,
    });
  });

  it("should set error when provided", () => {
    const { props } = setup({
      config: buildConfig(),
      error: BasicBuilder.string(),
    });

    const { result } = renderHook(() => useSettingsTree(props));
    const { general } = result.current;

    expect(general.error).toEqual(props.error);
  });

  it("should set pathParseError when provided", () => {
    const { props } = setup({
      config: buildConfig(),
      pathParseError: BasicBuilder.string(),
    });

    const { result } = renderHook(() => useSettingsTree(props));
    const { general } = result.current;

    expect(general.fields!.path!.error).toEqual(props.pathParseError);
  });
});
