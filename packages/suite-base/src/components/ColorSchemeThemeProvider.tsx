// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";
import { useMedia } from "react-use";

export function ColorSchemeThemeProvider({ children }: React.PropsWithChildren): JSX.Element {
  const [colorScheme = "system"] = useAppConfigurationValue<string>(AppSetting.COLOR_SCHEME);
  const systemSetting = useMedia("(prefers-color-scheme: dark)");
  const isDark = colorScheme === "dark" || (colorScheme === "system" && systemSetting);
  return <ThemeProvider isDark={isDark}>{children}</ThemeProvider>;
}
