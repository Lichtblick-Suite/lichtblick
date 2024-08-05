// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Immutable } from "@lichtblick/suite";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { isTypedArray } from "@lichtblick/suite-base/types/isTypedArray";

import { MessagePath } from "@foxglove/message-path";

import { filterMatches } from "./filterMatches";

/**
 * Execute the given message path to extract item(s) from the message.
 */
export function simpleGetMessagePathDataItems(
  message: Immutable<MessageEvent>,
  filledInPath: Immutable<MessagePath>,
): unknown[] {
  // We don't care about messages that don't match the topic we're looking for.
  if (message.topic !== filledInPath.topicName) {
    return [];
  }

  const results: unknown[] = [];

  function traverse(value: unknown, pathIndex: number): void {
    const pathPart = filledInPath.messagePath[pathIndex];
    if (pathPart == undefined) {
      results.push(value);
      return;
    }
    if (value == undefined) {
      return;
    }
    switch (pathPart.type) {
      case "slice": {
        if (!Array.isArray(value) && !isTypedArray(value)) {
          return;
        }
        if (typeof pathPart.start === "object" || typeof pathPart.end === "object") {
          throw new Error("Variables in slices are not supported");
        }
        const { start, end } = pathPart;
        for (let i = start; i < value.length && i <= end; i++) {
          traverse(value[i], pathIndex + 1);
        }
        return;
      }
      case "filter":
        if (!filterMatches(pathPart, value)) {
          return undefined;
        }
        traverse(value, pathIndex + 1);
        return;
      case "name":
        if (typeof value !== "object") {
          return undefined;
        }
        traverse((value as Record<string, unknown>)[pathPart.name], pathIndex + 1);
        return;
    }
  }
  traverse(message.message, 0);

  return results;
}
