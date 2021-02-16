//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { MutablePose, Orientation, Point } from "@foxglove-studio/app/types/Messages";

// contains backing classes for point, orientation, and pose
// because we create them a _lot_
class PointClass {
  x: number = 0;
  y: number = 0;
  z: number = 0;

  static empty() {
    const point = new PointClass();
    point.x = 0;
    point.y = 0;
    point.z = 0;
    return point;
  }
}

class OrientationClass {
  x: number = 0;
  y: number = 0;
  z: number = 0;
  w: number = 0;

  static empty() {
    // $FlowFixMe: Classes are inexact in flow.
    const orientation = new OrientationClass();
    orientation.x = 0;
    orientation.y = 0;
    orientation.z = 0;
    orientation.w = 1;
    return orientation;
  }
}

class PoseClass {
  position: Point = { x: 0, y: 0, z: 0 };
  orientation: Orientation = { x: 0, y: 0, z: 0, w: 0 };
}

// create a new empty pose object
export function emptyPose(): MutablePose {
  // $FlowFixMe: Classes are inexact in flow.
  const pose = new PoseClass();
  pose.position = PointClass.empty();
  pose.orientation = OrientationClass.empty();
  return pose;
}
