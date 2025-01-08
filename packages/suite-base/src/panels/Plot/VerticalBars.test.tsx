/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { render, screen } from "@testing-library/react";

import { useMessagePipelineSubscribe } from "@lichtblick/suite-base/components/MessagePipeline";
import { useHoverValue } from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";
import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";
import { IDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/IDatasetsBuilder";

import "@testing-library/jest-dom";
import { VerticalBars } from "./VerticalBars";

jest.mock("@lichtblick/suite-base/components/MessagePipeline", () => ({
  useMessagePipelineSubscribe: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/context/TimelineInteractionStateContext", () => ({
  useHoverValue: jest.fn(() => ({
    testId: "hover-value-test-id",
    value: "mocked-hover-value",
  })),
}));

jest.mock("@lichtblick/suite-base/panels/Plot/PlotCoordinator", () => {
  return {
    PlotCoordinator: jest.fn(() => ({
      someMethod: jest.fn(),
    })),
  };
});

const mockRenderer = jest.fn() as unknown as OffscreenCanvasRenderer;
const mockBuilder = jest.fn() as unknown as IDatasetsBuilder;

const mockCoordinator = {
  on: jest.fn(),
  off: jest.fn(),
  renderer: jest.fn(() => new PlotCoordinator(mockRenderer, mockBuilder)),
  datasetsBuilder: jest.fn(),
  configBounds: jest.fn(),
  lastSeekTime: jest.fn(),
  PlotCoordinator: jest.fn(),
};

const setup = (props = {}) => {
  const defaultProps = {
    hoverComponentId: "test",
    xAxisIsPlaybackTime: true,
    coordinator: undefined,
  };
  const mergedProps = { ...defaultProps, ...props };

  return render(<VerticalBars {...mergedProps} />);
};

describe("VerticalBars", () => {
  let mockSubscribe: jest.Mock;
  let mockUseHoverValue: jest.Mock = jest.fn(() => ({
    testId: "hover-value-test-id",
    value: "mocked-hover-value",
  }));

  beforeEach(() => {
    mockSubscribe = jest.fn();
    (useMessagePipelineSubscribe as jest.Mock).mockImplementation(() => mockSubscribe);

    mockUseHoverValue = jest.fn();
    (useHoverValue as jest.Mock).mockImplementation(mockUseHoverValue);

    jest.clearAllMocks();
  });

  it("renders null without coordinator", () => {
    setup({ coordinator: undefined });
    expect(screen.queryByTestId("vertical-bars")).toBeDefined();
  });

  it("updates bar positions on xScale changes", () => {
    const { unmount } = setup({ coordinator: mockCoordinator });

    expect(mockCoordinator.on).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));

    unmount();
    expect(mockCoordinator.off).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));
  });

  it("renders bars correctly if a proper coordinator is defined", () => {
    mockUseHoverValue.mockReturnValue({ value: 5 });

    setup({ coordinator: mockCoordinator });

    const currentTimeBar = screen.getByTestId("vertical-bar");
    const hoverBar = screen.getByTestId("hover-bar");

    expect(currentTimeBar).toBeInTheDocument();
    expect(hoverBar).toBeInTheDocument();
  });

  it("handles unsubscriptions on unmount", () => {
    const { unmount } = setup({ coordinator: mockCoordinator });

    unmount();
    expect(mockCoordinator.off).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));
  });
});
