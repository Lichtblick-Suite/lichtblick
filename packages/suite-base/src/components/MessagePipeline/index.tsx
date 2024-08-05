// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Immutable } from "@lichtblick/suite";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import CurrentLayoutContext, {
  LayoutState,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import {
  Player,
  PlayerProblem,
  PlayerState,
  SubscribePayload,
} from "@lichtblick/suite-base/players/types";
import * as _ from "lodash-es";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { StoreApi, useStore } from "zustand";

import MessageOrderTracker from "./MessageOrderTracker";
import { pauseFrameForPromises, FramePromise } from "./pauseFrameForPromise";
import {
  MessagePipelineInternalState,
  createMessagePipelineStore,
  defaultPlayerState,
} from "./store";
import { MessagePipelineContext } from "./types";

export type { MessagePipelineContext };

const EMPTY_GLOBAL_VARIABLES: GlobalVariables = Object.freeze({});

// exported only for MockMessagePipelineProvider
export const ContextInternal = createContext<StoreApi<MessagePipelineInternalState> | undefined>(
  undefined,
);

/**
 * useMessagePipelineGetter returns a function to access the current message pipeline context.
 * Commonly used in places where you want to access a value from the latest pipeline in a useCallback hook
 * but don't want the callback dependencies invalidated on ever change.
 *
 * @returns a function to return the current MessagePipelineContext
 */
export function useMessagePipelineGetter(): () => MessagePipelineContext {
  const store = useGuaranteedContext(ContextInternal);
  return useCallback(() => store.getState().public, [store]);
}

export function useMessagePipeline<T>(selector: (arg0: MessagePipelineContext) => T): T {
  const store = useGuaranteedContext(ContextInternal);
  return useStore(
    store,
    useCallback((state) => selector(state.public), [selector]),
  );
}

export function useMessagePipelineSubscribe(): (
  fn: (state: MessagePipelineContext) => void,
) => () => void {
  const store = useGuaranteedContext(ContextInternal);

  return useCallback(
    (fn: (state: MessagePipelineContext) => void) => {
      return store.subscribe((state) => {
        fn(state.public);
      });
    },
    [store],
  );
}

type ProviderProps = {
  children: React.ReactNode;

  // Represents either the lack of a player, a player that is currently being constructed, or a
  // valid player. MessagePipelineProvider is not responsible for building players, but it is
  // responsible for providing player state information downstream in a context -- so this
  // information is passed in and merged with other player state.
  player?: Player;
};

const selectRenderDone = (state: MessagePipelineInternalState) => state.renderDone;
const selectSubscriptions = (state: MessagePipelineInternalState) => state.public.subscriptions;

export function MessagePipelineProvider({ children, player }: ProviderProps): React.ReactElement {
  const promisesToWaitForRef = useRef<FramePromise[]>([]);

  // We make a new store when the player changes. This throws away any state from the previous store
  // and re-creates the pipeline functions and references. We make a new store to avoid holding onto
  // any state from the previous store.
  //
  // Note: This throws away any publishers, subscribers, etc that panels may have registered. We
  // are ok with this behavior because the <Workspace> re-mounts all panels when a player changes.
  // The re-mounted panels will re-initialize and setup new publishers and subscribers.
  const store = useMemo(() => {
    return createMessagePipelineStore({ promisesToWaitForRef, initialPlayer: player });
  }, [player]);

  const subscriptions = useStore(store, selectSubscriptions);

  // Debounce the subscription updates for players. This batches multiple subscribe calls
  // into one update for the player which avoids fetching data that will be immediately discarded.
  //
  // The delay of 0ms is intentional as we only want to give one timeout cycle to batch updates
  const debouncedPlayerSetSubscriptions = useMemo(() => {
    return _.debounce((subs: Immutable<SubscribePayload[]>) => {
      player?.setSubscriptions(subs);
    });
  }, [player]);

  // when unmounting or changing the debounce function cancel any pending debounce
  useEffect(() => {
    return () => {
      debouncedPlayerSetSubscriptions.cancel();
    };
  }, [debouncedPlayerSetSubscriptions]);

  useEffect(
    () => debouncedPlayerSetSubscriptions(subscriptions),
    [debouncedPlayerSetSubscriptions, subscriptions],
  );

  // Slow down the message pipeline framerate to the given FPS if it is set to less than 60
  const [messageRate] = useAppConfigurationValue<number>(AppSetting.MESSAGE_RATE);

  // Tell listener the layout has completed
  const renderDone = useStore(store, selectRenderDone);
  useLayoutEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const msPerFrameRef = useRef<number>(16);
  msPerFrameRef.current = 1000 / (messageRate ?? 60);

  // To avoid re-rendering the MessagePipelineProvider and all children when global variables change
  // we register a listener directly on the context to track updates to global variables.
  //
  // We don't need to re-render because there's no react state update in our component that needs
  // to render with this update.
  const currentLayoutContext = useContext(CurrentLayoutContext);

  useEffect(() => {
    // Track the last global variables we've received in the layout selector so we can avoid setting
    // the variables on a player unless they have changed because we don't want to tell a player about
    // new variables when there aren't any and make it potentially do work.
    let lastGlobalVariablesInstance: GlobalVariables | undefined =
      currentLayoutContext?.actions.getCurrentLayoutState().selectedLayout?.data?.globalVariables ??
      EMPTY_GLOBAL_VARIABLES;

    player?.setGlobalVariables(lastGlobalVariablesInstance);

    const onLayoutStateUpdate = (state: LayoutState) => {
      const globalVariables = state.selectedLayout?.data?.globalVariables ?? EMPTY_GLOBAL_VARIABLES;
      if (globalVariables !== lastGlobalVariablesInstance) {
        lastGlobalVariablesInstance = globalVariables;
        player?.setGlobalVariables(globalVariables);
      }
    };

    currentLayoutContext?.addLayoutStateListener(onLayoutStateUpdate);
    return () => {
      currentLayoutContext?.removeLayoutStateListener(onLayoutStateUpdate);
    };
  }, [currentLayoutContext, player]);

  useEffect(() => {
    const dispatch = store.getState().dispatch;
    if (!player) {
      // When there is no player, set the player state to the default to go back to a state where we
      // indicate the player is not present.
      dispatch({
        type: "update-player-state",
        playerState: defaultPlayerState(),
        renderDone: undefined,
      });
      return;
    }

    const { listener, cleanupListener } = createPlayerListener({
      msPerFrameRef,
      promisesToWaitForRef,
      store,
    });
    player.setListener(listener);
    return () => {
      cleanupListener();
      player.close();
      dispatch({
        type: "update-player-state",
        playerState: defaultPlayerState(),
        renderDone: undefined,
      });
    };
  }, [player, store]);

  return <ContextInternal.Provider value={store}>{children}</ContextInternal.Provider>;
}

// Given a PlayerState and a PlayerProblem array, add the problems to any existing player problems
function concatProblems(origState: PlayerState, problems: PlayerProblem[]): PlayerState {
  if (problems.length === 0) {
    return origState;
  }

  return {
    ...origState,
    problems: problems.concat(origState.problems ?? []),
  };
}

/**
 * The creation of the player listener is extracted as a separate function to prevent memory leaks.
 * When multiple closures are created inside of an outer function, V8 allocates one "context" object
 * to be shared by all the inner closures, holding the shared variables they access. As long as any
 * of the inner closures are still alive, the context and **all** the shared variables stay alive.
 *
 * In the case of MessagePipelineProvider, when the `listener` closure was created directly inside
 * the useEffect above, it would end up retaining a shared context that also retained the player
 * `state` variable returned by `usePlayerState()`, even though the listener closure didn't actually
 * use it. In particular, each time a new player was created in the useEffect, this caused it to
 * retain the old player's state (via the listener closure), creating a "linked list" effect that
 * caused the last state produced by each player (and therefore also its preloaded message blocks)
 * to be retained indefinitely as new data sources were swapped in.
 *
 * To avoid this problem, we extract the closure creation into a module-level function where it
 * won't see variables from outer scopes that are potentially retained in the shared context due to
 * their use in other closures.
 *
 * This type of leak is discussed at:
 * - https://bugs.chromium.org/p/chromium/issues/detail?id=315190
 * - http://point.davidglasser.net/2013/06/27/surprising-javascript-memory-leak.html
 * - https://stackoverflow.com/questions/53985411/understanding-javascript-closure-variable-capture-in-v8
 */
function createPlayerListener(args: {
  msPerFrameRef: React.MutableRefObject<number>;
  promisesToWaitForRef: React.MutableRefObject<FramePromise[]>;
  store: StoreApi<MessagePipelineInternalState>;
}): {
  listener: (state: PlayerState) => Promise<void>;
  cleanupListener: () => void;
} {
  const { msPerFrameRef, promisesToWaitForRef, store } = args;
  const updateState = store.getState().dispatch;
  const messageOrderTracker = new MessageOrderTracker();
  let closed = false;
  let prevPlayerId: string | undefined;
  let resolveFn: undefined | (() => void);
  const listener = async (listenerPlayerState: PlayerState) => {
    if (closed) {
      return;
    }

    if (resolveFn) {
      throw new Error("New playerState was emitted before last playerState was rendered.");
    }

    // check for any out-of-order or out-of-sync messages
    const problems = messageOrderTracker.update(listenerPlayerState);
    const newPlayerState = concatProblems(listenerPlayerState, problems);

    const promise = new Promise<void>((resolve) => {
      resolveFn = () => {
        resolveFn = undefined;
        resolve();
      };
    });

    // Track when we start the state update. This will pair when layout effect calls renderDone.
    const start = Date.now();

    // Render done is invoked by a layout effect once the component has rendered.
    // After the component renders, we kick off an animation frame to give panels one
    // animation frame to invoke pause.
    let called = false;
    function renderDone() {
      if (called) {
        return;
      }
      called = true;

      // Compute how much time remains before this frame is done
      const delta = Date.now() - start;
      const frameTime = Math.max(0, msPerFrameRef.current - delta);

      // Panels have the remaining frame time to invoke pause
      setTimeout(async () => {
        if (closed) {
          return;
        }

        const promisesToWaitFor = promisesToWaitForRef.current;
        if (promisesToWaitFor.length > 0) {
          promisesToWaitForRef.current = [];
          await pauseFrameForPromises(promisesToWaitFor);
        }

        if (!resolveFn) {
          return;
        }
        resolveFn();
      }, frameTime);
    }

    if (prevPlayerId != undefined && listenerPlayerState.playerId !== prevPlayerId) {
      store.getState().reset();
    }
    prevPlayerId = listenerPlayerState.playerId;

    updateState({
      type: "update-player-state",
      playerState: newPlayerState,
      renderDone,
    });

    await promise;
  };
  return {
    listener,
    cleanupListener() {
      closed = true;
      resolveFn = undefined;
    },
  };
}
