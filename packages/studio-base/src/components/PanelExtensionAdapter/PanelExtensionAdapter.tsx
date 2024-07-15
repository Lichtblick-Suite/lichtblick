// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useTheme } from "@mui/material";
import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "react-use";
import { v4 as uuid } from "uuid";

import { useSynchronousMountedState, useValueChangedDebugLog } from "@foxglove/hooks";
import Logger from "@foxglove/log";
import { fromSec, toSec } from "@foxglove/rostime";
import {
  AppSettingValue,
  ExtensionPanelRegistration,
  PanelExtensionContext,
  ParameterValue,
  RenderState,
  SettingsTree,
  Subscription,
  Time,
  VariableValue,
} from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
  useMessagePipelineGetter,
} from "@foxglove/studio-base/components/MessagePipeline";
import { usePanelContext } from "@foxglove/studio-base/components/PanelContext";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { useAppConfiguration } from "@foxglove/studio-base/context/AppConfigurationContext";
import {
  ExtensionCatalog,
  useExtensionCatalog,
} from "@foxglove/studio-base/context/ExtensionCatalogContext";
import {
  useClearHoverValue,
  useHoverValue,
  useSetHoverValue,
} from "@foxglove/studio-base/context/TimelineInteractionStateContext";
import useGlobalVariables from "@foxglove/studio-base/hooks/useGlobalVariables";
import {
  AdvertiseOptions,
  PlayerCapabilities,
  PlayerPresence,
  SubscribePayload,
} from "@foxglove/studio-base/players/types";
import {
  useDefaultPanelTitle,
  usePanelSettingsTreeUpdate,
} from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { PanelConfig, SaveConfig } from "@foxglove/studio-base/types/panels";
import { assertNever } from "@foxglove/studio-base/util/assertNever";

import { PanelConfigVersionError } from "./PanelConfigVersionError";
import { initRenderStateBuilder } from "./renderState";
import { BuiltinPanelExtensionContext } from "./types";
import { useSharedPanelState } from "./useSharedPanelState";

const log = Logger.getLogger(__filename);

type VersionedPanelConfig = Record<string, unknown> & { [VERSION_CONFIG_KEY]: number };

export const VERSION_CONFIG_KEY = "foxgloveConfigVersion";

function isVersionedPanelConfig(config: unknown): config is VersionedPanelConfig {
  return (
    config != undefined &&
    typeof config === "object" &&
    VERSION_CONFIG_KEY in config &&
    typeof config[VERSION_CONFIG_KEY] === "number"
  );
}

type PanelExtensionAdapterProps = {
  /** function that initializes the panel extension */
  initPanel:
    | ExtensionPanelRegistration["initPanel"]
    | ((context: BuiltinPanelExtensionContext) => void);
  /**
   * If defined, the highest supported version of config the panel supports.
   * Used to prevent older implementations of a panel from trying to access
   * newer, incompatible versions of the panel's config. Panels should include a
   * numbered foxgloveConfigVersion property in their config to control this.
   */
  highestSupportedConfigVersion?: number;
  config: unknown;
  saveConfig: SaveConfig<unknown>;
};

function selectContext(ctx: MessagePipelineContext) {
  return ctx;
}

function selectInstalledMessageConverters(state: ExtensionCatalog) {
  return state.installedMessageConverters;
}

type RenderFn = NonNullable<PanelExtensionContext["onRender"]>;
/**
 * PanelExtensionAdapter renders a panel extension via initPanel
 *
 * The adapter creates a PanelExtensionContext and invokes initPanel using the context.
 */
function PanelExtensionAdapter(
  props: React.PropsWithChildren<PanelExtensionAdapterProps>,
): JSX.Element {
  const { initPanel, config, saveConfig, highestSupportedConfigVersion } = props;

  // Unlike the react data flow, the config is only provided to the panel once on setup.
  // The panel is meant to manage the config and call saveConfig on its own.
  //
  // We store the config in a ref to avoid re-initializing the panel when the react config
  // changes.
  const initialState = useLatest(config);

  const messagePipelineContext = useMessagePipeline(selectContext);

  const { playerState, pauseFrame, setSubscriptions, seekPlayback, sortedTopics } =
    messagePipelineContext;

  console.log("[Context] playerState: ", playerState);

  const { metadata } = playerState;

  const { capabilities, profile: dataSourceProfile, presence: playerPresence } = playerState;

  const { openSiblingPanel, setMessagePathDropConfig } = usePanelContext();

  const [panelId] = useState(() => uuid());
  const isMounted = useSynchronousMountedState();
  const [error, setError] = useState<Error | undefined>();
  const [watchedFields, setWatchedFields] = useState(new Set<keyof RenderState>());
  const messageConverters = useExtensionCatalog(selectInstalledMessageConverters);

  const [localSubscriptions, setLocalSubscriptions] = useState<Subscription[]>([]);

  const [appSettings, setAppSettings] = useState(new Map<string, AppSettingValue>());
  const [subscribedAppSettings, setSubscribedAppSettings] = useState<string[]>([]);

  const [renderFn, setRenderFn] = useState<RenderFn | undefined>();
  const isPanelInitializedRef = useRef(false);

  const [slowRender, setSlowRender] = useState(false);
  const [, setDefaultPanelTitle] = useDefaultPanelTitle();

  const { globalVariables, setGlobalVariables } = useGlobalVariables();

  const hoverValue = useHoverValue({
    componentId: `PanelExtensionAdapter:${panelId}`,
    isPlaybackSeconds: true,
  });
  const setHoverValue = useSetHoverValue();
  const clearHoverValue = useClearHoverValue();

  // track the advertisements requested by the panel context
  // topic -> advertisement
  const advertisementsRef = useRef(new Map<string, AdvertiseOptions>());

  const {
    palette: { mode: colorScheme },
  } = useTheme();

  const appConfiguration = useAppConfiguration();

  // The panel extension context exposes methods on the message pipeline. We don't want
  // the extension context to be re-created when the message pipeline changes since it only
  // needs to act on the latest version of the message pipeline.
  //
  // This getter allows the extension context to remain stable through pipeline changes
  const getMessagePipelineContext = useMessagePipelineGetter();

  // initRenderStateBuilder render produces a function which computes the latest render state from a set of inputs
  // Spiritually its like a reducer
  const [buildRenderState, setBuildRenderState] = useState(() => initRenderStateBuilder());

  const [sharedPanelState, setSharedPanelState] = useSharedPanelState();

  // Register handlers to update the app settings we subscribe to
  useEffect(() => {
    const handlers = new Map<string, (newValue: AppSettingValue) => void>();

    for (const key of subscribedAppSettings) {
      const handler = (newValue: AppSettingValue) => {
        setAppSettings((old) => {
          old.set(key, newValue);
          return new Map(old);
        });
      };
      handlers.set(key, handler);
      appConfiguration.addChangeListener(key, handler);
    }

    const newAppSettings = new Map<string, AppSettingValue>();
    for (const key of subscribedAppSettings) {
      newAppSettings.set(key, appConfiguration.get(key));
    }

    setAppSettings(newAppSettings);

    return () => {
      for (const [key, handler] of handlers.entries()) {
        appConfiguration.removeChangeListener(key, handler);
      }
    };
  }, [appConfiguration, subscribedAppSettings]);

  const messageEvents = useMemo(
    () => messagePipelineContext.messageEventsBySubscriberId.get(panelId),
    [messagePipelineContext.messageEventsBySubscriberId, panelId],
  );

  // The rendering ref is set when we've begin rendering the frame (calling the panel's render
  // function)
  //
  // If another update arrives before the panel finishes rendering, we will update the
  // slowRenderState to indicate that the panel could not keep up with rendering relative to
  // updates.
  const renderingRef = useRef<boolean>(false);
  useLayoutEffect(() => {
    /**
     * We need to check that the panel has been initialized because the renderFn function is being
     * called between the initPanel's useLayoutEffect cleanup and initPanel being called
     * again even if setRenderFn(undefined) is called in the cleanup function. This causes
     * the old renderFn to be called in this effect and pauseFrame to happen, but it is never
     * resumed, thus causing a 5 second delay in all panels in the layout to be loaded.
     */
    if (!renderFn || !isPanelInitializedRef.current) {
      return;
    }

    const renderState = buildRenderState({
      appSettings,
      colorScheme,
      currentFrame: messageEvents,
      globalVariables,
      hoverValue,
      messageConverters,
      playerState,
      sharedPanelState,
      sortedTopics,
      subscriptions: localSubscriptions,
      watchedFields,
    });

    if (!renderState) {
      return;
    }

    if (renderingRef.current) {
      setSlowRender(true);
      return;
    }

    setSlowRender(false);
    const resumeFrame = pauseFrame(panelId);

    // tell the panel to render and lockout future renders until rendering is complete
    renderingRef.current = true;
    try {
      setError(undefined);
      let doneCalled = false;
      renderFn(renderState, () => {
        // ignore any additional done calls from the panel
        if (doneCalled) {
          log.warn(`${panelId} called render done function twice`);
          return;
        }
        doneCalled = true;
        resumeFrame();
        renderingRef.current = false;
      });
    } catch (err) {
      setError(err);
    }
  }, [
    appSettings,
    buildRenderState,
    colorScheme,
    globalVariables,
    hoverValue,
    localSubscriptions,
    messageConverters,
    messageEvents,
    panelId,
    pauseFrame,
    playerState,
    renderFn,
    sharedPanelState,
    sortedTopics,
    watchedFields,
  ]);

  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  type PartialPanelExtensionContext = Omit<BuiltinPanelExtensionContext, "panelElement">;

  const partialExtensionContext = useMemo<PartialPanelExtensionContext>(() => {
    const layout: PanelExtensionContext["layout"] = {
      addPanel({ position, type, updateIfExists, getState }) {
        if (!isMounted()) {
          return;
        }
        switch (position) {
          case "sibling":
            openSiblingPanel({
              panelType: type,
              updateIfExists,
              siblingConfigCreator: (existingConfig) => getState(existingConfig) as PanelConfig,
            });
            return;
          default:
            assertNever(position, `Unsupported position for addPanel: ${position}`);
        }
      },
    };

    return {
      initialState: initialState.current,

      saveState: (state) => {
        if (!isMounted()) {
          return;
        }
        saveConfig(state);
      },

      layout,

      metadata,

      seekPlayback: seekPlayback
        ? (stamp: number | Time) => {
            if (!isMounted()) {
              return;
            }
            const seekTarget = typeof stamp === "object" ? stamp : fromSec(stamp);
            seekPlayback(seekTarget);
          }
        : undefined,

      dataSourceProfile,

      setParameter: (name: string, value: ParameterValue) => {
        if (!isMounted()) {
          return;
        }
        getMessagePipelineContext().setParameter(name, value);
      },

      setVariable: (name: string, value: VariableValue) => {
        if (!isMounted()) {
          return;
        }
        setGlobalVariables({ [name]: value });
      },

      setPreviewTime: (stamp: number | undefined) => {
        if (!isMounted()) {
          return;
        }
        if (stamp == undefined) {
          clearHoverValue("PanelExtensionAdatper");
        } else {
          const ctx = getMessagePipelineContext();
          const startTime = ctx.playerState.activeData?.startTime;
          // if we don't have a start time we cannot correctly set the playback seconds hover value
          // this hover value needs seconds from start
          if (!startTime) {
            return;
          }
          const secondsFromStart = stamp - toSec(startTime);
          setHoverValue({
            type: "PLAYBACK_SECONDS",
            componentId: "PanelExtensionAdatper",
            value: secondsFromStart,
          });
        }
      },

      setSharedPanelState,

      watch: (field: keyof RenderState) => {
        if (!isMounted()) {
          return;
        }
        setWatchedFields((old) => {
          if (old.has(field)) {
            // In React 18 we noticed that this setter function would be called in an infinite loop
            // even though watch() was not called repeatedly. Adding this early return of the old
            // value fixed the issue.
            return old;
          }
          const newWatchedFields = new Set(old);
          newWatchedFields.add(field);
          return newWatchedFields;
        });
      },

      subscribe: (topics: ReadonlyArray<string | Subscription>) => {
        if (!isMounted()) {
          return;
        }
        const subscribePayloads = topics.map((item): SubscribePayload => {
          if (typeof item === "string") {
            // For backwards compatability with the topic-string-array api `subscribe(["/topic"])`
            // results in a topic subscription with full preloading
            return { topic: item, preloadType: "full" };
          }

          return {
            topic: item.topic,
            preloadType: item.preload === true ? "full" : "partial",
          };
        });

        // ExtensionPanel-Facing subscription type
        const localSubs = topics.map((item): Subscription => {
          if (typeof item === "string") {
            return { topic: item, preload: true };
          }

          return item;
        });

        setLocalSubscriptions(localSubs);
        setSubscriptions(panelId, subscribePayloads);
      },

      advertise: capabilities.includes(PlayerCapabilities.advertise)
        ? (topic: string, datatype: string, options) => {
            if (!isMounted()) {
              return;
            }
            const payload: AdvertiseOptions = {
              topic,
              schemaName: datatype,
              options,
            };
            advertisementsRef.current.set(topic, payload);

            getMessagePipelineContext().setPublishers(
              panelId,
              Array.from(advertisementsRef.current.values()),
            );
          }
        : undefined,

      unadvertise: capabilities.includes(PlayerCapabilities.advertise)
        ? (topic: string) => {
            if (!isMounted()) {
              return;
            }
            advertisementsRef.current.delete(topic);
            getMessagePipelineContext().setPublishers(
              panelId,
              Array.from(advertisementsRef.current.values()),
            );
          }
        : undefined,

      publish: capabilities.includes(PlayerCapabilities.advertise)
        ? (topic, message) => {
            if (!isMounted()) {
              return;
            }
            getMessagePipelineContext().publish({
              topic,
              msg: message as Record<string, unknown>,
            });
          }
        : undefined,

      callService: capabilities.includes(PlayerCapabilities.callServices)
        ? async (service, request): Promise<unknown> => {
            if (!isMounted()) {
              throw new Error("Service call after panel was unmounted");
            }
            return await getMessagePipelineContext().callService(service, request);
          }
        : undefined,

      unstable_fetchAsset: async (uri, options) => {
        if (!isMounted()) {
          throw new Error("Asset fetch after panel was unmounted");
        }
        return await getMessagePipelineContext().fetchAsset(uri, options);
      },

      unsubscribeAll: () => {
        if (!isMounted()) {
          return;
        }
        setLocalSubscriptions([]);
        setSubscriptions(panelId, []);
      },

      subscribeAppSettings: (settings: string[]) => {
        if (!isMounted()) {
          return;
        }
        setSubscribedAppSettings(settings);
      },

      updatePanelSettingsEditor: (settings: SettingsTree) => {
        if (!isMounted()) {
          return;
        }
        updatePanelSettingsTree(settings);
      },

      setDefaultPanelTitle: (title: string) => {
        if (!isMounted()) {
          return;
        }
        setDefaultPanelTitle(title);
      },

      unstable_setMessagePathDropConfig(dropConfig) {
        setMessagePathDropConfig(dropConfig);
      },
    };
  }, [
    capabilities,
    clearHoverValue,
    dataSourceProfile,
    getMessagePipelineContext,
    initialState,
    isMounted,
    openSiblingPanel,
    panelId,
    saveConfig,
    seekPlayback,
    setDefaultPanelTitle,
    setGlobalVariables,
    setHoverValue,
    setSharedPanelState,
    setSubscriptions,
    updatePanelSettingsTree,
    setMessagePathDropConfig,
  ]);

  const panelContainerRef = useRef<HTMLDivElement>(ReactNull);

  useValueChangedDebugLog(initPanel, "initPanel");
  useValueChangedDebugLog(panelId, "panelId");
  useValueChangedDebugLog(partialExtensionContext, "partialExtensionContext");

  const configTooNew = useMemo(() => {
    const latestConfig = initialState.current;
    return (
      isVersionedPanelConfig(latestConfig) &&
      highestSupportedConfigVersion != undefined &&
      latestConfig[VERSION_CONFIG_KEY] > highestSupportedConfigVersion
    );
  }, [initialState, highestSupportedConfigVersion]);

  const playerIsInitializing = playerPresence === PlayerPresence.INITIALIZING;

  // Manage extension lifecycle by calling initPanel() when the panel context changes.
  //
  // If we useEffect here instead of useLayoutEffect, the prevRenderState can get polluted with data
  // from a previous panel instance.
  useLayoutEffect(() => {
    if (!panelContainerRef.current) {
      throw new Error("Expected panel container to be mounted");
    }

    // Also don't show panel when the player is initializing. The initializing state is temporary for
    // players to go through to load their sources. Once a player has completed initialization `initPanel` is called again (or even a few times),
    // because parts of the player context have changed. This cleans up the old panel that was present
    // during initialization. So there can be no state held between extension panels between initialization and
    // whatever follows it. To prevent this unnecessary render, we do not render the panel during initialization.
    if (configTooNew || playerIsInitializing) {
      return;
    }

    // Reset local state when the panel element is mounted or changes
    setRenderFn(undefined);
    renderingRef.current = false;
    setSlowRender(false);

    setBuildRenderState(() => initRenderStateBuilder());

    const panelElement = document.createElement("div");
    panelElement.style.width = "100%";
    panelElement.style.height = "100%";
    panelElement.style.overflow = "hidden";
    panelContainerRef.current.appendChild(panelElement);

    log.info(`Init panel ${panelId}`);
    const onUnmount = initPanel({
      panelElement,
      ...partialExtensionContext,

      // eslint-disable-next-line no-restricted-syntax
      set onRender(renderFunction: RenderFn | undefined) {
        setRenderFn(() => renderFunction);
      },
    });
    isPanelInitializedRef.current = true;

    return () => {
      if (onUnmount) {
        onUnmount();
      }
      isPanelInitializedRef.current = false;
      panelElement.remove();
      getMessagePipelineContext().setSubscriptions(panelId, []);
      getMessagePipelineContext().setPublishers(panelId, []);
    };
  }, [
    initPanel,
    panelId,
    partialExtensionContext,
    getMessagePipelineContext,
    configTooNew,
    playerIsInitializing,
  ]);

  const style: CSSProperties = {};
  if (slowRender) {
    style.borderColor = "orange";
    style.borderWidth = "1px";
    style.borderStyle = "solid";
  }

  if (error) {
    throw error;
  }

  return (
    <div
      style={{
        alignItems: "stretch",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        width: "100%",
        zIndex: 0,
        ...style,
      }}
    >
      <PanelToolbar />
      {configTooNew && <PanelConfigVersionError />}
      {props.children}
      <div style={{ flex: 1, overflow: "hidden" }} ref={panelContainerRef} />
    </div>
  );
}

export default PanelExtensionAdapter;
