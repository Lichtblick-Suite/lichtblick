//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { storiesOf } from "@storybook/react";
import React, { ReactInstance } from "react";
import ReactDOM from "react-dom";

import Menu, { Item, SubMenu } from "@foxglove-studio/app/components/Menu";

storiesOf("<Menu>", module)
  .add("standard", () => {
    return (
      <div style={{ margin: 20 }}>
        <Menu>
          <div>howdy</div>
          <div>how are you?</div>
        </Menu>
      </div>
    );
  })
  .add("nested", () => {
    function openSubMenu(component: SubMenu | null) {
      if (component) {
        // @ts-expect-error figure out what to actually do here
        // eslint-disable-next-line react/no-find-dom-node
        ReactDOM.findDOMNode(component).querySelector("svg").parentElement.click();
      }
    }
    return (
      <div style={{ margin: 20, width: 150 }}>
        <Menu>
          <Item>howdy</Item>
          <SubMenu text="sub 1" ref={openSubMenu}>
            <Item>Foo</Item>
            <Item>bar</Item>
            <SubMenu text="sub 2" ref={openSubMenu}>
              <Item>baz</Item>
              <Item>blah</Item>
              <SubMenu text="sub 3" ref={openSubMenu}>
                <Item>even more</Item>
              </SubMenu>
            </SubMenu>
          </SubMenu>
          <Item>Some other item</Item>
        </Menu>
      </div>
    );
  });
