/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { act, render, screen } from "@testing-library/react";
import { VerticalBars } from "./VerticalBars";
import { useMessagePipelineSubscribe } from "@lichtblick/suite-base/components/MessagePipeline";
import { useHoverValue } from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";
import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";
import { IDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/IDatasetsBuilder";

jest.mock("@lichtblick/suite-base/components/MessagePipeline", () => ({
  useMessagePipelineSubscribe: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/context/TimelineInteractionStateContext", () => ({
  useHoverValue: jest.fn(() => ({
    testId: 'hover-value-test-id',
    value: 'mocked-hover-value',
  })),
}));

jest.mock('@lichtblick/suite-base/panels/Plot/PlotCoordinator', () => {
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
    testId: 'hover-value-test-id',
    value: 'mocked-hover-value',
  }));

  beforeEach(() => {
    mockSubscribe = jest.fn();
    (useMessagePipelineSubscribe as jest.Mock).mockImplementation(() => mockSubscribe);

    mockUseHoverValue = jest.fn();
    (useHoverValue as jest.Mock).mockImplementation(mockUseHoverValue);

    jest.clearAllMocks();
  });

  it("renders without crashing when no coordinator is provided", () => {
    setup({ coordinator: undefined });
    expect(screen.queryByTestId("vertical-bars")).toBeDefined();
  });

  it("updates bar positions on xScale changes", () => {
    const mockScale = { left: 0, right: 100, min: 0, max: 10 };
    const { rerender, unmount } = setup({ coordinator: mockCoordinator });

    expect(mockCoordinator.on).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));

    act(() => {
      const handler = mockCoordinator.on.mock.calls[0][1];
      handler(mockScale);
    });

    rerender(<VerticalBars coordinator={undefined} hoverComponentId="test" xAxisIsPlaybackTime={true} />);

    unmount();
    expect(mockCoordinator.off).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));
  });

  it("renders bars with appropriate styles", () => {
    const currentTimeBar = screen.getByTestId("hover-value-test-id");
    const hoverBar = screen.getByTestId("hover-bar");
    mockUseHoverValue.mockReturnValue({ value: 5 });

    setup();

    expect(currentTimeBar).toBeInTheDocument();
    expect(hoverBar).toBeInTheDocument();
  });

  it("updates hover bar position on hover value change", () => {
    const hoverBar = screen.getByTestId("hover-bar");
    mockUseHoverValue.mockReturnValueOnce({ value: 2 });

    setup();

    act(() => {
      mockUseHoverValue.mockReturnValue({ value: 4 });
    });

    expect(hoverBar.style.transform).toBe("translateX(40px)");
  });

  it("handles unsubscriptions on unmount", () => {
    const mockCoordinator = {
      on: jest.fn(),
      off: jest.fn(),
    };
    const { unmount } = setup({ coordinator: mockCoordinator });

    unmount();
    expect(mockCoordinator.off).toHaveBeenCalledWith("xScaleChanged", expect.any(Function));
  });

});
