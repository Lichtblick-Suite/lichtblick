// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Panel from "@lichtblick/suite-base/components/Panel";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import PanelCatalogContext, {
  PanelCatalog,
  PanelInfo,
} from "@lichtblick/suite-base/context/PanelCatalogContext";
import * as panels from "@lichtblick/suite-base/panels";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import { PropsWithChildren, useMemo } from "react";
import { useTranslation } from "react-i18next";

type PanelProps = {
  config: unknown;
  saveConfig: SaveConfig<unknown>;
};

export default function PanelCatalogProvider(props: PropsWithChildren): React.ReactElement {
  const { t } = useTranslation("panels");

  const extensionPanels = useExtensionCatalog((state) => state.installedPanels);

  const wrappedExtensionPanels = useMemo<PanelInfo[]>(() => {
    return Object.values(extensionPanels ?? {}).map((panel) => {
      const panelType = `${panel.extensionName}.${panel.registration.name}`;
      const PanelWrapper = (panelProps: PanelProps) => {
        return (
          <>
            <PanelExtensionAdapter
              config={panelProps.config}
              saveConfig={panelProps.saveConfig}
              initPanel={panel.registration.initPanel}
            />
          </>
        );
      };
      PanelWrapper.panelType = panelType;
      PanelWrapper.defaultConfig = {};
      return {
        category: "misc",
        title: panel.registration.name,
        type: panelType,
        module: async () => ({ default: Panel(PanelWrapper) }),
        extensionNamespace: panel.extensionNamespace,
      };
    });
  }, [extensionPanels]);

  // Re-call the function when the language changes to ensure that the panel's information is successfully translated
  const allPanelsInfo = useMemo(() => {
    return {
      builtin: panels.getBuiltin(t),
    };
  }, [t]);

  const allPanels = useMemo(() => {
    return [...allPanelsInfo.builtin, ...wrappedExtensionPanels];
  }, [wrappedExtensionPanels, allPanelsInfo]);

  const visiblePanels = useMemo(() => {
    const panelList = [...allPanelsInfo.builtin];
    panelList.push(...wrappedExtensionPanels);
    return panelList;
  }, [wrappedExtensionPanels, allPanelsInfo]);

  const panelsByType = useMemo(() => {
    const byType = new Map<string, PanelInfo>();

    for (const panel of allPanels) {
      const type = panel.type;
      byType.set(type, panel);
    }
    return byType;
  }, [allPanels]);

  const provider = useMemo<PanelCatalog>(() => {
    return {
      getPanels() {
        return visiblePanels;
      },
      getPanelByType(type: string) {
        return panelsByType.get(type);
      },
    };
  }, [panelsByType, visiblePanels]);

  return (
    <PanelCatalogContext.Provider value={provider}>{props.children}</PanelCatalogContext.Provider>
  );
}
