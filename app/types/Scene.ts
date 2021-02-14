//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import {
  Pose,
  ArrowMarker,
  CubeMarker,
  SphereMarker,
  CylinderMarker,
  LineStripMarker,
  LineListMarker,
  CubeListMarker,
  SphereListMarker,
  PointsMarker,
  TextMarker,
  TriangleListMarker,
  FilledPolygonMarker, // non-default types
  OccupancyGridMessage,
  PointCloud,
  LaserScan,
  InstancedLineListMarker,
  OverlayIconMarker,
} from "@foxglove-studio/app/types/Messages";
// @ts-expect-error
import Bounds from "@foxglove-studio/app/util/Bounds";

export type Scene = {
  flattenedZHeightPose: Pose | null | undefined;
  bounds: Bounds;
};

export interface MarkerCollector {
  arrow(arg0: ArrowMarker): any;
  cube(arg0: CubeMarker): any;
  cubeList(arg0: CubeListMarker): any;
  sphere(arg0: SphereMarker): any;
  sphereList(arg0: SphereListMarker): any;
  cylinder(arg0: CylinderMarker): any;
  poseMarker(arg0: ArrowMarker): any;
  lineStrip(arg0: LineStripMarker): any;
  lineList(arg0: LineListMarker): any;
  points(arg0: PointsMarker): any;
  text(arg0: TextMarker): any;
  triangleList(arg0: TriangleListMarker): any;
  grid(arg0: OccupancyGridMessage): any;
  pointcloud(arg0: PointCloud): any;
  laserScan(arg0: LaserScan): any;
  linedConvexHull(arg0: LineListMarker | LineStripMarker): any;
  filledPolygon(arg0: FilledPolygonMarker): any;
  instancedLineList(arg0: InstancedLineListMarker): any;
  overlayIcon(arg0: OverlayIconMarker): any;
}

export interface MarkerProvider {
  renderMarkers(add: MarkerCollector): void;
}
