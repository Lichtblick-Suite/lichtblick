// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { getPixelForXValue } from "./getPixelForXValue";
import type { Scale } from "./types";

describe("getPixelForXValue", () => {
  it("returns undefined if scale is undefined", () => {
    const result = getPixelForXValue(undefined, 10);
    expect(result).toBeUndefined();
  });

  it("returns undefined if xValue is undefined", () => {
    const scale: Scale = { left: 0, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined if xValue is out of scale range", () => {
    const scale: Scale = { left: 0, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, 200);
    expect(result).toBeUndefined();
  });

  it("returns correct pixel value for valid xValue and scale", () => {
    const scale: Scale = { left: 0, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, 50);
    expect(result).toBe(50);
  });

  it("returns correct pixel value for xValue at the minimum of the scale", () => {
    const scale: Scale = { left: 0, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, 0);
    expect(result).toBe(0);
  });

  it("returns correct pixel value for xValue at the maximum of the scale", () => {
    const scale: Scale = { left: 0, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, 100);
    expect(result).toBe(100);
  });

  it("returns undefined if pixelRange is less than or equal to 0", () => {
    const scale: Scale = { left: 100, right: 100, min: 0, max: 100 };
    const result = getPixelForXValue(scale, 50);
    expect(result).toBeUndefined();
  });
});
