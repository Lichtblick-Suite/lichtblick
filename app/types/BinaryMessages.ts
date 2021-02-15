//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// All message types supported by Rviz
// http://wiki.ros.org/rviz/DisplayTypes

// @ts-expect-error: flow import has 'any' type
import { ArrayView } from "@foxglove-studio/app/util/binaryObjects";

export type BinaryTime = Readonly<{
  sec(): number;
  nsec(): number;
}>;

export type BinaryHeader = Readonly<{
  seq(): number;
  stamp(): BinaryTime;
  frame_id(): string;
}>;

export type BinaryPoint = {
  x(): number;
  y(): number;
  z(): number;
};

export type BinaryStampedMessage = Readonly<{
  header(): BinaryHeader;
}>;

type Orientation = {
  x(): number;
  y(): number;
  z(): number;
  w(): number;
};

export type BinaryPose = Readonly<{
  position(): BinaryPoint;
  orientation(): Orientation;
}>;

export type BinaryPose2D = Readonly<{
  x(): number;
  y(): number;
  theta(): number;
}>;

export type BinaryPoseStamped = Readonly<BinaryStampedMessage & { pose(): BinaryPose }>;

export type BinaryPolygon = Readonly<{ points(): ArrayView<BinaryPoint> }>;
export type BinaryPolygonStamped = Readonly<BinaryStampedMessage & { polygon(): BinaryPolygon }>;

export type BinaryColorRgba = Readonly<{
  r(): number;
  g(): number;
  b(): number;
  a(): number;
}>;

export type BinaryMarker = Readonly<{
  header(): BinaryHeader;
  ns(): string;
  id(): number;
  type(): number;
  action(): 0 | 1 | 2 | 3;
  pose(): BinaryPose;
  scale(): BinaryPoint;
  color(): BinaryColorRgba;
  // Reverse-wrapped "markers" created in the 3D panel sometimes have no lifetimes :(((
  lifetime(): BinaryTime | null | undefined;
  frame_locked(): boolean;
  points(): ArrayView<BinaryPoint>;
  colors(): ArrayView<BinaryColorRgba>;
  text(): string;
  mesh_resource(): string;
  mesh_use_embedded_materials(): boolean;
}>;

export type BinaryInstancedMarker = Readonly<{
  header(): BinaryHeader;
  ns(): string;
  id(): number;
  type(): 108;
  action(): 0 | 1 | 2 | 3;
  pose(): BinaryPose;
  scale(): BinaryPoint;
  color(): BinaryColorRgba;
  colors(): ArrayView<BinaryColorRgba>;
  points(): ArrayView<BinaryPoint>;
  // Reverse-wrapped "markers" created in the 3D panel sometimes have no lifetimes :(((
  lifetime(): BinaryTime | null | undefined;
  // Fields not provided from marker: frame_locked, text, mesh_resource, mesh_use_embedded_materials
  // Fields not present in marker:
  poses(): ArrayView<BinaryPose>;
  metadataByIndex(): ReadonlyArray<any>;
  closed(): boolean;
}>;

export type BinaryMarkerArray = Readonly<{
  markers(): ArrayView<BinaryMarker>;
}>;

type MapMetaData = Readonly<{
  map_load_time(): BinaryTime;
  resolution(): number;
  width(): number;
  height(): number;
  origin(): BinaryPose;
}>;

export type BinaryOccupancyGrid = Readonly<{
  header(): BinaryHeader;
  info(): MapMetaData;
  data(): Int8Array;
}>;

export type BinaryWebvizMarker = Readonly<
  BinaryMarker & {
    id(): string;
    // overridden type,
    metadata(): any; // JSON
  }
>;

export type BinaryWebvizMarkerArray = Readonly<{
  header(): BinaryHeader;
  markers(): ArrayView<BinaryWebvizMarker>;
}>;

export type BinaryWebvizFutureMarkerArray = Readonly<{
  header(): BinaryHeader;
  allMarkers(): ArrayView<BinaryWebvizMarker>;
}>;
