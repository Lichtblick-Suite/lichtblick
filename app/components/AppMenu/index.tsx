//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import PlusCircleOutlineIcon from "@mdi/svg/svg/plus-circle-outline.svg";
import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addPanel, AddPanelPayload } from "@foxglove-studio/app/actions/panels";
import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import { WrappedIcon } from "@foxglove-studio/app/components/Icon";
import Menu from "@foxglove-studio/app/components/Menu";
// @ts-expect-error flow imports have any type
import PanelList, { PanelSelection } from "@foxglove-studio/app/panels/PanelList";
import { State as ReduxState } from "@foxglove-studio/app/reducers";
import logEvent, { getEventNames, getEventTags } from "@foxglove-studio/app/util/logEvent";

type Props = {
  defaultIsOpen?: boolean; // just for testing
};

function AppMenu(props: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(props.defaultIsOpen || false);
  const onToggle = useCallback(() => setIsOpen((open) => !open), []);
  const dispatch = useDispatch();

  const layout = useSelector((state: ReduxState) => state.persistedState.panels.layout);
  const onPanelSelect = useCallback(
    ({ type, config, relatedConfigs }: PanelSelection) => {
      dispatch(addPanel({ type, layout, config, relatedConfigs, tabId: null } as AddPanelPayload));
      logEvent({ name: getEventNames().PANEL_ADD, tags: { [getEventTags().PANEL_TYPE]: type } });
    },
    [dispatch, layout],
  );

  return (
    <ChildToggle position="below" onToggle={onToggle} isOpen={isOpen}>
      <WrappedIcon medium fade active={isOpen} tooltip="Add Panel">
        <PlusCircleOutlineIcon />
      </WrappedIcon>
      <Menu style={{ overflowY: "hidden", height: "100%" }}>
        <PanelList onPanelSelect={onPanelSelect} />
      </Menu>
    </ChildToggle>
  );
}

export default AppMenu;
