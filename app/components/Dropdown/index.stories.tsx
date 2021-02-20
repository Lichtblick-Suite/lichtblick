//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import CogIcon from "@mdi/svg/svg/cog.svg";
import { storiesOf } from "@storybook/react";
import React, { useState } from "react";

import Dropdown from "@foxglove-studio/app/components/Dropdown";
import Icon from "@foxglove-studio/app/components/Icon";

function Example({
  position = "below",
  showCustomBtn = false,
}: {
  position?: "left" | "right" | "below";
  showCustomBtn?: boolean;
}) {
  const [value, setValue] = useState("foo");
  const text = value === "foo" ? "one" : "";
  const additionalProps = showCustomBtn
    ? {
        toggleComponent: (
          <Icon fade>
            <CogIcon />
          </Icon>
        ),
      }
    : {};
  return (
    <div style={{ margin: 20 }}>
      <Dropdown
        position={position}
        text={text}
        value={value}
        onChange={setValue}
        {...additionalProps}
      >
        <span>one</span>
        <span>two</span>
        <hr />
        <span>three</span>
      </Dropdown>
    </div>
  );
}
storiesOf("<Dropdown>", module)
  .add("position_below", () => <Example position="below" />)
  .add("position_left", () => <Example position="left" />)
  .add("position_right", () => <Example position="right" />)
  .add("with custom button", () => <Example showCustomBtn />);
