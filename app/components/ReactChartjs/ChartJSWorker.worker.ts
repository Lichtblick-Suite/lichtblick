//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ChartJSWorker from "./ChartJSWorker";
import Rpc from "@foxglove-studio/app/util/Rpc";
import { inWebWorker } from "@foxglove-studio/app/util/workers";

if (inWebWorker()) {
  // @ts-expect-error not yet using TS Worker lib: FG-64
  new ChartJSWorker(new Rpc(global));
}
