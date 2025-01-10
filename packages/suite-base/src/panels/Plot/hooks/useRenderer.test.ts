/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { createTheme } from "@mui/material/styles";
import { renderHook } from "@testing-library/react";

import useRenderer from "./useRenderer";
import { OffscreenCanvasRenderer } from "../OffscreenCanvasRenderer";

jest.mock("../OffscreenCanvasRenderer", () => {
  return {
    OffscreenCanvasRenderer: jest.fn().mockImplementation(function (this: any) {
      this.setSize = jest.fn();
      this.destroy = jest.fn();
    }),
  };
});

Object.defineProperty(HTMLCanvasElement.prototype, "transferControlToOffscreen", {
  value: jest.fn().mockImplementation(() => ({
    width: 0,
    height: 0,
  })),
});

describe("useRenderer hook", () => {
  it("should create a renderer and attach canvas to the canvasDiv", () => {
    const canvasDiv = document.createElement("div");
    const theme = createTheme();

    const { result, unmount } = renderHook(() => useRenderer(canvasDiv, theme));

    expect(result.current).toBeInstanceOf(OffscreenCanvasRenderer);
    expect(canvasDiv.querySelector("canvas")).not.toBeNull();

    //unmounting the hook
    unmount();

    //Checking that the renderer was destroyed and canvas removed
    expect(canvasDiv.querySelector("canvas")).toBeNull();
  });

  it("should not create renderer if canvasDiv is undefined", () => {
    const theme = createTheme();

    const { result } = renderHook(() => useRenderer(ReactNull, theme));

    expect(result.current).toBeUndefined();
  });

  it("should correctly reinitialize the renderer if canvasDiv changes", () => {
    const canvasDiv1 = document.createElement("div");
    const canvasDiv2 = document.createElement("div");
    const theme = createTheme();

    const { result, rerender } = renderHook(({ div }) => useRenderer(div, theme), {
      initialProps: { div: canvasDiv1 },
    });

    const initialRenderer = result.current;

    // Switching canvasDiv
    rerender({ div: canvasDiv2 });

    expect(result.current).not.toBe(initialRenderer);
    expect(result.current).toBeInstanceOf(OffscreenCanvasRenderer);
    expect(canvasDiv1.querySelector("canvas")).toBeNull();
  });
});
