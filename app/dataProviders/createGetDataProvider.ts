//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import {
  DataProvider,
  DataProviderConstructor,
  DataProviderDescriptor,
  GetDataProvider,
} from "@foxglove-studio/app/dataProviders/types";

export default function createGetDataProvider(descriptorMap: {
  [name: string]: DataProviderConstructor;
}): GetDataProvider {
  return function getDataProvider(descriptor: DataProviderDescriptor): DataProvider {
    const Provider = descriptorMap[descriptor.name];
    if (!Provider) {
      throw new Error(`Unknown DataProviderDescriptor#name: ${descriptor.name}`);
    }
    return new Provider(descriptor.args, descriptor.children, getDataProvider);
  };
}
