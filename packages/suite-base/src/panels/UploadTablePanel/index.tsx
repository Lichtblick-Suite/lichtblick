// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCrash } from "@lichtblick/hooks";
import { PanelExtensionContext } from "@lichtblick/suite";
import { CaptureErrorBoundary } from "@lichtblick/suite-base/components/CaptureErrorBoundary";
import Panel from "@lichtblick/suite-base/components/Panel";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { createSyncRoot } from "@lichtblick/suite-base/panels/createSyncRoot";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import { StrictMode, useMemo } from "react";

import { UploadTablePanel } from "./UploadTablePanel";

type Config = {};

function initPanel(crash: ReturnType<typeof useCrash>, context: PanelExtensionContext) {
  return createSyncRoot(
    <StrictMode>
      <CaptureErrorBoundary onError={crash}>
        <ThemeProvider isDark>
          <UploadTablePanel context={context} />
        </ThemeProvider>
      </CaptureErrorBoundary>
    </StrictMode>,
    context.panelElement,
  );
}

type Props = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

function UploadTablePanelAdapter(props: Props) {
  const crash = useCrash();
  const boundInitPanel = useMemo(() => initPanel.bind(undefined, crash), [crash]);

  return (
    <PanelExtensionAdapter
      config={props.config}
      saveConfig={props.saveConfig}
      initPanel={boundInitPanel}
      highestSupportedConfigVersion={1}
    />
  );
}

UploadTablePanelAdapter.panelType = "UploadTablePanel";
UploadTablePanelAdapter.defaultConfig = {};

export default Panel(UploadTablePanelAdapter);
