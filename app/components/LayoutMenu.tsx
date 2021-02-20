//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CodeJsonIcon from "@mdi/svg/svg/code-json.svg";
import React, { useState } from "react";

import LayoutIcon from "@foxglove-studio/app/assets/layout.svg";
import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import Flex from "@foxglove-studio/app/components/Flex";
import { WrappedIcon } from "@foxglove-studio/app/components/Icon";
import { openLayoutModal } from "@foxglove-studio/app/components/LayoutModal";
import Menu, { Item } from "@foxglove-studio/app/components/Menu";
import ClearBagCacheMenuItem from "@foxglove-studio/app/components/ClearBagCacheMenuItem";

export default function LayoutMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
      <Flex>
        <WrappedIcon medium fade active={isOpen} tooltip="Config">
          <LayoutIcon />
        </WrappedIcon>
      </Flex>
      <Menu>
        <Item
          icon={<CodeJsonIcon />}
          onClick={() => {
            setIsOpen(false);
            openLayoutModal();
          }}
        >
          Import/export layout
        </Item>
        <ClearBagCacheMenuItem />
      </Menu>
    </ChildToggle>
  );
}
