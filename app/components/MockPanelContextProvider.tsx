//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { ReactNode } from "react";

import PanelContext, { PanelContextType } from "@foxglove-studio/app/components/PanelContext";

type MockProps = Partial<PanelContextType<any>>;
const DEFAULT_MOCK_PANEL_CONTEXT: PanelContextType<any> = {
  type: "foo",
  id: "bar",
  title: "Foo Panel",
  config: {},
  saveConfig: () => {
    // no-op
  },
  updatePanelConfig: () => {
    // no-op
  },
  openSiblingPanel: () => {
    // no-op
  },
  enterFullscreen: () => {
    // no-op
  },
  isHovered: false,
  isFocused: false,
};
function MockPanelContextProvider({
  children,
  ...rest
}: MockProps & {
  children: ReactNode;
}) {
  return (
    <PanelContext.Provider
      value={{
        ...DEFAULT_MOCK_PANEL_CONTEXT,
        ...rest,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export default MockPanelContextProvider;
