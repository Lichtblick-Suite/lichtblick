// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IdbLayoutStorage } from "@lichtblick/suite-base/IdbLayoutStorage";
import GlobalCss from "@lichtblick/suite-base/components/GlobalCss";
import LayoutStorageContext from "@lichtblick/suite-base/context/LayoutStorageContext";
import { UserScriptStateProvider } from "@lichtblick/suite-base/context/UserScriptStateContext";
import EventsProvider from "@lichtblick/suite-base/providers/EventsProvider";
import LayoutManagerProvider from "@lichtblick/suite-base/providers/LayoutManagerProvider";
import ProblemsContextProvider from "@lichtblick/suite-base/providers/ProblemsContextProvider";
import { StudioLogsSettingsProvider } from "@lichtblick/suite-base/providers/StudioLogsSettingsProvider";
import TimelineInteractionStateProvider from "@lichtblick/suite-base/providers/TimelineInteractionStateProvider";
import UserProfileLocalStorageProvider from "@lichtblick/suite-base/providers/UserProfileLocalStorageProvider";
import { LayoutLoader } from "@lichtblick/suite-base/services/ILayoutLoader";
import { Fragment, Suspense, useEffect, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import Workspace from "./Workspace";
import { CustomWindowControlsProps } from "./components/AppBar/CustomWindowControls";
import { ColorSchemeThemeProvider } from "./components/ColorSchemeThemeProvider";
import CssBaseline from "./components/CssBaseline";
import DocumentTitleAdapter from "./components/DocumentTitleAdapter";
import ErrorBoundary from "./components/ErrorBoundary";
import MultiProvider from "./components/MultiProvider";
import PlayerManager from "./components/PlayerManager";
import SendNotificationToastAdapter from "./components/SendNotificationToastAdapter";
import StudioToastProvider from "./components/StudioToastProvider";
import AppConfigurationContext, { IAppConfiguration } from "./context/AppConfigurationContext";
import NativeAppMenuContext, { INativeAppMenu } from "./context/NativeAppMenuContext";
import NativeWindowContext, { INativeWindow } from "./context/NativeWindowContext";
import { IDataSourceFactory } from "./context/PlayerSelectionContext";
import CurrentLayoutProvider from "./providers/CurrentLayoutProvider";
import ExtensionCatalogProvider from "./providers/ExtensionCatalogProvider";
import ExtensionMarketplaceProvider from "./providers/ExtensionMarketplaceProvider";
import PanelCatalogProvider from "./providers/PanelCatalogProvider";
import { LaunchPreference } from "./screens/LaunchPreference";
import { ExtensionLoader } from "./services/ExtensionLoader";

type AppProps = CustomWindowControlsProps & {
  deepLinks: string[];
  appConfiguration: IAppConfiguration;
  dataSources: IDataSourceFactory[];
  extensionLoaders: readonly ExtensionLoader[];
  layoutLoaders: readonly LayoutLoader[];
  nativeAppMenu?: INativeAppMenu;
  nativeWindow?: INativeWindow;
  enableLaunchPreferenceScreen?: boolean;
  enableGlobalCss?: boolean;
  appBarLeftInset?: number;
  extraProviders?: JSX.Element[];
  onAppBarDoubleClick?: () => void;
};

// Suppress context menu for the entire app except on inputs & textareas.
function contextMenuHandler(event: MouseEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  event.preventDefault();
  return false;
}

export function App(props: AppProps): JSX.Element {
  const {
    appConfiguration,
    dataSources,
    extensionLoaders,
    layoutLoaders,
    nativeAppMenu,
    nativeWindow,
    deepLinks,
    enableLaunchPreferenceScreen,
    enableGlobalCss = false,
    extraProviders,
  } = props;

  const providers = [
    /* eslint-disable react/jsx-key */
    <TimelineInteractionStateProvider />,
    <UserScriptStateProvider />,
    <ExtensionMarketplaceProvider />,
    <ExtensionCatalogProvider loaders={extensionLoaders} />,
    <PlayerManager playerSources={dataSources} />,
    <EventsProvider />,
    /* eslint-enable react/jsx-key */
  ];

  if (nativeAppMenu) {
    providers.push(<NativeAppMenuContext.Provider value={nativeAppMenu} />);
  }

  if (nativeWindow) {
    providers.push(<NativeWindowContext.Provider value={nativeWindow} />);
  }

  if (extraProviders) {
    providers.unshift(...extraProviders);
  }

  // The toast and logs provider comes first so they are available to all downstream providers
  providers.unshift(<StudioToastProvider />);
  providers.unshift(<StudioLogsSettingsProvider />);

  // Problems provider also must come before other, dependent contexts.
  providers.unshift(<ProblemsContextProvider />);
  providers.unshift(<CurrentLayoutProvider />);
  providers.unshift(<UserProfileLocalStorageProvider />);
  providers.unshift(<LayoutManagerProvider loaders={layoutLoaders} />);

  const layoutStorage = useMemo(() => new IdbLayoutStorage(), []);
  providers.unshift(<LayoutStorageContext.Provider value={layoutStorage} />);

  const MaybeLaunchPreference = enableLaunchPreferenceScreen === true ? LaunchPreference : Fragment;

  useEffect(() => {
    document.addEventListener("contextmenu", contextMenuHandler);
    return () => {
      document.removeEventListener("contextmenu", contextMenuHandler);
    };
  }, []);

  return (
    <AppConfigurationContext.Provider value={appConfiguration}>
      <ColorSchemeThemeProvider>
        {enableGlobalCss && <GlobalCss />}
        <CssBaseline>
          <ErrorBoundary>
            <MaybeLaunchPreference>
              <MultiProvider providers={providers}>
                <DocumentTitleAdapter />
                <SendNotificationToastAdapter />
                <DndProvider backend={HTML5Backend}>
                  <Suspense fallback={<></>}>
                    <PanelCatalogProvider>
                      <Workspace
                        deepLinks={deepLinks}
                        appBarLeftInset={props.appBarLeftInset}
                        onAppBarDoubleClick={props.onAppBarDoubleClick}
                        showCustomWindowControls={props.showCustomWindowControls}
                        isMaximized={props.isMaximized}
                        onMinimizeWindow={props.onMinimizeWindow}
                        onMaximizeWindow={props.onMaximizeWindow}
                        onUnmaximizeWindow={props.onUnmaximizeWindow}
                        onCloseWindow={props.onCloseWindow}
                      />
                    </PanelCatalogProvider>
                  </Suspense>
                </DndProvider>
              </MultiProvider>
            </MaybeLaunchPreference>
          </ErrorBoundary>
        </CssBaseline>
      </ColorSchemeThemeProvider>
    </AppConfigurationContext.Provider>
  );
}
