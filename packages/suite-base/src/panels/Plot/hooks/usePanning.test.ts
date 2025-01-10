/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/unbound-method */

import { renderHook } from "@testing-library/react";
import Hammer from "hammerjs";
import { act } from "react";

import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";

import usePanning from "./usePanning"; // Adjust the import path as needed

jest.mock("hammerjs");

const panmove = "panmove";
const panstart = "panstart";
const panend = "panend";
const mockHammerManager = {
  add: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};
Hammer.Manager = jest.fn().mockImplementation(() => mockHammerManager);

describe("usePanning", () => {
  let canvasDiv: HTMLDivElement;
  let coordinator: PlotCoordinator;
  let draggingRef: React.MutableRefObject<boolean>;

  beforeEach(() => {
    canvasDiv = document.createElement("div");
    canvasDiv.style.position = "relative";
    canvasDiv.style.width = "800px";
    canvasDiv.style.height = "600px";
    document.body.appendChild(canvasDiv);

    coordinator = {
      addInteractionEvent: jest.fn(),
    } as unknown as PlotCoordinator;

    draggingRef = { current: false };

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(canvasDiv);
  });

  it("should initialize Hammer Manager and set up event listeners", () => {
    renderHook(() => {
      usePanning(canvasDiv, coordinator, draggingRef);
    });

    expect(Hammer.Manager).toHaveBeenCalledWith(canvasDiv);
    expect(mockHammerManager.add).toHaveBeenCalledWith(expect.any(Hammer.Pan));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panstart, expect.any(Function));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panmove, expect.any(Function));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panend, expect.any(Function));
  });

  it("should call coordinator.addInteractionEvent on panstart", () => {
    renderHook(() => {
      usePanning(canvasDiv, coordinator, draggingRef);
    });

    const panstartHandler = mockHammerManager.on.mock.calls.find(
      ([event]) => event === panstart,
    )[1];

    const mockEvent = {
      deltaX: 50,
      deltaY: 30,
      center: { x: 100, y: 200 },
      target: {
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ toJSON: () => ({ x: 0, y: 0, width: 800, height: 600 }) }),
      },
    };

    act(() => {
      panstartHandler(mockEvent);
    });

    expect(draggingRef.current).toBe(true);
    expect(coordinator.addInteractionEvent).toHaveBeenCalledWith({
      type: panstart,
      cancelable: false,
      deltaY: 30,
      deltaX: 50,
      center: { x: 100, y: 200 },
      boundingClientRect: { x: 0, y: 0, width: 800, height: 600 },
    });
  });

  it("should call coordinator.addInteractionEvent on panmove", () => {
    renderHook(() => {
      usePanning(canvasDiv, coordinator, draggingRef);
    });

    const panmoveHandler = mockHammerManager.on.mock.calls.find(
      ([event]) => event === panmove,
    )[1];

    const mockEvent = {
      deltaX: 20,
      deltaY: 10,
      target: {
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ toJSON: () => ({ x: 0, y: 0, width: 800, height: 600 }) }),
      },
    };

    act(() => {
      panmoveHandler(mockEvent);
    });

    expect(coordinator.addInteractionEvent).toHaveBeenCalledWith({
      type: panmove,
      cancelable: false,
      deltaY: 10,
      deltaX: 20,
      boundingClientRect: { x: 0, y: 0, width: 800, height: 600 },
    });
  });

  it("should call coordinator.addInteractionEvent on panend and reset draggingRef", () => {
    jest.useFakeTimers();

    renderHook(() => {
      usePanning(canvasDiv, coordinator, draggingRef);
    });

    const panendHandler = mockHammerManager.on.mock.calls.find(([event]) => event === panend)[1];

    const mockEvent = {
      deltaX: 70,
      deltaY: 40,
      target: {
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ toJSON: () => ({ x: 0, y: 0, width: 800, height: 600 }) }),
      },
    };

    act(() => {
      panendHandler(mockEvent);
    });

    expect(coordinator.addInteractionEvent).toHaveBeenCalledWith({
      type: panend,
      cancelable: false,
      deltaY: 40,
      deltaX: 70,
      boundingClientRect: { x: 0, y: 0, width: 800, height: 600 },
    });

    jest.runAllTimers();
    expect(draggingRef.current).toBe(false);

    jest.useRealTimers();
  });

  it("should clean up Hammer Manager on unmount", () => {
    const { unmount } = renderHook(() => {
      usePanning(canvasDiv, coordinator, draggingRef);
    });

    unmount();

    expect(mockHammerManager.destroy).toHaveBeenCalled();
  });

  it("should do nothing if canvasDiv or coordinator is not provided", () => {
    renderHook(() => {
      usePanning(ReactNull, coordinator, draggingRef);
    });
    renderHook(() => {
      usePanning(canvasDiv, undefined, draggingRef);
    });

    expect(Hammer.Manager).not.toHaveBeenCalled();
    expect(coordinator.addInteractionEvent).not.toHaveBeenCalled();
  });
});
