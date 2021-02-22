//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { keyBy } from "lodash";
import memoize from "micro-memoize";

import {
  LinkedGlobalVariables,
  LinkedGlobalVariable,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/Interactions/useLinkedGlobalVariables";

export function getTopicWithPath({
  topic,
  markerKeyPath,
}: {
  topic: string;
  markerKeyPath: string[];
}): string {
  return `${topic}.${getPath(markerKeyPath)}`;
}

export function getPath(markerKeyPath: string[]): string {
  return [...markerKeyPath].reverse().join(".");
}

export function getLinkedGlobalVariableKeyByTopicWithPath(
  linkedGlobalVariables: LinkedGlobalVariables,
): {
  [key: string]: LinkedGlobalVariable;
} {
  return keyBy(linkedGlobalVariables, ({ topic, markerKeyPath }) =>
    getTopicWithPath({ topic, markerKeyPath }),
  );
}

const memoizedGetLinkedVariablesKeyByTopicWithPath = memoize(
  getLinkedGlobalVariableKeyByTopicWithPath,
);

export function getLinkedGlobalVariable({
  topic,
  markerKeyPath,
  linkedGlobalVariables,
}: {
  topic: string;
  markerKeyPath: string[];
  linkedGlobalVariables: LinkedGlobalVariables;
}): LinkedGlobalVariable | null | undefined {
  const linkedGlobalVariablesKeyByTopicWithPath = memoizedGetLinkedVariablesKeyByTopicWithPath(
    linkedGlobalVariables,
  );
  const topicWithPath = getTopicWithPath({ topic, markerKeyPath });
  return linkedGlobalVariablesKeyByTopicWithPath[topicWithPath];
}

function getLinkedGlobalVariablesKeyByName(linkedGlobalVariables: LinkedGlobalVariables) {
  return linkedGlobalVariables.reduce((memo, { name, topic, markerKeyPath }) => {
    if (!memo[name]) {
      memo[name] = [];
    }
    memo[name].push({ topic, markerKeyPath, name });
    return memo;
  }, {} as any);
}

export const memoizedGetLinkedGlobalVariablesKeyByName = memoize(getLinkedGlobalVariablesKeyByName);
