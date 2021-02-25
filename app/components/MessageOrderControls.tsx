// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import React, { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";

import { setPlaybackConfig } from "@foxglove-studio/app/actions/panels";
import Dropdown from "@foxglove-studio/app/components/Dropdown";
import NoHeaderTopicsButton from "@foxglove-studio/app/components/NoHeaderTopicsButton";
import { State } from "@foxglove-studio/app/reducers";
import { defaultPlaybackConfig } from "@foxglove-studio/app/reducers/panels";

const messageOrderLabel = {
  receiveTime: "Receive time",
  headerStamp: "Header stamp",
};

export default function MessageOrderControls() {
  const messageOrder = useSelector(
    (state: State) => state.persistedState.panels.playbackConfig.messageOrder,
  );
  const dispatch = useDispatch();
  const setMessageOrder = useCallback(
    (newMessageOrder) => {
      dispatch(setPlaybackConfig({ messageOrder: newMessageOrder }));
    },
    [dispatch],
  );

  const orderText = messageOrderLabel[messageOrder] || defaultPlaybackConfig.messageOrder;
  const tooltip = `Order messages by ${orderText.toLowerCase()}`;
  const noHeaderTopicsButton = messageOrder === "headerStamp" ? <NoHeaderTopicsButton /> : null;
  return (
    <>
      <Dropdown
        position="above"
        value={messageOrder}
        text={orderText}
        onChange={setMessageOrder}
        tooltip={tooltip}
        menuStyle={{ width: "125px" }}
        btnStyle={{ marginRight: "8px", height: "28px" }}
      >
        {/* @ts-expect-error change <span> to DropdownItem since value is not a property of <span> */}
        <span value={"receiveTime"}>{messageOrderLabel.receiveTime}</span>
        {/* @ts-expect-error change <span> to DropdownItem since value is not a property of <span> */}
        <span value={"headerStamp"}>{messageOrderLabel.headerStamp}</span>
      </Dropdown>
      {noHeaderTopicsButton}
    </>
  );
}
