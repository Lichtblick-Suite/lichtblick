//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

// @ts-expect-error BrowserHistory is not in @types/history v4 declarations
import { BrowserHistory } from "history";
import React, { useCallback } from "react";
import { connect } from "react-redux";

import { loadLayout } from "@foxglove-studio/app/actions/panels";
import renderToBody from "@foxglove-studio/app/components/renderToBody";
import ShareJsonModal from "@foxglove-studio/app/components/ShareJsonModal";
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
