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

import { routerMiddleware, onLocationChanged, LOCATION_CHANGE } from "connected-react-router";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import type { ThunkMiddleware } from "redux-thunk";

import { ActionTypes } from "@foxglove-studio/app/actions";
import { State } from "@foxglove-studio/app/reducers";
import { Store } from "@foxglove-studio/app/types/Store";

const configureStore = (
  reducer: (arg0: any, arg1: any) => any,
  middleware: Array<any> = [],
  history?: any,
  preloadedState?: State,
) => {
  const store = createStore(
    reducer,
    preloadedState,
    applyMiddleware(
      thunk as ThunkMiddleware<Store, ActionTypes>,
      routerMiddleware(history),
      ...middleware,
    ),
  );

  // if there is no history, initialize the router state
  // to a blank history entry so tests relying on it being present don't break
  if (history === undefined) {
    store.dispatch({
      type: LOCATION_CHANGE,
      payload: {
        location: {
          pathname: "",
          search: "",
        },
        action: "POP",
      },
    });
    return store;
  }

  // if there is a history, connect it to the store
  // we need to wire this manually here
  // ConnectedRouter wires it in an actual app
  const updateHistoryInStore = () => {
    store.dispatch(onLocationChanged(history.location, history.action));
  };

  history.listen(updateHistoryInStore);

  // push the initial history state into the store
  updateHistoryInStore();

  return store;
};

export default configureStore;
