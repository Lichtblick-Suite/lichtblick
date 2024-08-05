// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { TimelinePositionedEvent } from "@lichtblick/suite-base/context/EventsContext";
import {
  TimelineInteractionStateContext,
  TimelineInteractionStateStore,
  SyncBounds,
} from "@lichtblick/suite-base/context/TimelineInteractionStateContext";
import { HoverValue } from "@lichtblick/suite-base/types/hoverValue";
import * as _ from "lodash-es";
import { ReactNode, useState } from "react";
import { createStore, StoreApi } from "zustand";

function createTimelineInteractionStateStore(): StoreApi<TimelineInteractionStateStore> {
  return createStore((set) => {
    return {
      eventsAtHoverValue: {},
      globalBounds: undefined,
      hoveredEvent: undefined,
      hoverValue: undefined,

      clearHoverValue: (componentId: string) => {
        set((store) => ({
          hoverValue: store.hoverValue?.componentId === componentId ? undefined : store.hoverValue,
        }));
      },

      setEventsAtHoverValue: (eventsAtHoverValue: TimelinePositionedEvent[]) => {
        set({ eventsAtHoverValue: _.keyBy(eventsAtHoverValue, (event) => event.event.id) });
      },

      setGlobalBounds: (
        newBounds:
          | undefined
          | SyncBounds
          | ((oldValue: undefined | SyncBounds) => undefined | SyncBounds),
      ) => {
        if (typeof newBounds === "function") {
          set((store) => ({ globalBounds: newBounds(store.globalBounds) }));
        } else {
          set({ globalBounds: newBounds });
        }
      },

      setHoveredEvent: (hoveredEvent: undefined | TimelinePositionedEvent) => {
        if (hoveredEvent) {
          set({
            hoveredEvent,
            hoverValue: {
              componentId: `event_${hoveredEvent.event.id}`,
              type: "PLAYBACK_SECONDS",
              value: hoveredEvent.secondsSinceStart,
            },
          });
        } else {
          set({ hoveredEvent: undefined, hoverValue: undefined });
        }
      },

      setHoverValue: (newValue: HoverValue) => {
        set((store) => ({
          hoverValue: _.isEqual(newValue, store.hoverValue) ? store.hoverValue : newValue,
        }));
      },
    };
  });
}

export default function TimelineInteractionStateProvider({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const [store] = useState(createTimelineInteractionStateStore());

  return (
    <TimelineInteractionStateContext.Provider value={store}>
      {children}
    </TimelineInteractionStateContext.Provider>
  );
}
