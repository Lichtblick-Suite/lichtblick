//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import { createMemoryHistory } from "history";
import React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";
import { Provider } from "react-redux";

import AppMenu from "@foxglove-studio/app/components/AppMenu";
import createRootReducer from "@foxglove-studio/app/reducers";
import configureStore from "@foxglove-studio/app/store/configureStore.testing";

storiesOf("<AppMenu>", module)
  .addParameters({
    screenshot: {
      delay: 500,
    },
  })
  .add("standard", () => {
    return (
      <div style={{ margin: 30, paddingLeft: 300 }}>
        <DndProvider backend={HTML5Backend}>
          <Provider store={configureStore(createRootReducer(createMemoryHistory()))}>
            <AppMenu defaultIsOpen />
          </Provider>
        </DndProvider>
      </div>
    );
  });
