/** @jest-environment jsdom */
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

import Panel from "@lichtblick/suite-base/components/Panel";
import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { PanelsActions } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { render, renderHook, act } from "@testing-library/react";
import { useEffect } from "react";

type DummyConfig = { someString: string };
type DummyProps = { config: DummyConfig; saveConfig: (arg0: Partial<DummyConfig>) => void };

function getDummyPanel(renderFn: jest.Mock) {
  function DummyComponent(props: DummyProps): ReactNull {
    // Call the mock function in an effect rather than during render, since render may happen more
    // than once due to React.StrictMode.
    useEffect(() => renderFn(props));
    return ReactNull;
  }
  DummyComponent.panelType = "Dummy";
  DummyComponent.defaultConfig = { someString: "hello world" };
  return Panel(DummyComponent);
}

describe("Panel", () => {
  beforeEach(() => {
    // jsdom can't parse our @container CSS so we have to silence console.error for this test.
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("saves defaultConfig when there is no saved config", async () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);
    const childId = "Dummy!1my2ydk";

    const actions: PanelsActions[] = [];
    render(
      <PanelSetup onLayoutAction={(action) => actions.push(action)}>
        <DummyPanel childId={childId} />
      </PanelSetup>,
    );

    expect(renderFn.mock.calls).toEqual([
      [{ config: { someString: "hello world" }, saveConfig: expect.any(Function) }],
      [{ config: { someString: "hello world" }, saveConfig: expect.any(Function) }],
      [{ config: { someString: "hello world" }, saveConfig: expect.any(Function) }],
    ]);

    expect(actions).toEqual([
      // first one is from PanelSetup
      {
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [{ id: childId, config: { someString: "hello world" } }] },
      },
    ]);
  });

  it("gets the config from the store", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);

    const childId = "Dummy!1my2ydk";
    const someString = "someNewString";

    const actions: PanelsActions[] = [];
    render(
      <PanelSetup
        fixture={{ savedProps: { [childId]: { someString } } }}
        onLayoutAction={(action) => actions.push(action)}
      >
        <DummyPanel childId={childId} />
      </PanelSetup>,
    );

    expect(renderFn.mock.calls).toEqual([
      [{ config: { someString }, saveConfig: expect.any(Function) }],
      [{ config: { someString }, saveConfig: expect.any(Function) }],
    ]);

    expect(actions).toEqual([
      {
        // initial save action is from PanelSetup
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [{ id: childId, config: { someString } }] },
      },
    ]);
  });

  it("merges saved config with defaultConfig when defaultConfig has new keys", async () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);
    const childId = "Dummy!1my2ydk";

    const actions: PanelsActions[] = [];
    render(
      <PanelSetup
        fixture={{ savedProps: { [childId]: { someNumber: 42 } } }}
        onLayoutAction={(action) => actions.push(action)}
      >
        <DummyPanel childId={childId} />
      </PanelSetup>,
    );

    expect(renderFn.mock.calls).toEqual([
      [{ config: { someNumber: 42, someString: "hello world" }, saveConfig: expect.any(Function) }],
      [{ config: { someNumber: 42, someString: "hello world" }, saveConfig: expect.any(Function) }],
      [{ config: { someNumber: 42, someString: "hello world" }, saveConfig: expect.any(Function) }],
    ]);

    expect(actions).toEqual([
      {
        // initial save action is from PanelSetup
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [{ id: childId, config: { someNumber: 42 } }] },
      },
      {
        type: "SAVE_PANEL_CONFIGS",
        payload: {
          configs: [{ id: childId, config: { someNumber: 42, someString: "hello world" } }],
        },
      },
    ]);
  });

  it("does not re-save configs when defaultConfig has fewer keys than saved config", async () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);
    const childId = "Dummy!1my2ydk";
    const someString = "someNewString";

    const actions: PanelsActions[] = [];
    render(
      <PanelSetup
        fixture={{ savedProps: { [childId]: { someNumber: 42, someString } } }}
        onLayoutAction={(action) => actions.push(action)}
      >
        <DummyPanel childId={childId} />
      </PanelSetup>,
    );

    expect(renderFn.mock.calls).toEqual([
      [{ config: { someNumber: 42, someString }, saveConfig: expect.any(Function) }],
      [{ config: { someNumber: 42, someString }, saveConfig: expect.any(Function) }],
    ]);

    expect(actions).toEqual([
      {
        // initial save action is from PanelSetup
        type: "SAVE_PANEL_CONFIGS",
        payload: { configs: [{ id: childId, config: { someNumber: 42, someString } }] },
      },
      // we do not expect a second save action
    ]);
  });

  it("does not rerender when another panel changes", () => {
    const renderFn = jest.fn();
    const DummyPanel = getDummyPanel(renderFn);
    const childId = "Dummy!1my2ydk";

    const { result: actions } = renderHook(() => useCurrentLayoutActions(), {
      wrapper({ children }) {
        return (
          <PanelSetup>
            {children}
            <DummyPanel childId={childId} />
          </PanelSetup>
        );
      },
    });

    expect(renderFn.mock.calls.length).toEqual(3);
    act(() => {
      actions.current.savePanelConfigs({ configs: [{ id: "someOtherId", config: {} }] });
    });
    expect(renderFn.mock.calls.length).toEqual(3);
  });
});
