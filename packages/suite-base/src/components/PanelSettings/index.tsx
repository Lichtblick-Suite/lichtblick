// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTree } from "@lichtblick/suite";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useConfigById } from "@lichtblick/suite-base/PanelAPI";
import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import { ActionMenu } from "@lichtblick/suite-base/components/PanelSettings/ActionMenu";
import SettingsTreeEditor from "@lichtblick/suite-base/components/SettingsTreeEditor";
import { ShareJsonModal } from "@lichtblick/suite-base/components/ShareJsonModal";
import { SidebarContent } from "@lichtblick/suite-base/components/SidebarContent";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
  useSelectedPanels,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { usePanelCatalog } from "@lichtblick/suite-base/context/PanelCatalogContext";
import {
  PanelStateStore,
  usePanelStateStore,
} from "@lichtblick/suite-base/context/PanelStateContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import { PanelConfig } from "@lichtblick/suite-base/types/panels";
import { TAB_PANEL_TYPE } from "@lichtblick/suite-base/util/globalConstants";
import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";
import { Divider, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUnmount } from "react-use";

const singlePanelIdSelector = (state: LayoutState) =>
  typeof state.selectedLayout?.data?.layout === "string"
    ? state.selectedLayout.data.layout
    : undefined;

const selectIncrementSequenceNumber = (store: PanelStateStore) => store.incrementSequenceNumber;

const EMPTY_SETTINGS_TREE: SettingsTree = Object.freeze({
  actionHandler: () => undefined,
  nodes: {},
});

const EmptyWrapper = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation("panelSettings");
  const [enableNewTopNav = true] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  if (enableNewTopNav) {
    return <EmptyState>{children}</EmptyState>;
  }

  return (
    <SidebarContent title={t("panelSettings")}>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </SidebarContent>
  );
};

export default function PanelSettings({
  disableToolbar = false,
  selectedPanelIdsForTests,
}: React.PropsWithChildren<{
  disableToolbar?: boolean;
  selectedPanelIdsForTests?: readonly string[];
}>): JSX.Element {
  const { t } = useTranslation("panelSettings");
  const singlePanelId = useCurrentLayoutSelector(singlePanelIdSelector);
  const {
    selectedPanelIds: originalSelectedPanelIds,
    setSelectedPanelIds,
    selectAllPanels,
  } = useSelectedPanels();
  const selectedPanelIds = selectedPanelIdsForTests ?? originalSelectedPanelIds;

  const [enableNewTopNav = true] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  // If no panel is selected and there is only one panel in the layout, select it
  useEffect(() => {
    if (selectedPanelIds.length === 0 && singlePanelId != undefined) {
      selectAllPanels();
    }
  }, [selectAllPanels, selectedPanelIds, singlePanelId]);

  const selectedPanelId = useMemo(
    () => (selectedPanelIds.length === 1 ? selectedPanelIds[0] : undefined),
    [selectedPanelIds],
  );

  // Automatically deselect the panel we were editing when the settings sidebar closes
  useUnmount(() => {
    if (selectedPanelId != undefined) {
      setSelectedPanelIds([]);
    }
  });

  const panelCatalog = usePanelCatalog();
  const { getCurrentLayoutState: getCurrentLayout, savePanelConfigs } = useCurrentLayoutActions();
  const panelType = useMemo(
    () => (selectedPanelId != undefined ? getPanelTypeFromId(selectedPanelId) : undefined),
    [selectedPanelId],
  );
  const panelInfo = useMemo(
    () => (panelType != undefined ? panelCatalog.getPanelByType(panelType) : undefined),
    [panelCatalog, panelType],
  );

  const incrementSequenceNumber = usePanelStateStore(selectIncrementSequenceNumber);

  const [showShareModal, setShowShareModal] = useState(false);
  const shareModal = useMemo(() => {
    const panelConfigById = getCurrentLayout().selectedLayout?.data?.configById;
    if (selectedPanelId == undefined || !showShareModal || !panelConfigById) {
      return ReactNull;
    }
    return (
      <ShareJsonModal
        onRequestClose={() => {
          setShowShareModal(false);
        }}
        initialValue={panelConfigById[selectedPanelId] ?? {}}
        onChange={(config) => {
          savePanelConfigs({
            configs: [{ id: selectedPanelId, config: config as PanelConfig, override: true }],
          });
          incrementSequenceNumber(selectedPanelId);
        }}
        title={t("importOrExportSettings")}
      />
    );
  }, [
    getCurrentLayout,
    selectedPanelId,
    showShareModal,
    savePanelConfigs,
    incrementSequenceNumber,
    t,
  ]);

  const [config] = useConfigById(selectedPanelId);

  const settingsTree = usePanelStateStore((state) =>
    selectedPanelId ? state.settingsTrees[selectedPanelId] : undefined,
  );

  const resetToDefaults = useCallback(() => {
    if (selectedPanelId) {
      savePanelConfigs({
        configs: [{ id: selectedPanelId, config: {}, override: true }],
      });
      incrementSequenceNumber(selectedPanelId);
    }
  }, [incrementSequenceNumber, savePanelConfigs, selectedPanelId]);

  if (selectedPanelId == undefined) {
    return <EmptyWrapper>{t("selectAPanelToEditItsSettings")}</EmptyWrapper>;
  }

  if (!config) {
    return <EmptyWrapper>{t("loadingPanelSettings")}</EmptyWrapper>;
  }

  const showTitleField = panelInfo != undefined && panelInfo.hasCustomToolbar !== true;
  const title = panelInfo?.title ?? t("unknown");
  const isSettingTreeDefined = settingsTree != undefined;

  return (
    <SidebarContent
      disablePadding={enableNewTopNav || isSettingTreeDefined}
      disableToolbar={disableToolbar}
      title={t("currentSettingsPanelName", { title })}
      trailingItems={[
        <ActionMenu
          key={1}
          allowShare={panelType !== TAB_PANEL_TYPE}
          onReset={resetToDefaults}
          onShare={() => {
            setShowShareModal(true);
          }}
        />,
      ]}
    >
      {shareModal}
      <Stack gap={2} justifyContent="flex-start" flex="auto">
        <Stack flex="auto">
          {settingsTree && enableNewTopNav && (
            <>
              <Stack
                paddingLeft={0.75}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle2">{t("panelName", { title })}</Typography>
                <ActionMenu
                  key={1}
                  fontSize="small"
                  allowShare={panelType !== TAB_PANEL_TYPE}
                  onReset={resetToDefaults}
                  onShare={() => {
                    setShowShareModal(true);
                  }}
                />
              </Stack>
              <Divider />
            </>
          )}
          {settingsTree || showTitleField ? (
            <SettingsTreeEditor
              key={selectedPanelId}
              settings={settingsTree ?? EMPTY_SETTINGS_TREE}
              variant="log"
            />
          ) : (
            <Stack
              flex="auto"
              alignItems="center"
              justifyContent="center"
              paddingX={enableNewTopNav ? 1 : 0}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {t("panelDoesNotHaveSettings")}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </SidebarContent>
  );
}
