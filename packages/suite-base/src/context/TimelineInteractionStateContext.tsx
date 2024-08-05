// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Immutable } from "@lichtblick/suite";
import { TimelinePositionedEvent } from "@lichtblick/suite-base/context/EventsContext";
import type { HoverValue } from "@lichtblick/suite-base/types/hoverValue";
import { createContext, useCallback } from "react";
import { StoreApi, useStore } from "zustand";

/**
 * Represents the global bounds to which synced plots conform, including the id of the
 * component that set those bounds.
 */
export type SyncBounds = {
  min: number;
  max: number;
  sourceId: string;
  userInteraction: boolean;
};

/**
 * The TimelineInteractionStateStore manages state related to dynamic user interactions with data in the app.
 * Things like the hovered time value and global bounds for plots are managed here.
 */
export type TimelineInteractionStateStore = Immutable<{
  /** The events overlapping the current hover time, if any. */
  eventsAtHoverValue: Record<string, TimelinePositionedEvent>;

  /** Shared time bounds for synced plots, if any. */
  globalBounds: undefined | SyncBounds;

  /** The event directly hovered over by the user, if any. */
  hoveredEvent: undefined | TimelinePositionedEvent;

  /** The point in time hovered over by the user. */
  hoverValue: undefined | HoverValue;

  /** Clears the current hover value. */
  clearHoverValue: (componentId: string) => void;

  /** Sets the events overlapping the current hover time. */
  setEventsAtHoverValue: (events: TimelinePositionedEvent[]) => void;

  /** Sets new global bounds. */
  setGlobalBounds: (
    newBounds:
      | undefined
      | SyncBounds
      | ((oldValue: undefined | SyncBounds) => undefined | SyncBounds),
  ) => void;

  /** Sets or clears the directly hovered event. */
  setHoveredEvent: (hoveredEvent: undefined | TimelinePositionedEvent) => void;

  /** Sets the new hover value. */
  setHoverValue: (value: HoverValue) => void;
}>;

export const TimelineInteractionStateContext = createContext<
  undefined | StoreApi<TimelineInteractionStateStore>
>(undefined);
const selectClearHoverValue = (store: TimelineInteractionStateStore) => store.clearHoverValue;

export function useClearHoverValue(): TimelineInteractionStateStore["clearHoverValue"] {
  return useTimelineInteractionState(selectClearHoverValue);
}

const selectSetHoverValue = (store: TimelineInteractionStateStore) => {
  return store.setHoverValue;
};

export function useSetHoverValue(): TimelineInteractionStateStore["setHoverValue"] {
  return useTimelineInteractionState(selectSetHoverValue);
}

const undefinedSelector = () => undefined;

/**
 * Select the current hover value.
 *
 * By default this hook will return the latest hover value regardless of origin. Use options to
 * control when hover value updates cause the hook to return the updated value.
 *
 * @param componentId allow updates from hover values to those matching this componentId. If undefined, any component's hover values are returned.
 * @param disableUpdates disable any updates regardless of origin. If set the hook will not update with hover values even if other options would cause a match.
 * @param isPlaybackSeconds allow updates from hover values for PLAYBACK_SECONDS
 */
export function useHoverValue(opt?: {
  componentId?: string;
  disableUpdates?: boolean;
  isPlaybackSeconds?: boolean;
}): HoverValue | undefined {
  const enabled = opt?.disableUpdates !== true;
  const componentId = opt?.componentId;
  const isPlaybackSeconds = opt?.isPlaybackSeconds ?? false;

  const selector = useCallback(
    (store: TimelineInteractionStateStore) => {
      if (store.hoverValue == undefined) {
        return undefined;
      }
      if (store.hoverValue.type === "PLAYBACK_SECONDS" && isPlaybackSeconds) {
        // Always show playback-time hover values for timestamp-based charts.
        return store.hoverValue;
      }
      // Otherwise only show hover bars when hovering over the component that set the hover value
      return componentId == undefined || store.hoverValue.componentId === componentId
        ? store.hoverValue
        : undefined;
    },
    [componentId, isPlaybackSeconds],
  );

  return useTimelineInteractionState(enabled ? selector : undefinedSelector);
}

/**
 * This hook wraps all access to the interaction state store. Pass selectors
 * to access parts of the store.
 */
export function useTimelineInteractionState<T>(
  selector: (store: TimelineInteractionStateStore) => T,
): T {
  const context = useGuaranteedContext(TimelineInteractionStateContext);
  return useStore(context, selector);
}
