// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// SPDX-FileCopyrightText: Copyright (C) 2024 Yukihiro Saito <yukky.saito@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Portions of this file were modified in 2024 by Yukihiro Saito
// These modifications are licensed under the Apache License, Version 2.0.
// You may obtain a copy of the Apache License at http://www.apache.org/licenses/LICENSE-2.0

import { produce } from "immer";
import * as _ from "lodash-es";
import { useMemo } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import { SettingsTreeAction, SettingsTreeNode, SettingsTreeNodes } from "@lichtblick/suite";

import type { Config } from "./types";

export function settingsActionReducer(prevConfig: Config, action: SettingsTreeAction): Config {
  return produce(prevConfig, (draft) => {
    switch (action.action) {
      case "perform-node-action":
        throw new Error(`Unhandled node action: ${action.payload.id}`);
      case "update":
        switch (action.payload.path[0]) {
          case "general":
            _.set(draft, [action.payload.path[1]!], action.payload.value);
            break;
          default:
            throw new Error(`Unexpected payload.path[0]: ${action.payload.path[0]}`);
        }
        break;
    }
  });
}

const supportedDataTypes = [
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "float32",
  "float64",
  "string",
];

export function useSettingsTree(
  config: Config,
  pathParseError: string | undefined,
  error: string | undefined,
): SettingsTreeNodes {
  const generalSettings = useMemo(
    (): SettingsTreeNode => ({
      error,
      fields: {
        path: {
          label: "Message path",
          input: "messagepath",
          value: config.path,
          error: pathParseError,
          validTypes: supportedDataTypes,
        },
        title: {
          label: "Title",
          input: "string",
          value: config.title,
        },
        legend1: {
          label: "Legend 1",
          input: "string",
          value: config.legend1,
        },
        legend2: {
          label: "Legend 2",
          input: "string",
          value: config.legend2,
        },
        legend3: {
          label: "Legend 3",
          input: "string",
          value: config.legend3,
        },
        legend4: {
          label: "Legend 4",
          input: "string",
          value: config.legend4,
        },
        legend5: {
          label: "Legend 5",
          input: "string",
          value: config.legend5,
        },
        legend6: {
          label: "Legend 6",
          input: "string",
          value: config.legend6,
        },
        legend7: {
          label: "Legend 7",
          input: "string",
          value: config.legend7,
        },
        legend8: {
          label: "Legend 8",
          input: "string",
          value: config.legend8,
        },
        legend9: {
          label: "Legend 9",
          input: "string",
          value: config.legend9,
        },
        legend10: {
          label: "Legend 10",
          input: "string",
          value: config.legend10,
        },
      },
    }),
    [error, config, pathParseError],
  );
  return useShallowMemo({
    general: generalSettings,
  });
}
