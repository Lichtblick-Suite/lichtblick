//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ApiCheckerDataProvider from "@foxglove-studio/app/dataProviders/ApiCheckerDataProvider";
import BagDataProvider from "@foxglove-studio/app/dataProviders/BagDataProvider";
import createGetDataProvider from "@foxglove-studio/app/dataProviders/createGetDataProvider";
import IdbCacheWriterDataProvider from "@foxglove-studio/app/dataProviders/IdbCacheWriterDataProvider";
import MeasureDataProvider from "@foxglove-studio/app/dataProviders/MeasureDataProvider";
import RpcDataProviderRemote from "@foxglove-studio/app/dataProviders/RpcDataProviderRemote";
import Rpc from "@foxglove-studio/app/util/Rpc";

const getDataProvider = createGetDataProvider({
  ApiCheckerDataProvider,
  BagDataProvider,
  MeasureDataProvider,
  IdbCacheWriterDataProvider,
});

if (typeof global.postMessage !== "undefined" && !global.onmessage) {
  // @ts-expect-error not yet using TS Worker lib: FG-64
  new RpcDataProviderRemote(new Rpc(global), getDataProvider);
}
