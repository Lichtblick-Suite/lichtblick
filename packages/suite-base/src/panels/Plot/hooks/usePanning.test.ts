/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";
import Hammer from "hammerjs";
import { act } from "react";

import { PlotCoordinator } from "@lichtblick/suite-base/panels/Plot/PlotCoordinator";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import usePanning from "./usePanning";

const panmove = "panmove";
const panstart = "panstart";
const panend = "panend";
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const mockHammerManager = {
  add: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};

const triggerEvent = (eventType: string, mockEvent: any) => {
  const handler = mockHammerManager.on.mock.calls.find(([event]) => event === eventType)[1];
  act(() => {
    handler(mockEvent);
  });
};

jest.mock("hammerjs");
Hammer.Manager = jest.fn().mockImplementation(() => mockHammerManager);

describe("usePanning", () => {
  let canvasDiv: HTMLDivElement;
  let coordinator: PlotCoordinator;
  let draggingRef: React.MutableRefObject<boolean>;
  let spy: jest.SpyInstance;
  let mockEvent: any;

  const setupMocks = () => {
    canvasDiv = document.createElement("div");
    canvasDiv.style.position = "relative";
    canvasDiv.style.width = `${CANVAS_WIDTH}px`;
    canvasDiv.style.height = `${CANVAS_HEIGHT}px`;
    document.body.appendChild(canvasDiv);

    coordinator = {
      addInteractionEvent: jest.fn(),
    } as unknown as PlotCoordinator;

    draggingRef = { current: false };
    spy = jest.spyOn(coordinator, "addInteractionEvent");

    mockEvent = {
      deltaX: BasicBuilder.number(),
      deltaY: BasicBuilder.number(),
      target: {
        getBoundingClientRect: jest.fn().mockReturnValue({
          toJSON: () => ({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }),
        }),
      },
    };
    return { mockEvent };
  };

  const setup = () => {
    const mocks = setupMocks();
    return {
      ...renderHook(() => {
        usePanning(canvasDiv, coordinator, draggingRef);
      }),
      ...mocks,
    };
  };

  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    document.body.removeChild(canvasDiv);
    jest.clearAllMocks();
  });

  it("should initialize Hammer Manager and set up event listeners", () => {
    setup();

    expect(Hammer.Manager).toHaveBeenCalledWith(canvasDiv);
    expect(mockHammerManager.add).toHaveBeenCalledWith(expect.any(Hammer.Pan));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panstart, expect.any(Function));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panmove, expect.any(Function));
    expect(mockHammerManager.on).toHaveBeenCalledWith(panend, expect.any(Function));
  });

  it("should call coordinator.addInteractionEvent on panstart", () => {
    setup();

    mockEvent.deltaX = BasicBuilder.number();
    mockEvent.deltaY = BasicBuilder.number();
    mockEvent.center = { x: BasicBuilder.number(), y: BasicBuilder.number() };

    triggerEvent(panstart, mockEvent);

    expect(draggingRef.current).toBe(true);
    expect(spy).toHaveBeenCalledWith({
      type: panstart,
      cancelable: false,
      deltaX: mockEvent.deltaX,
      deltaY: mockEvent.deltaY,
      center: mockEvent.center,
      boundingClientRect: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    });
  });

  it("should call coordinator.addInteractionEvent on panmove", () => {
    setup();

    triggerEvent(panmove, mockEvent);

    expect(spy).toHaveBeenCalledWith({
      type: panmove,
      cancelable: false,
      deltaY: mockEvent.deltaY,
      deltaX: mockEvent.deltaX,
      boundingClientRect: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    });
  });

  it("should call coordinator.addInteractionEvent on panend and reset draggingRef", () => {
    setup();

    triggerEvent(panend, mockEvent);

    expect(spy).toHaveBeenCalledWith({
      type: panend,
      cancelable: false,
      deltaY: mockEvent.deltaY,
      deltaX: mockEvent.deltaX,
      boundingClientRect: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    });

    jest.runAllTimers();
    expect(draggingRef.current).toBe(false);

    jest.useRealTimers();
  });

  it("should clean up Hammer Manager on unmount", () => {
    const { unmount } = setup();

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
    expect(spy).not.toHaveBeenCalled();
  });
});
