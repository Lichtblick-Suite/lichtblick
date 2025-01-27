// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles()(({ spacing }) => ({
  root: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    position: "relative",
    backgroundImage: [
      `radial-gradient(transparent, transparent 55%, rgba(255,255,255,0.4) 80%, rgba(255,255,255,0.4))`,
      `radial-gradient(circle at 38% 35%, rgba(255,255,255,0.8), transparent 30%, transparent)`,
      `radial-gradient(circle at 46% 44%, transparent, transparent 61%, rgba(0,0,0,0.7) 74%, rgba(0,0,0,0.7))`,
    ].join(","),
  },
  stack: {
    width: "10vw",
    height: "10vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  typography: {
    fontWeight: 700,
    fontSize: "clamp(10px, 1vw, 52px)",
    whiteSpace: "pre",
    padding: spacing(0),
  },
}));
