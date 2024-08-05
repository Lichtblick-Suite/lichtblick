// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useSessionStorageValue } from "@lichtblick/hooks";
import { LaunchPreferenceValue } from "@lichtblick/suite-base/types/LaunchPreferenceValue";
import { PropsWithChildren } from "react";

import { LaunchPreferenceScreen } from "./LaunchPreferenceScreen";
import { LaunchingInDesktopScreen } from "./LaunchingInDesktopScreen";
import { AppSetting } from "../AppSetting";
import { useAppConfigurationValue } from "../hooks";

export function LaunchPreference(props: PropsWithChildren): JSX.Element {
  const [globalLaunchPreference] = useAppConfigurationValue<string>(AppSetting.LAUNCH_PREFERENCE);
  const [sessionLaunchPreference] = useSessionStorageValue(AppSetting.LAUNCH_PREFERENCE);

  const url = new URL(window.location.href);

  // Session preferences take priority over URL and global preferences. This allows the button in
  // LaunchPreferenceScreen to override the url when clicked.
  let activePreference =
    sessionLaunchPreference ?? url.searchParams.get("openIn") ?? globalLaunchPreference;
  switch (activePreference) {
    case LaunchPreferenceValue.WEB:
    case LaunchPreferenceValue.DESKTOP:
    case LaunchPreferenceValue.ASK:
      break;
    default:
      activePreference = LaunchPreferenceValue.WEB;
  }

  const hasParams = Array.from(url.searchParams.entries()).length > 0;
  // Ask the user in which environment they want to open this session.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  if (activePreference === LaunchPreferenceValue.ASK && hasParams) {
    return <LaunchPreferenceScreen />;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  } else if (activePreference === LaunchPreferenceValue.DESKTOP && hasParams) {
    return <LaunchingInDesktopScreen />;
  } else {
    return <>{props.children}</>;
  }
}
