// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTreeAction, SettingsTreeNodes } from "@lichtblick/suite";
import { usePanelSettingsTreeUpdate } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import { produce } from "immer";
import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";

import { VariableSliderConfig } from "./types";

function buildSettingsTree(config: VariableSliderConfig): SettingsTreeNodes {
  return {
    general: {
      label: "General",
      fields: {
        min: {
          label: "Min",
          input: "number",
          placeholder: "min",
          value: config.sliderProps.min,
        },
        max: {
          label: "Max",
          input: "number",
          placeholder: "max",
          value: config.sliderProps.max,
        },
        step: {
          label: "Step",
          input: "number",
          placeholder: "step",
          value: config.sliderProps.step,
        },
        globalVariableName: {
          label: "Variable name",
          input: "string",
          value: config.globalVariableName,
        },
      },
    },
  };
}

export function useVariableSliderSettings(
  config: VariableSliderConfig,
  saveConfig: SaveConfig<VariableSliderConfig>,
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action !== "update") {
        return;
      }

      saveConfig(
        produce<VariableSliderConfig>((draft) => {
          const path = action.payload.path.slice(1);
          if (["min", "max"].includes(path[0] ?? "")) {
            _.set(draft, ["sliderProps", ...path], action.payload.value);
          } else if (path[0] === "step" && action.payload.input === "number") {
            draft.sliderProps.step = action.payload.value;
          } else {
            _.set(draft, path, action.payload.value);
          }
        }),
      );
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: buildSettingsTree(config),
    });
  }, [actionHandler, config, updatePanelSettingsTree]);
}
