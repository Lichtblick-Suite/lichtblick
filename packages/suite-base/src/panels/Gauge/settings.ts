// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { produce } from "immer";
import * as _ from "lodash-es";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useShallowMemo } from "@lichtblick/hooks";
import { SettingsTreeNode } from "@lichtblick/suite";
import { DATA_TYPES } from "@lichtblick/suite-base/panels/Gauge/constants";

import {
  ColorMapConfig,
  ColorModeConfig,
  SettingsActionReducerProps,
  GaugeConfig,
  SettingsTreeNodesProps,
} from "./types";

export function settingsActionReducer({
  prevConfig,
  action,
}: SettingsActionReducerProps): GaugeConfig {
  const { action: settingsTreeAction, payload } = action;

  return produce(prevConfig, (draft) => {
    switch (settingsTreeAction) {
      case "perform-node-action":
        throw new Error(`Unhandled node action: ${payload.id}`);
      case "update":
        switch (payload.path[0]) {
          case "general":
            _.set(draft, [payload.path[1]!], payload.value);
            break;
          default:
            throw new Error(`Unexpected payload.path[0]: ${payload.path[0]}`);
        }
        break;
    }
  });
}

export function useSettingsTree({
  config,
  pathParseError,
  error,
}: SettingsTreeNodesProps): Record<"general", SettingsTreeNode> {
  const { colorMap, colorMode, gradient, maxValue, minValue, path, reverse } = config;
  const { t } = useTranslation("gauge");

  const generalSettings = useMemo(
    (): SettingsTreeNode => ({
      error,
      fields: {
        path: {
          label: t("messagePath.label"),
          input: "messagepath",
          value: path,
          error: pathParseError,
          validTypes: DATA_TYPES,
        },
        minValue: {
          label: t("minValue.label"),
          input: "number",
          value: minValue,
        },
        maxValue: {
          label: t("maxValue.label"),
          input: "number",
          value: maxValue,
        },
        colorMode: {
          label: t("colorMode.label"),
          input: "select",
          value: colorMode,
          options: [
            { label: t("colorMode.options.colorMap"), value: ColorModeConfig.COLORMAP },
            { label: "Gradient", value: ColorModeConfig.GRADIENT },
          ],
        },
        ...(colorMode === ColorModeConfig.COLORMAP && {
          colorMap: {
            label: t("colorMode.options.colorMap"),
            input: "select",
            value: colorMap,
            options: [
              {
                label: t("colorMap.options.redYellowGreen"),
                value: ColorMapConfig.RED_YELLOW_GREEN,
              },
              { label: t("colorMap.options.rainbow"), value: ColorMapConfig.RAINBOW },
              { label: t("colorMap.options.turbo"), value: ColorMapConfig.TURBO },
            ],
          },
        }),
        ...(colorMode === ColorModeConfig.GRADIENT && {
          gradient: {
            label: t("colorMode.options.gradient"),
            input: ColorModeConfig.GRADIENT,
            value: gradient,
          },
        }),
        reverse: {
          label: t("reverse.label"),
          input: "boolean",
          value: reverse,
        },
      },
    }),
    [error, t, path, minValue, maxValue, colorMode, colorMap, gradient, reverse, pathParseError],
  );

  return useShallowMemo({
    general: generalSettings,
  });
}
