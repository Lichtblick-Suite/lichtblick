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
import { render, unmountComponentAtNode } from "react-dom";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";

import getGlobalStore from "@foxglove-studio/app/store/getGlobalStore";
import history from "@foxglove-studio/app/util/history";

type RenderedToBodyHandle = { update: (arg0: React.ReactElement<any>) => void; remove: () => void };

// TODO(Audrey): change the `any` time to React.Element<*> and flow errors.
export default function renderToBody(element: any): RenderedToBodyHandle {
  const container = document.createElement("div");
  container.dataset.modalcontainer = "true";
  if (!document.body) {
    throw new Error("document.body not found"); // appease flow
  }
  document.body.appendChild(container);

  function ComponentToRender({ children }: any) {
    return (
      <Provider store={getGlobalStore()}>
        <Router history={history}>{children}</Router>
      </Provider>
    );
  }

  render(<ComponentToRender>{element}</ComponentToRender>, container);

  return {
    update(child: React.ReactElement<any>) {
      render(<ComponentToRender>{child}</ComponentToRender>, container);
    },

    remove() {
      unmountComponentAtNode(container);
      if (!document.body) {
        throw new Error("document.body not found"); // appease flow
      }
      document.body.removeChild(container);
    },
  };
}

export class RenderToBodyComponent extends React.Component<{ children: React.ReactElement<any> }> {
  _renderedToBodyHandle: RenderedToBodyHandle | null | undefined;

  componentDidMount() {
    this._renderedToBodyHandle = renderToBody(this.props.children);
  }

  componentDidUpdate() {
    if (this._renderedToBodyHandle) {
      this._renderedToBodyHandle.update(this.props.children);
    }
  }

  componentWillUnmount() {
    if (this._renderedToBodyHandle) {
      this._renderedToBodyHandle.remove();
    }
  }

  render() {
    return null;
  }
}
