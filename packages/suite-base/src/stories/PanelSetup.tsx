// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useShallowMemo } from "@lichtblick/hooks";
import {
  MessageEvent,
  ParameterValue,
  RegisterMessageConverterArgs,
  SettingsTree,
} from "@lichtblick/suite";
import MockMessagePipelineProvider from "@lichtblick/suite-base/components/MessagePipeline/MockMessagePipelineProvider";
import SettingsTreeEditor from "@lichtblick/suite-base/components/SettingsTreeEditor";
import AppConfigurationContext from "@lichtblick/suite-base/context/AppConfigurationContext";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { PanelsActions } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import PanelCatalogContext, {
  PanelCatalog,
} from "@lichtblick/suite-base/context/PanelCatalogContext";
import {
  PanelStateStore,
  usePanelStateStore,
} from "@lichtblick/suite-base/context/PanelStateContext";
import {
  UserScriptStateProvider,
  UserScriptStore,
  useUserScriptState,
} from "@lichtblick/suite-base/context/UserScriptStateContext";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import * as panels from "@lichtblick/suite-base/panels";
import { Diagnostic, UserScriptLog } from "@lichtblick/suite-base/players/UserScriptPlayer/types";
import {
  AdvertiseOptions,
  PlayerStateActiveData,
  Progress,
  PublishPayload,
  Topic,
} from "@lichtblick/suite-base/players/types";
import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";
import ExtensionCatalogProvider from "@lichtblick/suite-base/providers/ExtensionCatalogProvider";
import { PanelStateContextProvider } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import TimelineInteractionStateProvider from "@lichtblick/suite-base/providers/TimelineInteractionStateProvider";
import WorkspaceContextProvider from "@lichtblick/suite-base/providers/WorkspaceContextProvider";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { SavedProps, UserScripts } from "@lichtblick/suite-base/types/panels";
import { useTheme } from "@mui/material";
import { TFunction } from "i18next";
import * as _ from "lodash-es";
import { ComponentProps, ReactNode, useLayoutEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { Mosaic, MosaicNode, MosaicWindow } from "react-mosaic-component";

import "react-mosaic-component/react-mosaic-component.css";

function noop() {}

type Frame = {
  [topic: string]: MessageEvent[];
};

export type Fixture = {
  frame?: Frame;
  topics?: Topic[];
  capabilities?: string[];
  profile?: string;
  /** Do not include `messages` in player `activeData`.
   * Use `frame` instead, as it will populate player `activeData` automatically as necessary.
   */
  activeData?: Omit<Partial<PlayerStateActiveData>, "messages">;
  progress?: Progress;
  datatypes?: RosDatatypes;
  globalVariables?: GlobalVariables;
  layout?: MosaicNode<string>;
  userScripts?: UserScripts;
  userScriptDiagnostics?: { [scriptId: string]: readonly Diagnostic[] };
  userScriptLogs?: { [scriptId: string]: readonly UserScriptLog[] };
  userScriptRosLib?: string;
  savedProps?: SavedProps;
  publish?: (request: PublishPayload) => void;
  setPublishers?: (publisherId: string, advertisements: AdvertiseOptions[]) => void;
  setSubscriptions?: ComponentProps<typeof MockMessagePipelineProvider>["setSubscriptions"];
  setParameter?: (key: string, value: ParameterValue) => void;
  fetchAsset?: ComponentProps<typeof MockMessagePipelineProvider>["fetchAsset"];
  callService?: (service: string, request: unknown) => Promise<unknown>;
  messageConverters?: readonly RegisterMessageConverterArgs<unknown>[];
  panelState?: Partial<PanelStateStore>;
};

type UnconnectedProps = {
  children: React.ReactNode;
  fixture?: Fixture;
  includeSettings?: boolean;
  settingsWidth?: number;
  panelCatalog?: PanelCatalog;
  omitDragAndDrop?: boolean;
  pauseFrame?: ComponentProps<typeof MockMessagePipelineProvider>["pauseFrame"];
  style?: React.CSSProperties;
  // Needed for functionality not in React.CSSProperties, like child selectors: "& > *"
  className?: string;
};

function makeMockPanelCatalog(t: TFunction<"panels">): PanelCatalog {
  const allPanels = [...panels.getBuiltin(t)];

  const visiblePanels = [...panels.getBuiltin(t)];

  return {
    getPanels() {
      return visiblePanels;
    },
    getPanelByType(type: string) {
      return allPanels.find((panel) => panel.type === type);
    },
  };
}

export function triggerWheel(target: HTMLElement, deltaX: number): void {
  const event = new WheelEvent("wheel", { deltaX, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
}

const MosaicWrapper = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Mosaic
        className="mosaic-foxglove-theme" // prevent the default mosaic theme from being applied
        initialValue="mock"
        renderTile={(_id, path) => {
          return (
            <MosaicWindow title="" path={path} renderPreview={() => <div />}>
              {children}
            </MosaicWindow>
          );
        }}
      />
    </DndProvider>
  );
};

const EmptyTree: SettingsTree = {
  actionHandler: () => undefined,
  nodes: {},
};

function PanelWrapper({
  children,
  includeSettings = false,
  settingsWidth,
}: {
  children?: ReactNode;
  includeSettings?: boolean;
  settingsWidth?: number;
}): JSX.Element {
  const settings = usePanelStateStore((store) => {
    const trees = Object.values(store.settingsTrees);
    if (trees.length > 1) {
      throw new Error(
        `includeSettings requires there to be at most 1 panel, found ${trees.length}`,
      );
    }
    return trees[0] ?? EmptyTree;
  });

  return (
    <>
      {includeSettings && (
        <div style={{ overflow: "auto", width: settingsWidth }}>
          <SettingsTreeEditor variant="panel" settings={settings} />
        </div>
      )}
      {children}
    </>
  );
}

const defaultFetchAsset: ComponentProps<typeof MockMessagePipelineProvider>["fetchAsset"] = async (
  uri,
  options,
) => {
  const response = await fetch(uri, options);
  return {
    uri,
    data: new Uint8Array(await response.arrayBuffer()),
    mediaType: response.headers.get("content-type") ?? undefined,
  };
};

const selectUserScriptActions = (store: UserScriptStore) => store.actions;

function UnconnectedPanelSetup(props: UnconnectedProps): JSX.Element | ReactNull {
  const { t } = useTranslation("panels");
  const mockPanelCatalog = useMemo(
    () => props.panelCatalog ?? makeMockPanelCatalog(t),
    [props.panelCatalog, t],
  );
  const [mockAppConfiguration] = useState(() => ({
    get() {
      return undefined;
    },
    async set() {},
    addChangeListener() {},
    removeChangeListener() {},
  }));

  const actions = useCurrentLayoutActions();
  const { setUserScriptDiagnostics, addUserScriptLogs, setUserScriptRosLib } =
    useUserScriptState(selectUserScriptActions);
  const userScriptActions = useShallowMemo({
    setUserScriptDiagnostics,
    addUserScriptLogs,
    setUserScriptRosLib,
  });

  const [initialized, setInitialized] = useState(false);
  useLayoutEffect(() => {
    if (initialized) {
      return;
    }
    const {
      globalVariables,
      userScripts,
      layout,
      savedProps,
      userScriptDiagnostics,
      userScriptRosLib,
      userScriptLogs,
    } = props.fixture ?? {};
    if (globalVariables) {
      actions.overwriteGlobalVariables(globalVariables);
    }
    if (userScripts) {
      actions.setUserScripts(userScripts);
    }
    if (layout != undefined) {
      actions.changePanelLayout({ layout });
    }
    if (userScriptDiagnostics) {
      for (const [scriptId, diagnostics] of Object.entries(userScriptDiagnostics)) {
        userScriptActions.setUserScriptDiagnostics(scriptId, diagnostics);
      }
    }
    if (userScriptLogs) {
      for (const [scriptId, logs] of Object.entries(userScriptLogs)) {
        userScriptActions.addUserScriptLogs(scriptId, logs);
      }
    }
    if (userScriptRosLib != undefined) {
      userScriptActions.setUserScriptRosLib(userScriptRosLib);
    }
    if (savedProps) {
      actions.savePanelConfigs({
        configs: Object.entries(savedProps).map(([id, config]) => ({ id, config })),
      });
    }
    setInitialized(true);
  }, [initialized, props.fixture, actions, userScriptActions]);

  const {
    frame = {},
    topics = [],
    datatypes,
    capabilities,
    profile,
    activeData,
    progress,
    publish,
    setPublishers,
    setSubscriptions,
    setParameter,
    fetchAsset,
    callService,
  } = props.fixture ?? {};
  let dTypes = datatypes;
  if (!dTypes) {
    const dummyDatatypes: RosDatatypes = new Map();
    for (const { schemaName } of topics) {
      if (schemaName != undefined) {
        dummyDatatypes.set(schemaName, { definitions: [] });
      }
    }
    dTypes = dummyDatatypes;
  }
  const allData = _.flatten(Object.values(frame));

  const inner = (
    <div
      style={{ width: "100%", height: "100%", display: "flex", ...props.style }}
      className={props.className}
    >
      <MockMessagePipelineProvider
        capabilities={capabilities}
        topics={topics}
        datatypes={dTypes}
        messages={allData}
        pauseFrame={props.pauseFrame}
        profile={profile}
        activeData={activeData}
        progress={progress}
        publish={publish}
        startPlayback={noop}
        pausePlayback={noop}
        seekPlayback={noop}
        setPublishers={setPublishers}
        setSubscriptions={setSubscriptions}
        setParameter={setParameter}
        fetchAsset={fetchAsset ?? defaultFetchAsset}
        callService={callService}
      >
        <PanelCatalogContext.Provider value={mockPanelCatalog}>
          <AppConfigurationContext.Provider value={mockAppConfiguration}>
            <PanelWrapper
              includeSettings={props.includeSettings}
              settingsWidth={props.settingsWidth}
            >
              {props.children}
            </PanelWrapper>
          </AppConfigurationContext.Provider>
        </PanelCatalogContext.Provider>
      </MockMessagePipelineProvider>
    </div>
  );

  // Wait to render children until we've initialized state as requested in the fixture
  if (!initialized) {
    return ReactNull;
  }

  const { omitDragAndDrop = false } = props;
  return omitDragAndDrop ? inner : <MosaicWrapper>{inner}</MosaicWrapper>;
}

type Props = UnconnectedProps & {
  includeSettings?: boolean;
  settingsWidth?: number;
  onLayoutAction?: (action: PanelsActions) => void;
};

export default function PanelSetup(props: Props): JSX.Element {
  const theme = useTheme();
  return (
    <WorkspaceContextProvider disablePersistenceForStorybook>
      <UserScriptStateProvider>
        <TimelineInteractionStateProvider>
          <MockCurrentLayoutProvider onAction={props.onLayoutAction}>
            <PanelStateContextProvider initialState={props.fixture?.panelState}>
              <ExtensionCatalogProvider
                loaders={[]}
                mockMessageConverters={props.fixture?.messageConverters}
              >
                <ThemeProvider isDark={theme.palette.mode === "dark"}>
                  <UnconnectedPanelSetup {...props} />
                </ThemeProvider>
              </ExtensionCatalogProvider>
            </PanelStateContextProvider>
          </MockCurrentLayoutProvider>
        </TimelineInteractionStateProvider>
      </UserScriptStateProvider>
    </WorkspaceContextProvider>
  );
}
