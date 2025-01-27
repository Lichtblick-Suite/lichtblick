// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

import { IndicatorStyle } from "@lichtblick/suite-base/panels/Indicator/types";

export const useStyles = makeStyles<Partial<{ style: IndicatorStyle; bulbColor: string }>>()(
  ({ spacing }, { style, bulbColor = "transparent" }) => ({
    indicatorStack: {
      flexGrow: 1,
      justifyContent: "space-around",
      alignItems: "center",
      overflow: "hidden",
      padding: spacing(1),
      backgroundColor: style === "background" ? bulbColor : "transparent",
    },
    stack: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      width: "10vw",
      height: "10vw",
      display: "flex",
      justifyContent: "center",
    },
    bulb: {
      width: "clamp(10px, 2vw, 32px)",
      height: "clamp(10px, 2vw, 32px)",
      borderRadius: "50%",
      position: "relative",
      backgroundColor: bulbColor,
      backgroundImage: [
        `radial-gradient(transparent, transparent 55%, rgba(255,255,255,0.4) 80%, rgba(255,255,255,0.4))`,
        `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.8), transparent 30%, transparent)`,
        `radial-gradient(circle at 46% 44%, transparent, transparent 61%, rgba(0,0,0,0.7) 74%, rgba(0,0,0,0.7))`,
      ].join(","),
    },
    typography: {
      fontWeight: 700,
      fontSize: "clamp(10px, 1vw, 52px)",
      whiteSpace: "pre",
      padding: spacing(0),
    },
  }),
);
