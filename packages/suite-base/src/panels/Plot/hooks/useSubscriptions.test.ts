/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";

import { useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";
import useGlobalVariables from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { PlotConfig } from "@lichtblick/suite-base/panels/Plot/config";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import useSubscriptions from "./useSubscriptions";

jest.mock("@lichtblick/suite-base/components/MessagePipeline", () => ({
  useMessagePipeline: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/hooks/useGlobalVariables", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("useSubscriptions", () => {
  let setSubscriptions: jest.Mock;
  let globalVariables: any;
  const defaultConfig: PlotConfig = {
    paths: [{ value: BasicBuilder.string() }],
    xAxisVal: BasicBuilder.string(),
  } as any;
  const testSubscriber = BasicBuilder.string();

  beforeEach(() => {
    setSubscriptions = jest.fn();
    (useMessagePipeline as jest.Mock).mockReturnValue(setSubscriptions);

    globalVariables = { someVariable: BasicBuilder.string() };
    (useGlobalVariables as jest.Mock).mockReturnValue({ globalVariables });

    jest.clearAllMocks();
  });

  const setup = (config: PlotConfig = defaultConfig, subscriberId: string = testSubscriber) => {
    return renderHook(() => {
      useSubscriptions(config, subscriberId);
    });
  };

  it("sets subscriptions correctly for series paths", () => {
    setup();

    expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, expect.any(Array));
  });

  it("sets subscriptions correctly for xAxisPath", () => {
    const customConfig: PlotConfig = {
      paths: [],
      xAxisVal: BasicBuilder.string(),
      xAxisPath: { value: BasicBuilder.string() },
    } as any;

    setup(customConfig);

    expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, expect.any(Array));
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = setup();

    unmount();

    expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
  });

  it("does not set subscriptions for invalid paths", () => {
    const invalidConfig: PlotConfig = {
      paths: [{ value: BasicBuilder.string() }],
      xAxisVal: BasicBuilder.string(),
    } as any;

    setup(invalidConfig);

    expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
  });
});
