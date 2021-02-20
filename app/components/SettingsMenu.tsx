//
//  Copyright (c) 2020-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import CogIcon from "@mdi/svg/svg/cog.svg";
import HelpCircleOutlineIcon from "@mdi/svg/svg/help-circle-outline.svg";
import ScriptTextOutlineIcon from "@mdi/svg/svg/script-text-outline.svg";
import React, { useState } from "react";
import styled from "styled-components";

import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import Flex from "@foxglove-studio/app/components/Flex";
import { WrappedIcon } from "@foxglove-studio/app/components/Icon";
import Menu, { Item } from "@foxglove-studio/app/components/Menu";
import { colors } from "@foxglove-studio/app/util/sharedStyleConstants";
import { showHelpModalOpenSource } from "@foxglove-studio/app/util/showHelpModalOpenSource";

export const SItem = styled(Item)`
  color: ${colors.LIGHT} !important;

  svg {
    opacity: 0.6;
  }

  &:hover svg {
    opacity: 0.8;
  }
`;

const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ChildToggle position="below" onToggle={() => setIsOpen(!isOpen)} isOpen={isOpen}>
      <Flex center>
        <WrappedIcon tooltip="Settings" medium fade active={isOpen}>
          <CogIcon />
        </WrappedIcon>
      </Flex>
      <Menu style={{ width: "240px", padding: "8px 0px" }}>
        <SItem icon={<HelpCircleOutlineIcon />} onClick={showHelpModalOpenSource as any}>
          Help and resources
        </SItem>
        <SItem
          icon={<ScriptTextOutlineIcon />}
          onClick={() => {
            window.open(
              "https://github.com/cruise-automation/webviz/blob/master/LICENSE",
              "_blank",
            );
            return;
          }}
        >
          License
        </SItem>
      </Menu>
    </ChildToggle>
  );
};

export default SettingsMenu;
