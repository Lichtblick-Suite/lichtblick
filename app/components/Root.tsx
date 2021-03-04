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
import cx from "classnames";
import { ConnectedRouter } from "connected-react-router";
import { useEffect, useRef } from "react";
import { setConfig } from "react-hot-loader";
import { hot } from "react-hot-loader/root";
import { connect, Provider } from "react-redux";
import { Route } from "react-router";

import styles from "./Root.module.scss";
import { redoLayoutChange, undoLayoutChange } from "@foxglove-studio/app/actions/layoutHistory";
import { importPanelLayout } from "@foxglove-studio/app/actions/panels";
import AppMenu from "@foxglove-studio/app/components/AppMenu";
import ErrorBoundary from "@foxglove-studio/app/components/ErrorBoundary";
import LayoutMenu from "@foxglove-studio/app/components/LayoutMenu";
import NotificationDisplay from "@foxglove-studio/app/components/NotificationDisplay";
import PanelLayout from "@foxglove-studio/app/components/PanelLayout";
import PlaybackControls from "@foxglove-studio/app/components/PlaybackControls";
import PlayerManager from "@foxglove-studio/app/components/PlayerManager";
import ShortcutsModal from "@foxglove-studio/app/components/ShortcutsModal";
import { TinyConnectionPicker } from "@foxglove-studio/app/components/TinyConnectionPicker";
import Toolbar from "@foxglove-studio/app/components/Toolbar";
import withDragDropContext from "@foxglove-studio/app/components/withDragDropContext";
import { State } from "@foxglove-studio/app/reducers";
import getGlobalStore from "@foxglove-studio/app/store/getGlobalStore";
import browserHistory from "@foxglove-studio/app/util/history";
import inAutomatedRunMode from "@foxglove-studio/app/util/inAutomatedRunMode";

setConfig({
  // react-hot-loader re-writes hooks with a wrapper function that is designed
  // to be re-invoked on module updates. While good in some cases, reloading
  // hooks in webviz causes havoc on our internal state since we depend on a
  // hooks to initilialize playback.
  reloadHooks: false,
});

type Props = {
  onToolbarDoubleClick?: () => void;
};

type InternalProps = Props & {
  history: any;
  importPanelLayout: typeof importPanelLayout;
  redoStateCount: number;
  undoStateCount: number;
  redoLayoutChange: () => void;
  undoLayoutChange: () => void;
};

function App({ importPanelLayout: importPanelLayoutProp, onToolbarDoubleClick }: InternalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Focus on page load to enable keyboard interaction.
    if (containerRef.current) {
      containerRef.current.focus();
    }
    // Add a hook for integration tests.
    (window as any).setPanelLayout = (payload: any) => importPanelLayoutProp(payload);
  }, [importPanelLayoutProp]);

  return (
    <div ref={containerRef} className="app-container" tabIndex={0}>
      <Route path="/shortcuts" component={ShortcutsModal} />
      <PlayerManager>
        {({ inputDescription }: any) => (
          <>
            <Toolbar onDoubleClick={onToolbarDoubleClick}>
              <div className={styles.toolbarItem} style={{ marginRight: 5 }}>
                {!inAutomatedRunMode() && <NotificationDisplay />}
              </div>
              <div className={styles.toolbarItem}>
                <LayoutMenu />
              </div>
              <div className={styles.toolbarItem}>
                <AppMenu />
              </div>
              <div className={styles.toolbarItem}>
                <TinyConnectionPicker inputDescription={inputDescription} />
              </div>
            </Toolbar>
            <div className={cx(styles.layout, "PanelLayout-root")}>
              <PanelLayout />
            </div>
            <div className={styles["playback-controls"]}>
              <PlaybackControls />
            </div>
          </>
        )}
      </PlayerManager>
    </div>
  );
}

// @ts-ignore investigate this error with generic arg count
const ConnectedApp = connect<InternalProps, { history: any }, _, _, _, _>(
  ({ layoutHistory: { redoStates, undoStates } }: State) => ({
    redoStateCount: redoStates.length,
    undoStateCount: undoStates.length,
  }),
  { importPanelLayout, redoLayoutChange, undoLayoutChange },
)(withDragDropContext(App));

const Root = (props: Props) => {
  return (
    <Provider store={getGlobalStore()}>
      <ConnectedRouter history={browserHistory}>
        <ErrorBoundary>
          <Route
            path="/"
            render={({ history: routeHistory }) => (
              <ConnectedApp history={routeHistory} {...props} />
            )}
          />
        </ErrorBoundary>
      </ConnectedRouter>
    </Provider>
  );
};

export default hot(Root);
