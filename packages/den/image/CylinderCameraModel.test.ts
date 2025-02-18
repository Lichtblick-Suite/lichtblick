// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CameraInfo } from "./CameraInfo";
import { CylinderCameraModel } from "./CylinderCameraModel";

function makeCameraInfo(
  fx: number,
  fy: number,
  cx: number,
  cy: number,
  cut_angle: number,
): CameraInfo {
  return {
    D: [0, 0, 0, 0, 0, cut_angle],
    // prettier-ignore
    K: [
      fx, 0, cx,
      0, fy, cy,
      0, 0, 1,
    ],
    R: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    // prettier-ignore
    P: [
      fx, 0, cx, 0,
      0, fy, cy, 0,
      0,  0,  1, 0,
    ],
    width: 2 * cx,
    height: 2 * cy,
    binning_x: 0,
    binning_y: 0,
    distortion_model: "cylindrical",
    roi: { x_offset: 0, y_offset: 0, do_rectify: false, height: 0, width: 0 },
  };
}

describe("CylinderCameraModel", () => {
  it("projectPixelTo3dRay", () => {
    const model = new CylinderCameraModel(
      makeCameraInfo(100.0, 100.0, 150.0, 150.0, 0.3490658503988659),
    );
    const point = { x: 0, y: 0, z: 0 };

    model.projectPixelTo3dRay(point, { x: 150, y: 150 });
    expect(point).toEqual({ x: 0, y: 0, z: 1 });

    model.projectPixelTo3dRay(point, { x: 225.71869, y: 217.82079 });
    expect(point).toEqual({
      x: expect.closeTo(0.568472300538615),
      y: expect.closeTo(0.561295395936576),
      z: expect.closeTo(0.601487092148067),
    });
    model.projectPixelTo3dRay(point, { x: 74.2813, y: 217.82079 });
    expect(point).toEqual({
      x: expect.closeTo(-0.568472300538615),
      y: expect.closeTo(0.561295395936576),
      z: expect.closeTo(0.601487092148067),
    });
    model.projectPixelTo3dRay(point, { x: 225.71869, y: 82.179214 });
    expect(point).toEqual({
      x: expect.closeTo(0.568472300538615),
      y: expect.closeTo(-0.561295395936576),
      z: expect.closeTo(0.601487092148067),
    });
    model.projectPixelTo3dRay(point, { x: 74.2813, y: 82.179214 });
    expect(point).toEqual({
      x: expect.closeTo(-0.568472300538615),
      y: expect.closeTo(-0.561295395936576),
      z: expect.closeTo(0.601487092148067),
    });
    model.projectPixelTo3dRay(point, { x: 297.1128, y: 150.0 });
    expect(point).toEqual({
      x: expect.closeTo(0.995037222617926),
      y: expect.closeTo(0),
      z: expect.closeTo(0.09950339494109685),
    });
    model.projectPixelTo3dRay(point, { x: 2.8872223, y: 150.0 });
    expect(point).toEqual({
      x: expect.closeTo(-0.9950372004286443),
      y: expect.closeTo(0),
      z: expect.closeTo(0.09950361683439482),
    });
    model.projectPixelTo3dRay(point, { x: 150.0, y: 329.8874 });
    expect(point).toEqual({
      x: expect.closeTo(0),
      y: expect.closeTo(0.874028213322798),
      z: expect.closeTo(0.4858751715366379),
    });
    model.projectPixelTo3dRay(point, { x: 150.0, y: -29.887375 });
    expect(point).toEqual({
      x: expect.closeTo(0),
      y: expect.closeTo(-0.874028213322798),
      z: expect.closeTo(0.4858751715366379),
    });
  });
});
