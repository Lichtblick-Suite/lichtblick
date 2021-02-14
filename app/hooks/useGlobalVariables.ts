//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

// @ts-expect-error
import { setGlobalVariables, overwriteGlobalVariables } from "@foxglove-studio/app/actions/panels";
// @ts-expect-error
import { State } from "@foxglove-studio/app/reducers";

export type GlobalVariables = {
  [key: string]: any;
};

export default function useGlobalVariables(): {
  globalVariables: GlobalVariables;
  setGlobalVariables: (arg0: GlobalVariables) => void;
  overwriteGlobalVariables: (arg0: GlobalVariables) => void;
} {
  const globalVariables = useSelector(
    (state: State) => state.persistedState.panels.globalVariables,
  );
  const dispatch = useDispatch();
  const actionCreators = useMemo(
    () => bindActionCreators({ setGlobalVariables, overwriteGlobalVariables }, dispatch),
    [dispatch],
  );
  return { ...actionCreators, globalVariables };
}
