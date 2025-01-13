/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";

import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { CurrentCustomDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/CurrentCustomDatasetsBuilder";
import { CustomDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/CustomDatasetsBuilder";
import { PlotConfig } from "@lichtblick/suite-base/panels/Plot/config";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import { TimestampMethod } from "@lichtblick/suite-base/util/time";

import usePlotDataHandling from "./usePlotDataHandling";
import { IndexDatasetsBuilder } from "../builders/IndexDatasetsBuilder";

jest.mock("@lichtblick/message-path", () => ({
  parseMessagePath: jest.fn(),
}));
jest.mock(
  "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems",
  () => ({
    fillInGlobalVariablesInPath: jest.fn(),
  }),
);
jest.mock("@lichtblick/suite-base/util/plotColors", () => ({
  getLineColor: jest.fn(
    (color: string | undefined, idx: number) => color ?? `default-color-${idx}`,
  ),
}));

describe("usePlotDataHandling hook", () => {
  global.Worker = jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: undefined,
    addEventListener: jest.fn(),
  }));

  const mockGlobalVariables: GlobalVariables = {};
  const mockConfig: PlotConfig = {
    paths: [
      {
        value: BasicBuilder.string(),
        label: BasicBuilder.string(),
        color: BasicBuilder.string(),
        enabled: BasicBuilder.boolean(),
        timestampMethod: "receiveTime",
      },
      {
        value: BasicBuilder.string(),
        label: BasicBuilder.string(),
        enabled: BasicBuilder.boolean(),
        timestampMethod: "receiveTime",
      },
    ],
    xAxisVal: "timestamp",
    xAxisPath: { value: BasicBuilder.string(), enabled: BasicBuilder.boolean() },
    isSynced: BasicBuilder.boolean(),
    showLegend: BasicBuilder.boolean(),
    showPlotValuesInLegend: BasicBuilder.boolean(),
    showXAxisLabels: BasicBuilder.boolean(),
    showYAxisLabels: BasicBuilder.boolean(),
    legendDisplay: "floating",
    sidebarDimension: BasicBuilder.number(),
  };

  it("should create an IndexDatasetsBuilder for 'index' xAxisVal", () => {
    const config = { ...mockConfig, xAxisVal: "index" as const };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.datasetsBuilder).toBeInstanceOf(IndexDatasetsBuilder);
  });

  it("should create a CurrentCustomDatasetsBuilder for 'currentCustom' xAxisVal", () => {
    const config = { ...mockConfig, xAxisVal: "currentCustom" as const };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.datasetsBuilder).toBeInstanceOf(CurrentCustomDatasetsBuilder);
  });

  it("should create a CustomDatasetsBuilder for 'custom' xAxisVal", () => {
    const config = { ...mockConfig, xAxisVal: "custom" as const };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.datasetsBuilder).toBeInstanceOf(CustomDatasetsBuilder);
  });

  it("should handle empty xAxisPath gracefully for 'currentCustom' xAxisVal", () => {
    const config = {
      ...mockConfig,
      xAxisVal: "currentCustom" as const,
      xAxisPath: { value: "", enabled: true },
    };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.datasetsBuilder).toBeInstanceOf(CurrentCustomDatasetsBuilder);
  });

  it("should handle missing xAxisPath gracefully for 'custom' xAxisVal", () => {
    const config = {
      ...mockConfig,
      xAxisVal: "custom" as const,
      xAxisPath: undefined,
    };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.datasetsBuilder).toBeInstanceOf(CustomDatasetsBuilder);
  });

  it("should generate correct colors and labels for datasets", () => {
    const config = {
      ...mockConfig,
      paths: [
        {
          value: "path1",
          label: "Label 1",
          color: "red",
          enabled: true,
          timestampMethod: "receiveTime" as TimestampMethod,
        },
        {
          value: "path2",
          label: "Label 2",
          color: undefined,
          enabled: true,
          timestampMethod: "receiveTime" as TimestampMethod,
        },
      ],
    };
    const { result } = renderHook(() => usePlotDataHandling(config, mockGlobalVariables));

    expect(result.current.colorsByDatasetIndex).toEqual({
      0: "red",
      1: "default-color-1",
    });
    expect(result.current.labelsByDatasetIndex).toEqual({
      0: "Label 1",
      1: "Label 2",
    });
  });
});
