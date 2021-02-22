//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import * as React from "react";
import { PolygonBuilder, Polygon } from "regl-worldview";
import styled from "styled-components";

import { polygonPointsValidator } from "@foxglove-studio/app/shared/validators";
import Button from "@foxglove-studio/app/components/Button";
import PanelContext from "@foxglove-studio/app/components/PanelContext";
import ValidatedInput, { EditFormat } from "@foxglove-studio/app/components/ValidatedInput";
import {
  SValue,
  SLabel,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/Interactions/Interactions";
import {
  polygonsToPoints,
  getFormattedString,
  pointsToPolygons,
  getPolygonLineDistances,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/utils/drawToolUtils";
import clipboard from "@foxglove-studio/app/util/clipboard";

export type Point2D = { x: number; y: number };

export const SRow = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
`;

type Props = {
  onSetPolygons: (polygons: Polygon[]) => void;
  polygonBuilder: PolygonBuilder;
  selectedPolygonEditFormat: EditFormat;
};

export default function Polygons({
  onSetPolygons,
  polygonBuilder,
  selectedPolygonEditFormat,
}: Props) {
  const { saveConfig } = React.useContext(PanelContext) || {};
  const polygons: Polygon[] = polygonBuilder.polygons;
  const [polygonPoints, setPolygonPoints] = React.useState<Point2D[][]>(() =>
    polygonsToPoints(polygons),
  );
  function polygonBuilderOnChange() {
    setPolygonPoints(polygonsToPoints(polygons));
  }
  polygonBuilder.onChange = polygonBuilderOnChange;

  return (
    <>
      <ValidatedInput
        format={selectedPolygonEditFormat}
        value={polygonPoints}
        onSelectFormat={(selectedFormat) =>
          (saveConfig as any)({ selectedPolygonEditFormat: selectedFormat })
        }
        onChange={(newPolygonPoints) => {
          if (newPolygonPoints) {
            setPolygonPoints(newPolygonPoints);
            onSetPolygons(pointsToPolygons(newPolygonPoints));
          }
        }}
        dataValidator={polygonPointsValidator}
      >
        <Button
          small
          tooltip="Copy Polygons"
          onClick={() => {
            clipboard.copy(getFormattedString(polygonPoints, selectedPolygonEditFormat));
          }}
        >
          Copy
        </Button>
      </ValidatedInput>
      <SRow>
        <SLabel>Total length:</SLabel>
        <SValue>{getPolygonLineDistances(polygonPoints).toFixed(2)} m</SValue>
      </SRow>
      <p style={{ marginTop: 0 }}>
        <em>
          Start drawing by holding <b>ctrl</b> and clicking on the 3D panel.
        </em>
      </p>
    </>
  );
}
