// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import SettingsTreeEditor from "@lichtblick/suite-base/components/SettingsTreeEditor";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";

import { useStudioLogsSettingsTree } from "./useStudioLogsSettingsTree";

export function StudioLogsSettings(): JSX.Element {
  const logSettings = useStudioLogsSettingsTree();

  return <SettingsTreeEditor variant="log" settings={logSettings} />;
}

export function StudioLogsSettingsSidebar(): JSX.Element {
  return (
    <SidebarContent overflow="auto" title="Studio Logs Settings" disablePadding>
      <StudioLogsSettings />
    </SidebarContent>
  );
}
