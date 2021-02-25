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

import type { Action, Store as ReduxStore, Dispatch as ReduxDispatch } from "redux";

import { State } from "@foxglove-studio/app/reducers";

export type Store = ReduxStore<State, Action<void>>;
export type GetState = () => State;

export type Dispatch<T> = (arg0: T | ((arg0: Dispatch<T>, arg1: GetState) => State)) => void;
