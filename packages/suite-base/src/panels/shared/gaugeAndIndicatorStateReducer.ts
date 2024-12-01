// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import * as _ from "lodash-es";

import { parseMessagePath } from "@lichtblick/message-path";
import { simpleGetMessagePathDataItems } from "@lichtblick/suite-base/components/MessagePathSyntax/simpleGetMessagePathDataItems";
import {
  GaugeAndIndicatorState,
  GaugeAndIndicatorAction,
} from "@lichtblick/suite-base/panels/types";

export function getSingleDataItem(results: unknown[]): unknown {
  if (results.length <= 1) {
    return results[0];
  }
  throw new Error("Message path produced multiple results");
}

export function stateReducer(
  state: GaugeAndIndicatorState,
  action: GaugeAndIndicatorAction,
): GaugeAndIndicatorState {
  try {
    switch (action.type) {
      case "frame": {
        if (state.pathParseError != undefined) {
          return { ...state, latestMessage: _.last(action.messages), error: undefined };
        }
        if (!state.parsedPath) {
          return { ...state, error: undefined };
        }

        let latestMatchingQueriedData = state.latestMatchingQueriedData;
        let latestMessage = state.latestMessage;
        for (const message of action.messages) {
          if (message.topic !== state.parsedPath.topicName) {
            continue;
          }

          const data = getSingleDataItem(simpleGetMessagePathDataItems(message, state.parsedPath));
          if (data != undefined) {
            latestMatchingQueriedData = data;
            latestMessage = message;
          }
        }

        return { ...state, latestMessage, latestMatchingQueriedData, error: undefined };
      }
      case "path": {
        const newPath = parseMessagePath(action.path);
        let pathParseError: string | undefined;
        if (
          newPath?.messagePath.some(
            (part) =>
              (part.type === "filter" && typeof part.value === "object") ||
              (part.type === "slice" &&
                (typeof part.start === "object" || typeof part.end === "object")),
          ) === true
        ) {
          pathParseError = "Message paths using variables are not currently supported";
        }
        let latestMatchingQueriedData: unknown;
        let error: Error | undefined;
        try {
          latestMatchingQueriedData =
            newPath && pathParseError == undefined && state.latestMessage
              ? getSingleDataItem(simpleGetMessagePathDataItems(state.latestMessage, newPath))
              : undefined;
        } catch (err: unknown) {
          error = err as Error;
        }
        return {
          ...state,
          error,
          latestMatchingQueriedData,
          parsedPath: newPath,
          path: action.path,
          pathParseError,
        };
      }
      case "seek":
        return {
          ...state,
          latestMessage: undefined,
          latestMatchingQueriedData: undefined,
          error: undefined,
        };
    }
  } catch (error) {
    return { ...state, latestMatchingQueriedData: undefined, error };
  }
}
