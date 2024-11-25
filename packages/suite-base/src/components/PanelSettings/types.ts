// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { SvgIconProps } from "@mui/material";

export type ActionMenuProps = {
  allowShare: boolean;
  onReset: () => void;
  onShare: () => void;
  fontSize?: SvgIconProps["fontSize"];
};
