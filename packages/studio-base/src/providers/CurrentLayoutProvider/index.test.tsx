/** @jest-environment jsdom */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { act, render, renderHook } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { useEffect } from "react";

import { Condvar } from "@foxglove/den/async";
import { CurrentLayoutSyncAdapter } from "@foxglove/studio-base/components/CurrentLayoutSyncAdapter";
import {
  CurrentLayoutActions,
  LayoutData,
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import LayoutManagerContext from "@foxglove/studio-base/context/LayoutManagerContext";
import { UserProfileStorageContext } from "@foxglove/studio-base/context/UserProfileStorageContext";
import CurrentLayoutProvider, {
  MAX_SUPPORTED_LAYOUT_VERSION,
} from "@foxglove/studio-base/providers/CurrentLayoutProvider";
import LayoutManagerProvider from "../LayoutManagerProvider";

function mockThrow(name: string) {
  return () => {
    throw new Error(`Unexpected mock function call ${name}`);
  };
}

function makeMockLayoutManager() {
  return {
    supportsSharing: false,
    supportsSyncing: false,
    isBusy: false,
    isOnline: false,
    error: undefined,
    on: jest.fn(/*noop*/),
    off: jest.fn(/*noop*/),
    setError: jest.fn(/*noop*/),
    setOnline: jest.fn(/*noop*/),
    getLayouts: jest.fn().mockImplementation(mockThrow("getLayouts")),
    getLayout: jest.fn().mockImplementation(mockThrow("getLayout")),
    saveNewLayout: jest.fn().mockImplementation(mockThrow("saveNewLayout")),
    updateLayout: jest.fn().mockImplementation(mockThrow("updateLayout")),
    deleteLayout: jest.fn().mockImplementation(mockThrow("deleteLayout")),
    overwriteLayout: jest.fn().mockImplementation(mockThrow("overwriteLayout")),
    revertLayout: jest.fn().mockImplementation(mockThrow("revertLayout")),
    makePersonalCopy: jest.fn().mockImplementation(mockThrow("makePersonalCopy")),
  };
}
function makeMockUserProfile() {
  return {
    getUserProfile: jest.fn().mockImplementation(mockThrow("getUserProfile")),
    setUserProfile: jest.fn().mockImplementation(mockThrow("setUserProfile")),
  };
}

describe("CurrentLayoutProvider", () => {
  it("refuses to load an incompatible layout", async () => {
    const all = new Array<LayoutState>();

    function SetUnsupportedLayout() {
      const layoutState = useCurrentLayoutSelector((state) => state);
      const actions = useCurrentLayoutActions();

      useEffect(() => {
        all.push(layoutState);
      }, [layoutState]);

      useEffect(() => {
        actions.setCurrentLayout({
          data: {
            configById: { "Foo!bar": { setting: 1 } },
            globalVariables: { var: "hello" },
            layout: "Foo!bar",
            playbackConfig: { speed: 0.1 },
            userNodes: { node1: { name: "node", sourceCode: "node()" } },
            version: MAX_SUPPORTED_LAYOUT_VERSION + 1,
          },
        });
      }, [actions]);

      return <></>;
    }

    const { getByText } = render(<SetUnsupportedLayout />, {
      wrapper: (props) => {
        return (
          <SnackbarProvider>
            <CurrentLayoutProvider>{props.children}</CurrentLayoutProvider>
          </SnackbarProvider>
        );
      },
    });

    expect(getByText("Incompatible layout version")).toBeDefined();

    expect(all.length).toBe(1);
    expect(all).toEqual([{ selectedLayout: undefined }]);

    (console.warn as jest.Mock).mockClear();
  });

  it("keeps identity of action functions when modifying layout", async () => {
    const all: Array<CurrentLayoutActions> = [];
    const condvar = new Condvar();
    const expectedState: LayoutData = {
      layout: "Foo!bar",
      configById: { "Foo!bar": { setting: 1 } },
      globalVariables: { var: "hello" },
      userNodes: { node1: { name: "node", sourceCode: "node()" } },
      playbackConfig: { speed: 0.1 },
    };
    const mockLayoutManager = makeMockLayoutManager();
    const mockUserProfile = makeMockUserProfile();
    mockUserProfile.getUserProfile.mockResolvedValue({ currentLayoutId: "example" });

    mockLayoutManager.getLayout.mockImplementation(async () => {
      condvar.notifyAll();
      return {
        id: "example",
        name: "Example layout",
        baseline: { updatedAt: new Date(10).toISOString(), data: expectedState },
      };
    });

    const { result } = renderHook(
      () => {
        const actions = useCurrentLayoutActions();
        all.push(actions);
        return actions;
      },
      {
        wrapper: function Wrapper({ children }) {
          return (
            <SnackbarProvider>
              <UserProfileStorageContext.Provider value={mockUserProfile}>
                <LayoutManagerProvider>
                  <LayoutManagerContext.Provider value={mockLayoutManager}>
                    <CurrentLayoutProvider>
                      {children}
                      <CurrentLayoutSyncAdapter />
                    </CurrentLayoutProvider>
                  </LayoutManagerContext.Provider>
                </LayoutManagerProvider>
              </UserProfileStorageContext.Provider>
            </SnackbarProvider>
          );
        },
      },
    );

    const actions = result.current;
    expect(result.current).toBe(actions);
    act(() => {
      result.current.savePanelConfigs({
        configs: [{ id: "ExamplePanel!1", config: { foo: "bar" } }],
      });
    });
    expect(result.current.savePanelConfigs).toBe(actions.savePanelConfigs);
    (console.warn as jest.Mock).mockClear();
  });
});
