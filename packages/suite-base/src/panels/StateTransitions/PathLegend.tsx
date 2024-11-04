// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Add16Regular, Dismiss12Regular } from "@fluentui/react-icons";
import { Button, ButtonGroup, Stack, buttonClasses } from "@mui/material";
import { MouseEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import tinycolor from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import { useSelectedPanels } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { DEFAULT_PATH } from "@lichtblick/suite-base/panels/Plot/settings";
import { stateTransitionPathDisplayName } from "@lichtblick/suite-base/panels/StateTransitions/shared";
import {
  StateTransitionConfig,
  StateTransitionPath,
} from "@lichtblick/suite-base/panels/StateTransitions/types";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

export type PathLegendProps = {
  paths: StateTransitionPath[];
  heightPerTopic: number;
  setFocusedPath: (value: string[] | undefined) => void;
  saveConfig: SaveConfig<StateTransitionConfig>;
};

const useStyles = makeStyles()((theme) => ({
  chartOverlay: {
    left: 0,
    paddingTop: 0.5,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: 0,
  },
  row: {
    paddingInline: theme.spacing(1, 0.5),
    pointerEvents: "none",
  },
  buttonGroup: {
    color: "inherit",
    fontWeight: "normal",
    maxWidth: "100%",
    minWidth: "auto",
    pointerEvents: "auto",
    size: "small",
    textAlign: "left",
    variant: "contained",

    [`.${buttonClasses.root}`]: {
      backgroundColor: tinycolor(theme.palette.background.paper).setAlpha(0.67).toString(),
      paddingBlock: theme.spacing(0.25),
      borderColor: theme.palette.background.paper,

      "&:hover": {
        backgroundImage: `linear-gradient(to right, ${theme.palette.action.hover}, ${theme.palette.action.hover})`,
      },
    },
    [`.${buttonClasses.endIcon}`]: {
      opacity: 0.8,
      marginLeft: theme.spacing(0.5),
      marginRight: theme.spacing(-0.75),
    },
  },
  button: {
    minWidth: "auto !important",
    paddingInline: theme.spacing(0.5),
    size: "small",
  },
}));

export const PathLegend = React.memo(function PathLegend(props: PathLegendProps) {
  const { t } = useTranslation("stateTransitions");
  const { paths, heightPerTopic, setFocusedPath, saveConfig } = props;
  const { setSelectedPanelIds } = useSelectedPanels();
  const { id: panelId } = usePanelContext();
  const { openPanelSettings } = useWorkspaceActions();
  const { classes } = useStyles();

  const handleDeletePath = useCallback(
    (event: MouseEvent<HTMLButtonElement>, index: number) => {
      // Deleting a path is a "quick action" and we want to avoid opening the settings sidebar
      // so whatever sidebar the user is already viewing says active.
      //
      // This prevents the click event from going up to the entire row and showing the sidebar.
      event.stopPropagation();

      const newPaths = paths.slice();
      if (newPaths.length > 0) {
        newPaths.splice(index, 1);
      }
      saveConfig({ paths: newPaths });
    },
    [paths, saveConfig],
  );

  const handleEditTopic = useCallback((index: number) => {
    setSelectedPanelIds([panelId]);
    openPanelSettings();
    setFocusedPath(["paths", String(index)]);
  }, [openPanelSettings, panelId, setFocusedPath, setSelectedPanelIds]);

  return (
    <Stack className={classes.chartOverlay}>
      {(paths.length === 0 ? [DEFAULT_PATH] : paths).map((path, index) => (
        <div data-testid={`row-${index}`} className={classes.row} key={index} style={{ height: heightPerTopic }}>
          <ButtonGroup
            className={classes.buttonGroup}
          >
            <Button
              data-testid={`edit-topic-button-${index}`}
              endIcon={paths.length === 0 && <Add16Regular />}
              onClick={() => {
                handleEditTopic(index);
              }}
            >
              {paths.length === 0
                ? t("addSeriesButton")
                : stateTransitionPathDisplayName(path, index)}
            </Button>
            {paths.length > 0 && (
              <Button
                data-testid={`delete-topic-button-${index}`}
                className={classes.button}
                onClick={(event) => {
                  handleDeletePath(event, index);
                }}
              >
                <Dismiss12Regular />
              </Button>
            )}
          </ButtonGroup>
        </div>
      ))}
    </Stack>
  );
});
