//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import natsort from "natsort";

const sortFn = natsort({ insensitive: true });

function naturalSort(): typeof sortFn;
function naturalSort(key: string): (a: any, b: any) => number;
function naturalSort(key?: string): typeof sortFn | ((a: any, b: any) => number) {
  return key ? (a: any, b: any) => sortFn(a[key], b[key]) : sortFn;
}

export default naturalSort;
