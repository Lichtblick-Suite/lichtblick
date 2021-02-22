//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createMemoryHistory } from "history";
import React, { useRef, ReactNode } from "react";
import { Provider } from "react-redux";

import createRootReducer from "@foxglove-studio/app/reducers";
import configureStore from "@foxglove-studio/app/store/configureStore";
import { Store } from "@foxglove-studio/app/types/Store";

type Props = {
  children: ReactNode;
  store?: Store;
};

export default function StoreSetup(props: Props) {
  const storeRef = useRef(props.store || configureStore(createRootReducer(createMemoryHistory())));

  return <Provider store={storeRef.current}>{props.children}</Provider>;
}
