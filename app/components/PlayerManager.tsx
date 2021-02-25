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

import * as React from "react";
import { connect } from "react-redux";

import {
  loadLayout as loadLayoutAction,
  setGlobalVariables,
} from "@foxglove-studio/app/actions/panels";
import {
  setUserNodeDiagnostics,
  addUserNodeLogs,
  setUserNodeRosLib,
  SetUserNodeDiagnostics,
  AddUserNodeLogs,
  SetUserNodeRosLib,
} from "@foxglove-studio/app/actions/userNodes";
import DocumentDropListener from "@foxglove-studio/app/components/DocumentDropListener";
import DropOverlay from "@foxglove-studio/app/components/DropOverlay";
import { getExperimentalFeature } from "@foxglove-studio/app/components/ExperimentalFeatures";
import { MessagePipelineProvider } from "@foxglove-studio/app/components/MessagePipeline";
import { CoreDataProviders } from "@foxglove-studio/app/dataProviders/constants";
import { getRemoteBagGuid } from "@foxglove-studio/app/dataProviders/getRemoteBagGuid";
import { rootGetDataProvider } from "@foxglove-studio/app/dataProviders/rootGetDataProvider";
import {
  getLocalBagDescriptor,
  getRemoteBagDescriptor,
} from "@foxglove-studio/app/dataProviders/standardDataProviderDescriptors";
import { DataProviderDescriptor } from "@foxglove-studio/app/dataProviders/types";
import { GlobalVariables } from "@foxglove-studio/app/hooks/useGlobalVariables";
import useUserNodes from "@foxglove-studio/app/hooks/useUserNodes";
import AutomatedRunPlayer from "@foxglove-studio/app/players/automatedRun/AutomatedRunPlayer";
import PerformanceMeasuringClient from "@foxglove-studio/app/players/automatedRun/performanceMeasuringClient";
import videoRecordingClient from "@foxglove-studio/app/players/automatedRun/videoRecordingClient";
import OrderedStampPlayer from "@foxglove-studio/app/players/OrderedStampPlayer";
import RandomAccessPlayer from "@foxglove-studio/app/players/RandomAccessPlayer";
import RosbridgePlayer from "@foxglove-studio/app/players/RosbridgePlayer";
import { useFileContext } from "@foxglove-studio/app/components/FileContext";
import { NotifyPlayerManagerReplyData, Player } from "@foxglove-studio/app/players/types";
import UserNodePlayer from "@foxglove-studio/app/players/UserNodePlayer";
import { UserNodes } from "@foxglove-studio/app/types/panels";
import { corsError } from "@foxglove-studio/app/util/corsError";
import demoLayoutJson from "@foxglove-studio/app/util/demoLayout.json";
import { getGlobalVariablesFromUrl } from "@foxglove-studio/app/util/getGlobalVariablesFromUrl";
import {
  DEMO_QUERY_KEY,
  LAYOUT_URL_QUERY_KEY,
  REMOTE_BAG_URL_2_QUERY_KEY,
  REMOTE_BAG_URL_QUERY_KEY,
  ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY,
  SECOND_SOURCE_PREFIX,
} from "@foxglove-studio/app/util/globalConstants";
import {
  inVideoRecordingMode,
  inPlaybackPerformanceMeasuringMode,
} from "@foxglove-studio/app/util/inAutomatedRunMode";
import sendNotification from "@foxglove-studio/app/util/sendNotification";
import { getSeekToTime, TimestampMethod } from "@foxglove-studio/app/util/time";

function buildPlayerFromDescriptor(childDescriptor: DataProviderDescriptor): Player {
  const unlimitedCache = getExperimentalFeature("unlimitedMemoryCache");
  const rootDescriptor = {
    name: CoreDataProviders.ParseMessagesDataProvider,
    args: {},
    children: [
      {
        name: CoreDataProviders.MemoryCacheDataProvider,
        args: { unlimitedCache },
        children: [
          {
            name: CoreDataProviders.RewriteBinaryDataProvider,
            args: {},
            children: [childDescriptor],
          },
        ],
      },
    ],
  };

  if (inVideoRecordingMode()) {
    return new AutomatedRunPlayer(rootGetDataProvider(rootDescriptor), videoRecordingClient);
  }
  if (inPlaybackPerformanceMeasuringMode()) {
    return new AutomatedRunPlayer(
      rootGetDataProvider(rootDescriptor),
      new PerformanceMeasuringClient(),
    );
  }
  return new RandomAccessPlayer(rootDescriptor, {
    metricsCollector: undefined,
    seekToTime: getSeekToTime(),
    notifyPlayerManager: async (): Promise<NotifyPlayerManagerReplyData | null | undefined> => {
      // no-op
      return;
    },
  });
}

type PlayerDefinition = { player: Player; inputDescription: React.ReactNode };

function buildPlayerFromFiles(files: File[]): PlayerDefinition | null | undefined {
  if (files.length === 0) {
    return undefined;
  } else if (files.length === 1) {
    return {
      player: buildPlayerFromDescriptor(getLocalBagDescriptor(files[0])),
      inputDescription: (
        <>
          Using local bag file <code>{files[0].name}</code>.
        </>
      ),
    };
  } else if (files.length === 2) {
    return {
      player: buildPlayerFromDescriptor({
        name: CoreDataProviders.CombinedDataProvider,
        args: {},
        children: [
          getLocalBagDescriptor(files[0]),
          {
            name: CoreDataProviders.RenameDataProvider,
            args: { prefix: SECOND_SOURCE_PREFIX },
            children: [getLocalBagDescriptor(files[1])],
          },
        ],
      }),
      inputDescription: (
        <>
          Using local bag files <code>{files[0].name}</code> and <code>{files[1].name}</code>.
        </>
      ),
    };
  }
  throw new Error(`Unsupported number of files: ${files.length}`);
}

async function buildPlayerFromBagURLs(
  urls: string[],
): Promise<PlayerDefinition | null | undefined> {
  const guids: (string | null | undefined)[] = await Promise.all(urls.map(getRemoteBagGuid));

  if (urls.length === 0) {
    return undefined;
  } else if (urls.length === 1) {
    return {
      player: buildPlayerFromDescriptor(getRemoteBagDescriptor(urls[0], guids[0])),
      inputDescription: (
        <>
          Streaming bag from <code>{urls[0]}</code>.
        </>
      ),
    };
  } else if (urls.length === 2) {
    return {
      player: buildPlayerFromDescriptor({
        name: CoreDataProviders.CombinedDataProvider,
        args: {},
        children: [
          getRemoteBagDescriptor(urls[0], guids[0]),
          {
            name: CoreDataProviders.RenameDataProvider,
            args: { prefix: SECOND_SOURCE_PREFIX },
            children: [getRemoteBagDescriptor(urls[1], guids[1])],
          },
        ],
      }),
      inputDescription: (
        <>
          Streaming bag from <code>{urls[0]}</code> and <code>{urls[1]}</code>.
        </>
      ),
    };
  }
  throw new Error(`Unsupported number of urls: ${urls.length}`);
}

type OwnProps = { children: (arg0: { inputDescription: React.ReactNode }) => React.ReactNode };

type Props = OwnProps & {
  loadLayout: typeof loadLayoutAction;
  messageOrder: TimestampMethod;
  userNodes: UserNodes;
  globalVariables: GlobalVariables;
  setUserNodeDiagnostics: SetUserNodeDiagnostics;
  addUserNodeLogs: AddUserNodeLogs;
  setUserNodeRosLib: SetUserNodeRosLib;
  setGlobalVariables: typeof setGlobalVariables;
};

function PlayerManager({
  loadLayout,
  children,
  messageOrder,
  userNodes,
  globalVariables,
  setUserNodeDiagnostics: setDiagnostics,
  addUserNodeLogs: setLogs,
  setUserNodeRosLib: setRosLib,
  setGlobalVariables: setVariables,
}: Props) {
  const usedFiles = React.useRef<File[]>([]);
  const globalVariablesRef = React.useRef<GlobalVariables>(globalVariables);
  const [player, setPlayerInternal] = React.useState<OrderedStampPlayer | null | undefined>();
  const [inputDescription, setInputDescription] = React.useState<React.ReactNode>(
    "No input selected.",
  );

  const fileContext = useFileContext();

  // We don't want to recreate the player when the message order changes, but we do want to
  // initialize it with the right order, so make a variable for its initial value we can use in the
  // dependency array below to defeat the linter.
  const [initialMessageOrder] = React.useState(messageOrder);
  const setPlayer = React.useCallback(
    (playerDefinition: PlayerDefinition | null | undefined) => {
      if (!playerDefinition) {
        setPlayerInternal(undefined);
        setInputDescription("No input selected.");
        return;
      }
      setInputDescription(playerDefinition.inputDescription);
      const userNodePlayer = new UserNodePlayer(playerDefinition.player, {
        setUserNodeDiagnostics: setDiagnostics,
        addUserNodeLogs: setLogs,
        setUserNodeRosLib: setRosLib,
      });
      const headerStampPlayer = new OrderedStampPlayer(userNodePlayer, initialMessageOrder);
      headerStampPlayer.setGlobalVariables(globalVariablesRef.current);
      setPlayerInternal(headerStampPlayer);
    },
    [setDiagnostics, setLogs, setRosLib, initialMessageOrder],
  );

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const globalVariablesFromUrl = getGlobalVariablesFromUrl(params);
    if (globalVariablesFromUrl) {
      setVariables(globalVariablesFromUrl);
    }

    // For testing, you can use ?layout-url=https://open-source-webviz-ui.s3.amazonaws.com/demoLayout.json
    const layoutUrl = params.get(LAYOUT_URL_QUERY_KEY);
    if (layoutUrl) {
      fetch(layoutUrl)
        .then((response) => (response ? response.json() : undefined))
        .then((json) => {
          if (json) {
            loadLayout({ ...json, skipSettingLocalStorage: false });
          }
        })
        .catch((error) => {
          sendNotification(
            "Layout failed to load",
            `Fetching remote file failed. ${corsError(layoutUrl)} ${error}`,
            "user",
            "error",
          );
        });
    } else if (params.has(DEMO_QUERY_KEY)) {
      loadLayout({ ...(demoLayoutJson as any), skipSettingLocalStorage: true });
    }

    const remoteDemoBagUrl = "https://open-source-webviz-ui.s3.amazonaws.com/demo.bag";
    if (params.has(DEMO_QUERY_KEY)) {
      buildPlayerFromBagURLs([remoteDemoBagUrl]).then(
        (playerDefinition: PlayerDefinition | null | undefined) => {
          setPlayer(playerDefinition);
          // When we're showing a demo, then automatically start playback (we don't normally
          // do that).
          if (playerDefinition) {
            setTimeout(() => {
              playerDefinition.player.startPlayback();
            }, 1000);
          }
        },
      );
    }
    if (params.has(REMOTE_BAG_URL_QUERY_KEY)) {
      const urls = [
        params.get(REMOTE_BAG_URL_QUERY_KEY),
        params.get(REMOTE_BAG_URL_2_QUERY_KEY),
      ].filter(Boolean);
      buildPlayerFromBagURLs(urls as any).then(
        (playerDefinition: PlayerDefinition | null | undefined) => {
          setPlayer(playerDefinition);
        },
      );
    } else if (fileContext) {
      setPlayer(buildPlayerFromFiles([fileContext]));
    } else {
      const websocketUrl = params.get(ROSBRIDGE_WEBSOCKET_URL_QUERY_KEY);
      if (!websocketUrl) {
        return;
      }

      setPlayer({
        player: new RosbridgePlayer(websocketUrl),
        inputDescription: (
          <>
            Using WebSocket at <code>{websocketUrl}</code>.
          </>
        ),
      });
    }
  }, [loadLayout, setPlayer, setVariables, fileContext]);

  React.useEffect(() => {
    if (player) {
      player.setMessageOrder(messageOrder);
    }
  }, [messageOrder, player]);
  useUserNodes({ nodePlayer: player, userNodes });

  return (
    <>
      <DocumentDropListener
        filesSelected={({
          files,
          shiftPressed,
        }: {
          files: FileList | File[];
          shiftPressed: boolean;
        }) => {
          if (shiftPressed && usedFiles.current.length === 1) {
            usedFiles.current = [usedFiles.current[0], files[0]];
          } else if (files.length === 2) {
            usedFiles.current = [...files];
          } else {
            usedFiles.current = [files[0]];
          }
          setPlayer(buildPlayerFromFiles(usedFiles.current));
        }}
      >
        <DropOverlay>
          <div style={{ fontSize: "4em", marginBottom: "1em" }}>Drop a bag file to load it!</div>
          <div style={{ fontSize: "2em" }}>
            (hold SHIFT while dropping a second bag file to add it
            <br />
            with all topics prefixed with {SECOND_SOURCE_PREFIX})
          </div>
        </DropOverlay>
      </DocumentDropListener>
      <MessagePipelineProvider player={player} globalVariables={globalVariables}>
        {children({ inputDescription })}
      </MessagePipelineProvider>
    </>
  );
}

// @ts-ignore investigate error with generic arguments
export default connect<Props, OwnProps, _, _, _, _>(
  (state: any) => ({
    messageOrder: state.persistedState.panels.playbackConfig.messageOrder,
    userNodes: state.persistedState.panels.userNodes,
    globalVariables: state.persistedState.panels.globalVariables,
  }),
  {
    loadLayout: loadLayoutAction,
    setUserNodeDiagnostics,
    addUserNodeLogs,
    setUserNodeRosLib,
    setGlobalVariables,
  },
)(PlayerManager);
