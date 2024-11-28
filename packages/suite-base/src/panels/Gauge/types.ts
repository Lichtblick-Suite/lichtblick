// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { PanelExtensionContext } from "@lichtblick/suite";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

export enum ColorMapConfig {
  RED_YELLOW_GREEN = "red-yellow-green",
  RAINBOW = "rainbow",
  TURBO = "turbo",
}

export enum ColorModeConfig {
  COLORMAP = "colormap",
  GRADIENT = "gradient",
}

export type Config = {
  path: string;
  minValue: number;
  maxValue: number;
  colorMode: ColorModeConfig;
  colorMap: ColorMapConfig;
  gradient: [string, string];
  reverse: boolean;
};

export type ColorStops = {
  color: string;
  location: number;
};

export type GaugePanelAdapterProps = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

export type GaugeProps = {
  context: PanelExtensionContext;
};

export type BuildConicGradientProps = {
  config: Pick<Config, "colorMap" | "colorMode" | "gradient" | "reverse">;
  gaugeAngle: number;
  height: number;
  width: number;
};
