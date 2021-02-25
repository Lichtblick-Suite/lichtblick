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

// Based on http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
// TODO(JP): See if there is an equivalent in glmatrix, and otherwise contribute this.
export default function quaternionToEuler({
  x,
  y,
  z,
  w,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
}) {
  let heading: number | undefined;
  let attitude: number = 0;
  let bank: number = 0;
  const test = x * y + z * w;
  if (test > 0.499) {
    // singularity at north pole
    heading = 2 * Math.atan2(x, w);
    attitude = Math.PI / 2;
    bank = 0;
  }
  if (test < -0.499) {
    // singularity at south pole
    heading = -2 * Math.atan2(x, w);
    attitude = -Math.PI / 2;
    bank = 0;
  }
  if (!heading || isNaN(heading)) {
    const sqx = x * x;
    const sqy = y * y;
    const sqz = z * z;
    heading = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz); // Heading
    attitude = Math.asin(2 * test); // attitude
    bank = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz); // bank
  }

  return {
    x: bank,
    y: heading,
    z: attitude,
  };
}
