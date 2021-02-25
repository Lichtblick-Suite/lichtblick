// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import DatabaseIcon from "@mdi/svg/svg/database.svg";
import * as React from "react";
import styled from "styled-components";

import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import { WrappedIcon } from "@foxglove-studio/app/components/Icon";
import { useMessagePipeline } from "@foxglove-studio/app/components/MessagePipeline";
import SpinningLoadingIcon from "@foxglove-studio/app/components/SpinningLoadingIcon";
import { colors } from "@foxglove-studio/app/util/sharedStyleConstants";
import { showHelpModalOpenSource } from "@foxglove-studio/app/util/showHelpModalOpenSource";

const SConnectionPicker = styled.div`
  padding: 1em;
  background: ${colors.GRAY2};
  pointer-events: auto;
  border-radius: 4px;
  line-height: 1.4;
`;

export function TinyConnectionPicker({
  inputDescription,
  defaultIsOpen = false,
}: {
  inputDescription: React.ReactNode;
  defaultIsOpen?: boolean;
}) {
  const showSpinner = useMessagePipeline(
    React.useCallback(({ playerState }) => playerState.showSpinner, []),
  );
  const [isOpen, setIsOpen] = React.useState<boolean>(defaultIsOpen);

  const onToggle = React.useCallback(() => setIsOpen((open) => !open), []);

  return (
    <ChildToggle
      position="below"
      isOpen={isOpen}
      onToggle={onToggle}
      dataTest="open-connection-picker"
      style={{ height: 18 }}
    >
      <WrappedIcon tooltip="Sources" medium fade active={isOpen}>
        {showSpinner ? <SpinningLoadingIcon /> : <DatabaseIcon />}
      </WrappedIcon>
      <SConnectionPicker>
        {inputDescription}
        <div style={{ marginTop: "1em", whiteSpace: "nowrap" }}>
          To connect different sources, see the{" "}
          <a href="#" onClick={showHelpModalOpenSource}>
            help page
          </a>
          .
        </div>
      </SConnectionPicker>
    </ChildToggle>
  );
}
