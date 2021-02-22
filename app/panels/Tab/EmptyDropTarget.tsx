//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { useCallback, useState } from "react";
import { useDrop } from "react-dnd";
import { MosaicDragType } from "react-mosaic-component";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { addPanel } from "@foxglove-studio/app/actions/panels";
import EmptyBoxSvg from "@foxglove-studio/app/assets/emptyBox.svg";
import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import Menu from "@foxglove-studio/app/components/Menu";
import PanelList, { PanelSelection } from "@foxglove-studio/app/panels/PanelList";
import cssColors from "@foxglove-studio/app/styles/colors.module.scss";
import logEvent, { getEventNames, getEventTags } from "@foxglove-studio/app/util/logEvent";
import { colors } from "@foxglove-studio/app/util/sharedStyleConstants";

const SDropTarget = styled.div<{ isOver: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: ${({ isOver }: any) => (isOver ? cssColors.textDisabled : "transparent")};
  border: ${({ isOver }: any) => (isOver ? `1px solid ${cssColors.textMuted}` : "none")};
`;

const SEmptyStateText = styled.div`
  font-size: 16px;
  margin: 16px 72px;
  text-align: center;
  line-height: 1.5;
  color: rgba(247, 247, 243, 0.3);
`;

const SPickAPanelText = styled.div`
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.1s;

  &:hover {
    color: ${colors.TEXTL1};
  }
`;

type Props = {
  mosaicId: string | null | undefined;
  tabId: string | null | undefined;
};

export const EmptyDropTarget = ({ mosaicId, tabId }: Props) => {
  const dispatch = useDispatch();
  const [showPanelList, setShowPanelList] = useState(false);
  const toggleShowPanelList = useCallback(() => setShowPanelList((show) => !show), []);

  const [{ isOver }, drop] = useDrop({
    accept: MosaicDragType.WINDOW,
    drop: (item, monitor) => {
      if (monitor.getItem().mosaicId === mosaicId) {
        return { tabId };
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const onPanelSelect = useCallback(
    ({ type, config, relatedConfigs }: PanelSelection) => {
      dispatch(addPanel({ tabId, type, layout: null, config, relatedConfigs }));
      logEvent({ name: getEventNames().PANEL_ADD, tags: { [getEventTags().PANEL_TYPE]: type } });
    },
    [dispatch, tabId],
  );

  return (
    <SDropTarget ref={drop} isOver={isOver} data-test="empty-drop-target">
      <EmptyBoxSvg />
      <SEmptyStateText>
        Nothing here yet.
        <br />
        <ChildToggle
          position="below"
          onToggle={toggleShowPanelList}
          isOpen={showPanelList}
          style={{ display: "inline-flex" }}
        >
          <SPickAPanelText data-test="pick-a-panel">Pick a panel</SPickAPanelText>
          <Menu>
            <PanelList onPanelSelect={onPanelSelect} />
          </Menu>
        </ChildToggle>{" "}
        {" or drag one in to get started."}
      </SEmptyStateText>
    </SDropTarget>
  );
};
