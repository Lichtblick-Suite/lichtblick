//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import PencilIcon from "@mdi/svg/svg/pencil.svg";
import * as React from "react";
import { PolygonBuilder, Polygon } from "regl-worldview";

import Polygons from "./Polygons";
import ExpandingToolbar, { ToolGroup } from "@foxglove-studio/app/components/ExpandingToolbar";
import Icon from "@foxglove-studio/app/components/Icon";
import { EDIT_FORMAT, EditFormat } from "@foxglove-studio/app/components/ValidatedInput";
import styles from "@foxglove-studio/app/panels/ThreeDimensionalViz/Layout.module.scss";
import colors from "@foxglove-studio/app/styles/colors.module.scss";

export const POLYGON_TAB_TYPE = "Polygons";
export type DrawingTabType = typeof POLYGON_TAB_TYPE;
export type Point2D = { x: number; y: number };
type Props = {
  onSetPolygons: (polygons: Polygon[]) => void;
  polygonBuilder: PolygonBuilder;
  selectedPolygonEditFormat: EditFormat;
  onSetDrawingTabType: (arg0: DrawingTabType | null | undefined) => void;
  defaultSelectedTab?: DrawingTabType; // for UI testing
};

// add more drawing shapes later, e.g. Grid, Axes, Crosshairs
function DrawingTools({
  defaultSelectedTab,
  onSetDrawingTabType,
  onSetPolygons,
  polygonBuilder,
  selectedPolygonEditFormat,
}: Props) {
  const [selectedTab, setSelectedTab] = React.useState<DrawingTabType | null | undefined>(
    defaultSelectedTab,
  );

  return (
    <ExpandingToolbar
      tooltip="Drawing tools"
      icon={
        <Icon style={{ color: selectedTab ? colors.accent : "white" }}>
          <PencilIcon />
        </Icon>
      }
      className={styles.buttons}
      selectedTab={selectedTab}
      onSelectTab={(newSelectedTab) => {
        onSetDrawingTabType(newSelectedTab);
        setSelectedTab(newSelectedTab);
      }}
    >
      <ToolGroup name={POLYGON_TAB_TYPE}>
        <Polygons
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
        />
      </ToolGroup>
    </ExpandingToolbar>
  );
}

DrawingTools.defaultProps = {
  selectedPolygonEditFormat: EDIT_FORMAT.YAML,
};

export default React.memo<Props>(DrawingTools);
