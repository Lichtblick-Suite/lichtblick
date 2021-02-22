//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";

import { moveTab, MoveTabPayload } from "@foxglove-studio/app/actions/panels";
import {
  DraggingTabItem,
  TAB_DRAG_TYPE,
  TabActions,
} from "@foxglove-studio/app/panels/Tab/TabDndContext";
import { ToolbarTab } from "@foxglove-studio/app/panels/Tab/ToolbarTab";

type Props = {
  isActive: boolean;
  panelId: string;
  actions: TabActions;
  tabCount: number;
  tabIndex: number;
  tabTitle: string;
  setDraggingTabState: (arg0: {
    isOver: boolean;
    item: DraggingTabItem | null | undefined;
  }) => void;
};

export function DraggableToolbarTab(props: Props) {
  const { isActive, tabCount, actions, panelId, tabTitle, tabIndex } = props;

  const ref = useRef(null);
  const dispatch = useDispatch();
  const [{ isDragging }, dragRef] = useDrag({
    item: { type: TAB_DRAG_TYPE, panelId, tabIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: TAB_DRAG_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    drop: (sourceItem, _monitor: any) => {
      const source = {
        panelId: (sourceItem as any).panelId,
        tabIndex: (sourceItem as any).tabIndex,
      };
      const target = { tabIndex, panelId };
      dispatch(moveTab({ source, target } as MoveTabPayload));
    },
  });

  dragRef(dropRef(ref)); // Combine drag and drop refs

  const tabProps = {
    tabTitle,
    tabIndex,
    isActive,
    tabCount,
    actions,
    isDragging,
    innerRef: ref,
    hidden: isDragging,
    highlight: isOver,
  };
  return <ToolbarTab {...tabProps} />;
}
