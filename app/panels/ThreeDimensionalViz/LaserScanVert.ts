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
export default `
  precision mediump float;

  uniform mat4 projection, view;

  #WITH_POSE

  uniform float pointSize;
  uniform float angle_min;
  uniform float angle_increment;
  uniform float range_min;
  uniform float range_max;
  uniform bool isHitmap;
  uniform vec4 color;

  attribute float index;
  attribute float range;
  attribute float intensity;
  attribute vec4 hitmapColor;

  varying vec4 vColor;

  void main () {
    float angle = angle_min + index * angle_increment;
    vec3 p = applyPose(vec3(range * cos(angle), range * sin(angle), 0));

    gl_Position = projection * view * vec4(p, 1);
    gl_PointSize = pointSize;

    if (range < range_min || range > range_max || intensity == 0.0) {
      gl_PointSize = 0.;
    }
    vColor = isHitmap ? hitmapColor : color;
  }
`;
