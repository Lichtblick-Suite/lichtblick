// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";

import Log from "@lichtblick/log";
import { StudioLogsSettingsContext } from "@lichtblick/suite-base/context/StudioLogsSettingsContext";

import { createStudioLogsSettingsStore } from "./store";
import { LocalStorageSaveState } from "./types";

function StudioLogsSettingsProvider(props: PropsWithChildren): React.JSX.Element {
  const [studioLogsSettingsSavedState, setStudioLogsSettingsSavedState] =
    useLocalStorage<LocalStorageSaveState>("blick.logs-settings", {});

  const [studioLogsSettingsStore, setStudioLogsSettingsStore] = useState(() =>
    createStudioLogsSettingsStore(studioLogsSettingsSavedState),
  );

  // To avoid resetting effect below when the localstorage state changes we use a ref for the localstorage state
  const savedStateRef = useRef<LocalStorageSaveState | undefined>(studioLogsSettingsSavedState);
  useEffect(() => {
    savedStateRef.current = studioLogsSettingsSavedState;
  });

  // Setup an interval to check for changes to the total number of logging channels
  //
  // When the total number of channels changes we re-initialize the settings store so we display any
  // newly added log channels.
  useEffect(() => {
    const storeChannelsCount = studioLogsSettingsStore.getState().channels.length;
    const intervalHandle = setInterval(() => {
      if (storeChannelsCount !== Log.channels().length) {
        setStudioLogsSettingsStore(createStudioLogsSettingsStore(savedStateRef.current));
      }
    }, 1000);

    return () => {
      clearInterval(intervalHandle);
    };
  }, [studioLogsSettingsStore, studioLogsSettingsSavedState]);

  useEffect(() => {
    return studioLogsSettingsStore.subscribe((value) => {
      const disabledChannels: string[] = [];

      for (const channel of value.channels) {
        if (!channel.enabled) {
          disabledChannels.push(channel.name);
        }
      }
      setStudioLogsSettingsSavedState({ globalLevel: value.globalLevel, disabledChannels });
    });
  }, [studioLogsSettingsStore, setStudioLogsSettingsSavedState]);

  return (
    <StudioLogsSettingsContext.Provider value={studioLogsSettingsStore}>
      {props.children}
    </StudioLogsSettingsContext.Provider>
  );
}

export { StudioLogsSettingsProvider };
