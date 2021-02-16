//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { routerMiddleware, replace } from "connected-react-router";
import { createMemoryHistory } from "history";

// @ts-expect-error: flow import has 'any' type
import updateUrlAndLocalStorageMiddleware from "@foxglove-studio/app/middleware/updateUrlAndLocalStorage";
import createRootReducer from "@foxglove-studio/app/reducers";
import configureStore from "@foxglove-studio/app/store";
import configureTestingStore from "@foxglove-studio/app/store/configureStore.testing";
import history from "@foxglove-studio/app/util/history";
import { Store } from "@foxglove-studio/app/types/Store";

let store: Store | undefined = undefined;
// We have to wrap the actual creation of the global store in a function so that we only run it
// after Cruise/open-source specific "hooks" have been initialized.
function getGlobalStore() {
  if (!store) {
    store = configureStore(createRootReducer(history), [
      routerMiddleware(history),
      updateUrlAndLocalStorageMiddleware,
    ]);
  }
  return store;
}

export function getGlobalStoreForTest(args?: { search?: string; testAuth?: any }) {
  const memoryHistory = createMemoryHistory();
  const testStore = configureTestingStore(
    createRootReducer(memoryHistory, { testAuth: args?.testAuth }),
    [routerMiddleware(memoryHistory), updateUrlAndLocalStorageMiddleware],
    memoryHistory,
  );

  // Attach a helper method to the test store.
  (testStore as any).push = (path: string) => memoryHistory.push(path);

  const search = args?.search;
  if (search) {
    testStore.dispatch(replace(`/${search}`));
  }

  return testStore;
}
export default getGlobalStore;
