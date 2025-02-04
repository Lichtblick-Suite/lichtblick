// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ROW_HEIGHT } from "@lichtblick/suite-base/panels/Plot/PlotLegendRow";
import { buttonBaseClasses } from "@mui/material";
import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles<void, "plotName" | "actionButton">()(
  (theme, _params, classes) => ({
    root: {
      display: "contents",
      cursor: "pointer",

      "&:hover": {
        "& > *": {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(${[
            "0deg",
            theme.palette.action.hover,
            theme.palette.action.hover,
          ].join(" ,")})`,
        },
      },
      ":not(:hover)": {
        [`& .${classes.actionButton}`]: {
          opacity: 0,
        },
      },
    },
    showPlotValue: {
      [`.${classes.plotName}`]: {
        gridColumn: "span 1",
        padding: theme.spacing(0, 1.5, 0, 0.5),
      },
    },
    listIcon: {
      display: "flex",
      alignItems: "center",
      position: "sticky",
      height: ROW_HEIGHT,
      left: 0,
    },
    checkbox: {
      height: ROW_HEIGHT,
      width: ROW_HEIGHT,
      borderRadius: 0,

      ":hover": {
        backgroundColor: theme.palette.action.hover,
      },
    },
    disabledPathLabel: {
      opacity: 0.5,
    },
    plotName: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      justifySelf: "stretch",
      gap: theme.spacing(0.5),
      height: ROW_HEIGHT,
      paddingInline: theme.spacing(0.75, 2.5),
      gridColumn: "span 2",
      fontFeatureSettings: `${theme.typography.fontFeatureSettings}, "zero"`,

      ".MuiTypography-root": {
        whiteSpace: "nowrap",
      },
    },
    plotValue: {
      display: "flex",
      alignItems: "center",
      justifySelf: "stretch",
      height: ROW_HEIGHT,
      padding: theme.spacing(0.25, 1, 0.25, 0.25),
      whiteSpace: "pre-wrap",
    },
    errorIcon: {
      color: theme.palette.error.main,
    },
    actionButton: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "sticky",
      right: 0,

      [`.${buttonBaseClasses.root}`]: {
        height: ROW_HEIGHT,
        width: ROW_HEIGHT,

        ":hover": {
          backgroundColor: theme.palette.action.hover,
        },
      },
    },
  }),
);
