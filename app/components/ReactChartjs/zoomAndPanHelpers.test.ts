// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { inBounds, ScaleBounds } from "./zoomAndPanHelpers";

const getBounds = (minAlongAxis: number, maxAlongAxis: number): ScaleBounds => ({
  id: "foo",
  min: 10,
  max: 20,
  minAlongAxis,
  maxAlongAxis,
  axes: "xAxes",
});

describe("inBounds", () => {
  it("returns false if the bounds are not present", () => {
    expect(inBounds(10, undefined)).toBe(false);
  });

  it("returns true when the value is equal to one of the bounds", () => {
    expect(inBounds(10, getBounds(10, 20))).toBe(true);
    expect(inBounds(10, getBounds(20, 10))).toBe(true);
  });

  it("returns true when the value is within the bounds", () => {
    expect(inBounds(15, getBounds(10, 20))).toBe(true);
    expect(inBounds(15, getBounds(20, 10))).toBe(true);
  });

  it("returns false when the value is outside the bounds", () => {
    expect(inBounds(25, getBounds(10, 20))).toBe(false);
    expect(inBounds(25, getBounds(20, 10))).toBe(false);
  });
});
