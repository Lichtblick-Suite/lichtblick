//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import yaml from "js-yaml";

export default {
  parse<T>(str: string): T {
    // @ts-expect-error assuming that yaml.load will load type T is sloppy
    // There should be checking on the result with a schema to ensure object is actually T
    return yaml.load(str);
  },
  stringify(obj: any, options: any = {}): string {
    // do not quote 'y' and 'yes' for older yaml versions
    return yaml
      .dump(obj, { noCompatMode: true, ...options })
      .replace(/^- - /gm, "\n- - ")
      .trim();
  },
};
