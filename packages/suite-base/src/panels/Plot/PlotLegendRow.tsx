// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Dismiss12Regular,
  Add12Regular,
  ErrorCircle16Filled,
  Square12Filled,
  Square12Regular,
} from "@fluentui/react-icons";
import { ButtonBase, Checkbox, Tooltip, Typography } from "@mui/material";
import { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

import { isTime, toSec } from "@lichtblick/rostime";
import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import { useSelectedPanels } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useStyles } from "@lichtblick/suite-base/panels/Plot/PlotLegendRow.style";
import { PlotLegendRowProps } from "@lichtblick/suite-base/panels/Plot/types";
import { getLineColor } from "@lichtblick/suite-base/util/plotColors";

import { plotPathDisplayName } from "./config";

export const ROW_HEIGHT = 30;

function renderValue(value: unknown): string | number | undefined {
  switch (typeof value) {
    case "bigint":
    case "boolean":
      return value.toString();
    case "number":
    case "string":
      return value;
    case "object":
      if (isTime(value)) {
        return toSec(value);
      }
      return undefined;
    default:
      return undefined;
  }
}

export function PlotLegendRow({
  hasMismatchedDataLength,
  index,
  onClickPath,
  path,
  paths,
  savePaths,
  value,
  valueSource,
}: PlotLegendRowProps): React.JSX.Element {
  const { openPanelSettings } = useWorkspaceActions();
  const { id: panelId } = usePanelContext();
  const { setSelectedPanelIds } = useSelectedPanels();
  const { classes, cx } = useStyles();
  const { t } = useTranslation("plot");

  // When there are no series configured we render an extra row to show an "add series" button.
  const isAddSeriesRow = paths.length === 0;

  const handleDeletePath: MouseEventHandler<HTMLButtonElement> = (ev) => {
    // Deleting a path is a "quick action" and we want to avoid opening the settings sidebar
    // so whatever sidebar the user is already viewing says active.
    //
    // This prevents the click event from going up to the entire row and showing the sidebar.
    ev.stopPropagation();

    const newPaths = paths.slice();
    if (newPaths.length > 0) {
      newPaths.splice(index, 1);
    }
    savePaths(newPaths);
  };

  const showPlotValuesInLegend = value != undefined;

  return (
    <div
      className={cx(classes.root, {
        [classes.showPlotValue]: showPlotValuesInLegend,
      })}
      onClick={() => {
        setSelectedPanelIds([panelId]);
        openPanelSettings();
        onClickPath();
      }}
    >
      <div className={classes.listIcon}>
        <Checkbox
          className={classes.checkbox}
          checked={path.enabled}
          size="small"
          title="Toggle visibility"
          style={{ color: getLineColor(path.color, index) }}
          icon={<Square12Regular />}
          checkedIcon={<Square12Filled />}
          onClick={(event) => {
            event.stopPropagation();
          }} // prevent toggling from opening settings
          onChange={() => {
            const newPaths = paths.slice();
            const newPath = newPaths[index];

            if (newPath) {
              newPaths[index] = { ...newPath, enabled: !newPath.enabled };
            }
            savePaths(newPaths);
          }}
        />
      </div>
      <div
        className={classes.plotName}
        style={{ gridColumn: !showPlotValuesInLegend ? "span 2" : undefined }}
      >
        <Typography
          noWrap={showPlotValuesInLegend}
          flex="auto"
          variant="body2"
          className={cx({ [classes.disabledPathLabel]: !path.enabled })}
        >
          {isAddSeriesRow ? t("clickToAddASeries") : plotPathDisplayName(path, index)}
        </Typography>
        {hasMismatchedDataLength && (
          <Tooltip
            placement="top"
            title="Mismatch in the number of elements in x-axis and y-axis messages"
          >
            <ErrorCircle16Filled className={classes.errorIcon} />
          </Tooltip>
        )}
      </div>
      {showPlotValuesInLegend && (
        <div className={classes.plotValue}>
          <Typography
            variant="body2"
            align="right"
            color={valueSource === "hover" ? "warning.main" : "text.secondary"}
          >
            {renderValue(value)}
          </Typography>
        </div>
      )}
      <div className={classes.actionButton}>
        {index === paths.length ? (
          <ButtonBase title="Add series" aria-label="Add series" onClick={onClickPath}>
            <Add12Regular />
          </ButtonBase>
        ) : (
          <ButtonBase title="Delete series" aria-label="Delete series" onClick={handleDeletePath}>
            <Dismiss12Regular />
          </ButtonBase>
        )}
      </div>
    </div>
  );
}
