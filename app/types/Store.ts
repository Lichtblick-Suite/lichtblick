//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Action, Store as ReduxStore, Dispatch as ReduxDispatch } from "redux";

// @ts-expect-error: flow import has 'any' type
import { ActionTypes } from "@foxglove-studio/app/actions";
// @ts-expect-error: flow import has 'any' type
import { State } from "@foxglove-studio/app/reducers";

export type Store = ReduxStore<State, Action<void>>;
export type GetState = () => State;

export type Dispatch = (
  arg0: ActionTypes | ((arg0: Dispatch, arg1: GetState) => State),
) => ReduxDispatch<Action<void>>;
