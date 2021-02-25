// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

// @ts-expect-error BrowserHistory is not in @types/history v4 declarations
import { BrowserHistory } from "history";
import React, { useCallback } from "react";
import { connect } from "react-redux";

import { loadLayout } from "@foxglove-studio/app/actions/panels";
import ShareJsonModal from "@foxglove-studio/app/components/ShareJsonModal";
import renderToBody from "@foxglove-studio/app/components/renderToBody";
import { State } from "@foxglove-studio/app/reducers";
import { PanelsState } from "@foxglove-studio/app/reducers/panels";

type OwnProps = {
  onRequestClose: () => void;
  history?: BrowserHistory;
};

type Props = OwnProps & {
  panels: PanelsState;
  loadLayout: typeof loadLayout;
};

function UnconnectedLayoutModal({
  onRequestClose,
  loadLayout: loadFetchedLayout,
  panels,
  history,
}: Props) {
  const onChange = useCallback(
    (layoutPayload: PanelsState) => {
      loadFetchedLayout(layoutPayload);
    },
    [loadFetchedLayout],
  );
  return (
    <ShareJsonModal
      history={history}
      onRequestClose={onRequestClose}
      value={panels}
      onChange={onChange}
      noun="layout"
    />
  );
}

// TODO(JP): Use useSelector and useDispatch here, but unfortunately `loadLayout` needs
// a `getState` function in addition to `dispatch`, so needs a bit of rework.
// @ts-ignore look into errors for connect generic args
const LayoutModal = connect<Props, OwnProps, _, _, _, _>(
  (state: State) => ({ panels: state.persistedState.panels }),
  { loadLayout },
)(UnconnectedLayoutModal);

export function openLayoutModal(history?: BrowserHistory) {
  const modal = renderToBody(
    <LayoutModal history={history} onRequestClose={() => modal.remove()} />,
  );
}
