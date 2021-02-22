//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React from "react";

import Internals from "@foxglove-studio/app/panels/Internals";
import SubscribeToList from "@foxglove-studio/app/panels/SubscribeToList";
import PanelSetup from "@foxglove-studio/app/stories/PanelSetup";

storiesOf("<Internals>", module)
  .add("default", () => {
    return (
      <PanelSetup
        fixture={{
          topics: [
            { name: "/my/topic", datatype: "my_datatype" },
            { name: "/another/topic", datatype: "my_datatype" },
          ],
          frame: {},
        }}
      >
        <Internals />
        <div style={{ display: "none" }}>
          <SubscribeToList config={{ topics: "/my/topic\n/another/topic" }} />
        </div>
      </PanelSetup>
    );
  })
  .add("click record", () => {
    return (
      <PanelSetup
        fixture={{
          topics: [],
          frame: {},
        }}
        onMount={(el: any) => {
          // $FlowFixMe - just crash if it's not there
          el.querySelector("button").click();
        }}
      >
        <Internals />
      </PanelSetup>
    );
  });
