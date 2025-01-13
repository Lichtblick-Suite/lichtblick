/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
/* eslint-disable @typescript-eslint/unbound-method */

import { renderHook, act } from "@testing-library/react";
import { MutableRefObject } from "react";

import { debouncePromise } from "@lichtblick/den/async";
import {
  useSetHoverValue,
  useClearHoverValue,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";
import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";
import { PlotConfig } from "@lichtblick/suite-base/panels/Plot/config";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import usePlotInteractionHandlers from "./usePlotInteractionHandlers";

jest.mock("@lichtblick/den/async", () => ({
  debouncePromise: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/context/TimelineInteractionStateContext", () => ({
  useSetHoverValue: jest.fn(),
  useClearHoverValue: jest.fn(),
  useTimelineInteractionState: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/components/MessagePipeline", () => ({
  useMessagePipelineGetter: jest.fn(),
}));

describe("usePlotInteractionHandlers", () => {
  const mockCoordinator = {
    getXValueAtPixel: jest.fn(() => BasicBuilder.number()),
    resetBounds: jest.fn(),
    setZoomMode: jest.fn(),
    getCsvData: jest.fn(),
    addInteractionEvent: jest.fn(),
  } as unknown as PlotCoordinator;
  const mockRenderer = {
    getElementsAtPixel: jest.fn(),
  } as unknown as OffscreenCanvasRenderer;
  const mockSubscriberId = BasicBuilder.string();
  const mockCustomTitle = BasicBuilder.string();
  const mockConfig = {
    xAxisVal: "timestamp",
    PANEL_TITLE_CONFIG_KEY: mockCustomTitle,
  } as unknown as PlotConfig;
  const mockSetActiveTooltip = jest.fn();
  const mockDraggingRef = { current: false } as MutableRefObject<boolean>;
  const mockSetHoverValue = jest.fn();
  const mockClearHoverValue = jest.fn();

  const setup = () => {
    jest.clearAllMocks();
    (useSetHoverValue as jest.Mock).mockReturnValue(mockSetHoverValue);
    (useClearHoverValue as jest.Mock).mockReturnValue(mockClearHoverValue);

    return renderHook(() =>
      usePlotInteractionHandlers(
        mockCoordinator,
        mockRenderer,
        mockSubscriberId,
        mockConfig,
        mockSetActiveTooltip,
        { shouldSync: false },
        mockDraggingRef,
      ),
    );
  };

  describe("onMouseMove", () => {
    it("sets hover value correctly", () => {
      const mockBuildTooltip = jest.fn();
      (debouncePromise as jest.Mock).mockReturnValue(mockBuildTooltip);
      const mockClientX = BasicBuilder.number();
      const mockClientY = BasicBuilder.number();
      const mockLeft = BasicBuilder.number();
      const mockTop = BasicBuilder.number();
      const { result } = setup();
      const expectedCanvasX = mockClientX - mockLeft;
      const expectedCanvasY = mockClientY - mockTop;

      act(() => {
        result.current.onMouseMove({
          clientX: mockClientX,
          clientY: mockClientY,
          currentTarget: {
            getBoundingClientRect: jest.fn(() => ({
              left: mockLeft,
              top: mockTop,
            })),
          },
        } as unknown as React.MouseEvent<HTMLElement>);
      });

      expect(mockCoordinator.getXValueAtPixel).toHaveBeenCalledWith(expectedCanvasX);
      expect(mockBuildTooltip).toHaveBeenCalledWith({
        clientX: mockClientX,
        clientY: mockClientY,
        canvasX: expectedCanvasX,
        canvasY: expectedCanvasY,
      });
      expect(mockSetHoverValue).toHaveBeenCalledWith({
        componentId: mockSubscriberId,
        value: expect.any(Number),
        type: "PLAYBACK_SECONDS",
      });
    });
  });

  describe("onMouseOut", () => {
    it("clears hover value", () => {
      const { result } = setup();

      act(() => {
        result.current.onMouseOut();
      });

      expect(mockSetActiveTooltip).toHaveBeenCalledWith(undefined);
      expect(mockClearHoverValue).toHaveBeenCalledWith(mockSubscriberId);
    });

    it("sets mousePresentRef to false", () => {
      const { result } = setup();

      act(() => {
        result.current.onMouseOut();
      });

      expect(mockDraggingRef.current).toBe(false);
    });
  });

  describe("onWheel", () => {
    it("handles wheel event correctly", () => {
      const { result } = setup();

      const boundingRect = {
        left: 5,
        top: 5,
        toJSON: jest.fn().mockReturnValue({
          left: 5,
          top: 5,
        }),
      };

      act(() => {
        result.current.onWheel({
          deltaX: 1,
          deltaY: -1,
          clientX: 10,
          clientY: 20,
          currentTarget: {
            getBoundingClientRect: jest.fn(() => boundingRect),
          },
        } as unknown as React.WheelEvent<HTMLElement>);
      });

      expect(mockCoordinator.addInteractionEvent).toHaveBeenCalledWith({
        type: "wheel",
        cancelable: false,
        deltaX: 1,
        deltaY: -1,
        clientX: 10,
        clientY: 20,
        boundingClientRect: boundingRect.toJSON(),
      });
    });
  });

  describe("onResetView", () => {
    it("resets coordinator bounds", () => {
      const { result } = setup();

      act(() => {
        result.current.onResetView();
      });

      expect(mockCoordinator.resetBounds).toHaveBeenCalled();
    });
  });
  it("should not call setZoomMode if not mounted", () => {
    const { result, unmount } = setup();

    unmount();

    act(() => {
      result.current.onWheel({
        deltaX: 1,
        deltaY: -1,
        clientX: 10,
        clientY: 20,
        currentTarget: {
          getBoundingClientRect: jest.fn(() => ({
            left: BasicBuilder.number(),
            top: BasicBuilder.number(),
            toJSON: jest.fn(), // Add this line to mock toJSON method
          })),
        },
      } as unknown as React.WheelEvent<HTMLElement>);
    });

    expect(mockCoordinator.setZoomMode).not.toHaveBeenCalled();
  });
});
