//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import markerArray from "./markerArray.ts.template";
import twoDimensionalPlot from "./twoDimensionalPlot.ts.template";

export default [
  { name: "2D Plot", description: "Quickly create 2D Plot topics", template: twoDimensionalPlot },
  {
    name: "MarkerArray",
    description: "Basic template for a node that publishes one or more markers",
    template: markerArray,
  },
];
