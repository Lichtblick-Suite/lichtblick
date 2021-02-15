//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import type { Action, Store as ReduxStore, Dispatch as ReduxDispatch } from "redux";

import { State } from "@foxglove-studio/app/reducers";

export type Store = ReduxStore<State, Action<void>>;
export type GetState = () => State;

export type Dispatch<T> = (arg0: T | ((arg0: Dispatch<T>, arg1: GetState) => State)) => void;
