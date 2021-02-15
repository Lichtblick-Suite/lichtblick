//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { ActionTypes } from "@foxglove-studio/app/actions";
import { State } from "@foxglove-studio/app/reducers";

export default function hoverValueReducer(state: State, action: ActionTypes): State {
  switch (action.type) {
    case "SET_HOVER_VALUE":
      return { ...state, hoverValue: action.payload.value };
    case "CLEAR_HOVER_VALUE":
      if (state.hoverValue?.componentId === action.payload.componentId) {
        return { ...state, hoverValue: null };
      }
  }
  return state;
}
