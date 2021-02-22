//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { setLinkedGlobalVariables } from "@foxglove-studio/app/actions/panels";

export type LinkedGlobalVariable = {
  topic: string;
  markerKeyPath: string[];
  name: string;
};

export type LinkedGlobalVariables = LinkedGlobalVariable[];

export default function useLinkedGlobalVariables(): {
  linkedGlobalVariables: LinkedGlobalVariables;
  setLinkedGlobalVariables: (arg0: LinkedGlobalVariables) => void;
} {
  const linkedGlobalVariables = useSelector(
    (state: any) => state.persistedState.panels.linkedGlobalVariables,
  );
  const dispatch = useDispatch();
  return {
    linkedGlobalVariables,
    ...bindActionCreators({ setLinkedGlobalVariables }, dispatch),
  };
}
