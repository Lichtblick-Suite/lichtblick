/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";

import { parseMessagePath } from "@lichtblick/message-path";
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

jest.mock("@lichtblick/message-path", () => ({
  parseMessagePath: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe("useSubscriptions", () => {
  let setSubscriptions: jest.Mock;
  let globalVariables: any;
  const defaultConfig: PlotConfig = {
    paths: [{ value: BasicBuilder.string() }],
    xAxisVal: BasicBuilder.string(),
  } as any;
  const testSubscriber = BasicBuilder.string();

  const setupMocks = () => {
    setSubscriptions = jest.fn();
    (useMessagePipeline as jest.Mock).mockReturnValue(setSubscriptions);

    globalVariables = { someVariable: BasicBuilder.string() };
    (useGlobalVariables as jest.Mock).mockReturnValue({ globalVariables });

    jest.mock("@lichtblick/message-path", () => ({
      parseMessagePath: jest.fn(),
    }));
  };

  const setup = (config: PlotConfig = defaultConfig, subscriberId: string = testSubscriber) => {
    setupMocks();
    return renderHook(() => {
      useSubscriptions(config, subscriberId);
    });
  };

  describe("Setting subscriptions", () => {
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

    it("sets subscriptions correctly for custom xAxisVal", () => {
      const customXAxisConfig: PlotConfig = {
        paths: [{ value: BasicBuilder.string() }],
        xAxisVal: "custom",
        xAxisPath: { value: BasicBuilder.string() },
      } as any;

      setup(customXAxisConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, expect.any(Array));
    });

    it("sets subscriptions correctly for currentCustom xAxisVal", () => {
      const customXAxisConfig: PlotConfig = {
        paths: [{ value: BasicBuilder.string() }],
        xAxisVal: "currentCustom",
        xAxisPath: { value: BasicBuilder.string() },
      } as any;

      setup(customXAxisConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, expect.any(Array));
    });
  });

  describe("Unsubscribing", () => {
    it("unsubscribes on unmount", () => {
      const { unmount } = setup();

      unmount();

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
    });
  });

  describe("Handling invalid paths", () => {
    it("does not set subscriptions for invalid paths", () => {
      const invalidConfig: PlotConfig = {
        paths: [{ value: BasicBuilder.string() }],
        xAxisVal: BasicBuilder.string(),
      } as any;

      setup(invalidConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
    });

    it("does not set subscriptions for reference line paths", () => {
      const referenceLineConfig: PlotConfig = {
        paths: [{ value: BasicBuilder.string(), type: "referenceLine" }],
        xAxisVal: BasicBuilder.string(),
      } as any;

      setup(referenceLineConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
    });

    it("sets subscriptions for non-reference line paths", () => {
      const nonReferenceLineConfig: PlotConfig = {
        paths: [{ value: BasicBuilder.string(), type: "series" }],
        xAxisVal: BasicBuilder.string(),
      } as any;

      setup(nonReferenceLineConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, expect.any(Array));
    });

    it("does not set subscriptions when parsedPath is undefined", () => {
      (parseMessagePath as jest.Mock).mockReturnValue(undefined);
      const mockPath = BasicBuilder.string();
      const configWithInvalidPath: PlotConfig = {
        paths: [{ value: mockPath }],
        xAxisVal: BasicBuilder.string(),
      } as any;

      setup(configWithInvalidPath);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
      expect(parseMessagePath).toHaveBeenCalledWith(mockPath);
    });

    it("does not set subscriptions for undefined xAxisPath", () => {
      const invalidXAxisConfig: PlotConfig = {
        paths: [],
        xAxisVal: BasicBuilder.string(),
        xAxisPath: undefined,
      } as any;

      setup(invalidXAxisConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
      expect(parseMessagePath).not.toHaveBeenCalled();
    });

    it("does not set subscriptions for null xAxisPath", () => {
      const invalidXAxisConfig: PlotConfig = {
        paths: [],
        xAxisVal: BasicBuilder.string(),
        xAxisPath: ReactNull,
      } as any;

      setup(invalidXAxisConfig);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
      expect(parseMessagePath).not.toHaveBeenCalled();
    });

    it("does not set subscriptions when parsedPath is null", () => {
      (parseMessagePath as jest.Mock).mockReturnValue(ReactNull);
      const mockPath = BasicBuilder.string();
      const configWithInvalidPath: PlotConfig = {
        paths: [{ value: mockPath }],
        xAxisVal: BasicBuilder.string(),
      } as any;

      setup(configWithInvalidPath);

      expect(setSubscriptions).toHaveBeenCalledWith(testSubscriber, []);
      expect(parseMessagePath).toHaveBeenCalledWith(mockPath);
    });
  });
});
