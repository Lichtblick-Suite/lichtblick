//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { createStore, applyMiddleware, Reducer } from "redux";
import thunk from "redux-thunk";

import { Store } from "@foxglove-studio/app/types/Store";

const configureStore = (reducer: Reducer<any, any>, middleware: Array<any> = []): Store => {
  let enhancer = applyMiddleware(thunk, ...middleware);
  if (process.env.NODE_ENV !== "production") {
    // Unclear whether this require can be safely moved to an import
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { composeWithDevTools } = require("redux-devtools-extension");
    enhancer = composeWithDevTools(enhancer);
  }
  return createStore(reducer, undefined, enhancer);
};

export default configureStore;
