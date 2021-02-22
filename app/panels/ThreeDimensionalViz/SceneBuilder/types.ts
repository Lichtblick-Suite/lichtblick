import { $ReadOnly } from "utility-types";

//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Frame } from "@foxglove-studio/app/players/types";
import { Color, Pose } from "@foxglove-studio/app/types/Messages";

export type SkipTransformSpec = $ReadOnly<{ frameId: string; sourceTopic: string }>;

export type ThreeDimensionalVizHooks = $ReadOnly<{
  getSelectionState: (arg0: { [key: string]: any }) => any; // arg is globalVariables
  getTopicsToRender: (arg0: any, arg1: any) => Set<string>; // args are selection states
  skipTransformFrame: SkipTransformSpec | null | undefined;
  getMarkerColor: (arg0: string, arg1: Color) => Color;
  getOccupancyGridValues: (arg0: string) => [number, string]; // arg is topic, return value is [alpha, map].
  getFlattenedPose: (arg0: Frame) => Pose | null | undefined;
  getSyntheticArrowMarkerColor: (arg0: string) => Color; // arg is topic
  consumeBobject: (arg0: string, arg1: string, arg2: any, arg3: any, arg4: any) => void; // topic, datatype, message, consumeFns, misc
  addMarkerToCollector: (arg0: any, arg1: any) => boolean; // marker collector, marker
}>;
