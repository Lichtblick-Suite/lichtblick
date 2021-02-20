//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { memoize, uniq } from "lodash";
import { Parser, Grammar } from "nearley";

import { RosPath } from "./constants";
// @ts-expect-error grammar.ne files currently imported with any type
import grammar from "./grammar.ne";
import filterMap from "@foxglove-studio/app/filterMap";

const grammarObj = Grammar.fromCompiled(grammar);

const parseRosPath: (path: string) => RosPath | null | undefined = memoize((path: string):
  | RosPath
  | null
  | undefined => {
  // Need to create a new Parser object for every new string to parse (should be cheap).
  const parser = new Parser(grammarObj);
  try {
    return parser.feed(path).results[0];
  } catch (_) {
    return undefined;
  }
});
export default parseRosPath;

export function getTopicsFromPaths(paths: string[]): string[] {
  return uniq(
    filterMap(paths, (path) => {
      const rosPath = parseRosPath(path);
      return rosPath ? rosPath.topicName : undefined;
    }),
  );
}
