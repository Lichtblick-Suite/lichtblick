//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { connectRouter } from "connected-react-router";

import { ActionTypes } from "@foxglove-studio/app/actions";
// @ts-expect-error
import { ros_lib_dts } from "@foxglove-studio/app/players/UserNodePlayer/nodeTransformerWorker/typescript/ros";
import commenting from "@foxglove-studio/app/reducers/commenting";
import hoverValue from "@foxglove-studio/app/reducers/hoverValue";
import layoutHistory, {
  LayoutHistory,
  initialLayoutHistoryState,
} from "@foxglove-studio/app/reducers/layoutHistory";
import mosaic from "@foxglove-studio/app/reducers/mosaic";
import panels, {
  PanelsState,
  getInitialPersistedStateAndMaybeUpdateLocalStorageAndURL,
} from "@foxglove-studio/app/reducers/panels";
import recentLayouts, {
  maybeStoreNewRecentLayout,
} from "@foxglove-studio/app/reducers/recentLayouts";
import tests from "@foxglove-studio/app/reducers/tests";
import userNodes, { UserNodeDiagnostics } from "@foxglove-studio/app/reducers/userNodes";
import { Auth as AuthState } from "@foxglove-studio/app/types/Auth";
import { HoverValue } from "@foxglove-studio/app/types/hoverValue";
import { MosaicKey, SetFetchedLayoutPayload } from "@foxglove-studio/app/types/panels";
import { Dispatch, GetState } from "@foxglove-studio/app/types/Store";

const getReducers = (history: any) => [
  (state: State) => ({ ...state, router: connectRouter(history)() }),
  panels,
  mosaic,
  hoverValue,
  userNodes,
  layoutHistory,
  recentLayouts,
  commenting,
  ...(process.env.NODE_ENV === "test" ? [tests] : []),
];

export type PersistedState = {
  panels: PanelsState;
  fetchedLayout: SetFetchedLayoutPayload;
  search?: string;
};

export type Dispatcher<T> = (dispatch: Dispatch<T>, getState: GetState) => void;

export type Comment = {
  id: string;
  authorId: string;
  body: string;
  metadata: {
    [key: string]: any;
  };
  attachments: { url: string }[];
};
export type State = {
  persistedState: PersistedState;
  mosaic: { mosaicId: string; selectedPanelIds: MosaicKey[] };
  auth: AuthState;
  hoverValue: HoverValue | null | undefined;
  userNodes: { userNodeDiagnostics: UserNodeDiagnostics; rosLib: string };
  router: { location: { pathname: string; search: string } };
  layoutHistory: LayoutHistory;
  commenting: {
    fetchedCommentsBase: Comment[];
    fetchedCommentsFeature: Comment[];
    sourceToShow: string;
  };
};

export type Store = { dispatch: Dispatch<unknown>; getState: () => State };

// Fix the type definitions for connected-react-router
// The connectRouter function allows for omitting state and action
declare module "connected-react-router" {
  export function connectRouter(
    history: History,
  ): (state?: RouterState, action?: LocationChangeAction) => RouterState;
}

export default function createRootReducer(history: any, args?: { testAuth?: any }) {
  const persistedState = getInitialPersistedStateAndMaybeUpdateLocalStorageAndURL(history);
  maybeStoreNewRecentLayout(persistedState);
  const initialState: State = {
    persistedState,
    mosaic: { mosaicId: "", selectedPanelIds: [] },
    auth: Object.freeze(args?.testAuth || { username: undefined }),
    hoverValue: null,
    userNodes: {
      userNodeDiagnostics: {
        diagnostics: [],
        logs: [],
      },
      rosLib: ros_lib_dts,
    },
    router: connectRouter(history)(),
    layoutHistory: initialLayoutHistoryState,
    commenting: { fetchedCommentsBase: [], fetchedCommentsFeature: [], sourceToShow: "Both" },
  };
  return (state: State, action: ActionTypes): State => {
    const oldPersistedState: PersistedState | null | undefined = state?.persistedState;
    const reducers: Array<
      (arg0: State, arg1: ActionTypes, arg2: PersistedState | null | undefined) => State
    > = getReducers(history) as any;
    return reducers.reduce(
      (builtState, reducer) => reducer(builtState, action, oldPersistedState),
      {
        ...initialState,
        ...state,
      },
    );
  };
}
