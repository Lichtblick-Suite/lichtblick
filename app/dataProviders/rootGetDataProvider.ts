//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ApiCheckerDataProvider, {
  instrumentTreeWithApiCheckerDataProvider,
} from "@foxglove-studio/app/dataProviders/ApiCheckerDataProvider";
import BagDataProvider from "@foxglove-studio/app/dataProviders/BagDataProvider";
import CombinedDataProvider from "@foxglove-studio/app/dataProviders/CombinedDataProvider";
import createGetDataProvider from "@foxglove-studio/app/dataProviders/createGetDataProvider";
import IdbCacheReaderDataProvider from "@foxglove-studio/app/dataProviders/IdbCacheReaderDataProvider";
import MeasureDataProvider, {
  instrumentTreeWithMeasureDataProvider,
} from "@foxglove-studio/app/dataProviders/MeasureDataProvider";
import MemoryCacheDataProvider from "@foxglove-studio/app/dataProviders/MemoryCacheDataProvider";
import ParseMessagesDataProvider from "@foxglove-studio/app/dataProviders/ParseMessagesDataProvider";
import RenameDataProvider from "@foxglove-studio/app/dataProviders/RenameDataProvider";
import RewriteBinaryDataProvider from "@foxglove-studio/app/dataProviders/RewriteBinaryDataProvider";
import { DataProviderDescriptor, DataProvider } from "@foxglove-studio/app/dataProviders/types";
import WorkerDataProvider from "@foxglove-studio/app/dataProviders/WorkerDataProvider";
import { MEASURE_DATA_PROVIDERS_QUERY_KEY } from "@foxglove-studio/app/util/globalConstants";

const getDataProviderBase = createGetDataProvider({
  ApiCheckerDataProvider,
  BagDataProvider,
  CombinedDataProvider,
  IdbCacheReaderDataProvider,
  MeasureDataProvider,
  MemoryCacheDataProvider,
  ParseMessagesDataProvider,
  RenameDataProvider,
  RewriteBinaryDataProvider,
  WorkerDataProvider,
});

export function rootGetDataProvider(tree: DataProviderDescriptor): DataProvider {
  if (new URLSearchParams(location.search).has(MEASURE_DATA_PROVIDERS_QUERY_KEY)) {
    tree = instrumentTreeWithMeasureDataProvider(tree);
  }
  return getDataProviderBase(instrumentTreeWithApiCheckerDataProvider(tree));
}
