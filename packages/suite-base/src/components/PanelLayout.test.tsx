/** @jest-environment jsdom */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Panel from "@lichtblick/suite-base/components/Panel";
import AppConfigurationContext from "@lichtblick/suite-base/context/AppConfigurationContext";
import PanelCatalogContext, {
  PanelCatalog,
  PanelInfo,
} from "@lichtblick/suite-base/context/PanelCatalogContext";
import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";
import { PanelStateContextProvider } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import WorkspaceContextProvider from "@lichtblick/suite-base/providers/WorkspaceContextProvider";
import { makeMockAppConfiguration } from "@lichtblick/suite-base/util/makeMockAppConfiguration";
import { render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { UnconnectedPanelLayout } from "./PanelLayout";

class MockPanelCatalog implements PanelCatalog {
  public constructor(private allPanels: PanelInfo[]) {}
  public getPanels(): readonly PanelInfo[] {
    return this.allPanels;
  }
  public getPanelByType(type: string): PanelInfo | undefined {
    return this.allPanels.find((panel) => !panel.config && panel.type === type);
  }
}

describe("UnconnectedPanelLayout", () => {
  beforeEach(() => {
    // jsdom can't parse our @container CSS so we have to silence console.error for this test.
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("does not remount panels when changing split percentage", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const renderA = jest.fn().mockReturnValue(<>A</>);
    const moduleA = jest.fn().mockResolvedValue({
      default: Panel(Object.assign(renderA, { panelType: "a", defaultConfig: {} })),
    });

    const renderB = jest.fn().mockReturnValue(<>B</>);
    const moduleB = jest.fn().mockResolvedValue({
      default: Panel(Object.assign(renderB, { panelType: "b", defaultConfig: {} })),
    });

    const renderC = jest.fn().mockReturnValue(<>C</>);
    const moduleC = jest.fn().mockResolvedValue({
      default: Panel(Object.assign(renderC, { panelType: "c", defaultConfig: {} })),
    });

    const panels: PanelInfo[] = [
      { title: "A", type: "a", module: moduleA },
      { title: "B", type: "b", module: moduleB },
      { title: "C", type: "c", module: moduleC },
    ];

    const panelCatalog = new MockPanelCatalog(panels);

    const onChange = () => {
      throw new Error("unexpected call to onChange");
    };
    const { rerender, unmount } = render(
      <UnconnectedPanelLayout
        layout={{ first: "a", second: "b", direction: "row", splitPercentage: 50 }}
        onChange={onChange}
      />,
      {
        wrapper: function Wrapper({ children }: React.PropsWithChildren) {
          const [config] = useState(() => makeMockAppConfiguration());

          return (
            <DndProvider backend={HTML5Backend}>
              <WorkspaceContextProvider>
                <AppConfigurationContext.Provider value={config}>
                  <MockCurrentLayoutProvider>
                    <PanelStateContextProvider>
                      <PanelCatalogContext.Provider value={panelCatalog}>
                        {children}
                      </PanelCatalogContext.Provider>
                    </PanelStateContextProvider>
                  </MockCurrentLayoutProvider>
                </AppConfigurationContext.Provider>
              </WorkspaceContextProvider>
            </DndProvider>
          );
        },
      },
    );

    await waitFor(() => {
      expect(renderA).toHaveBeenCalled();
    });
    // Each panel module should have only been loaded once
    expect(moduleA).toHaveBeenCalledTimes(1);
    expect(moduleB).toHaveBeenCalledTimes(1);
    expect(moduleC).toHaveBeenCalledTimes(0);
    expect(renderA).toHaveBeenCalledTimes(4);
    expect(renderB).toHaveBeenCalledTimes(4);
    expect(renderC).toHaveBeenCalledTimes(0);

    rerender(
      <UnconnectedPanelLayout
        layout={{ first: "a", second: "c", direction: "row", splitPercentage: 40 }}
        onChange={onChange}
      />,
    );
    await waitFor(() => {
      expect(renderC).toHaveBeenCalledTimes(4);
    });
    // Each panel module should have only been loaded once; panels A and B should not render again
    expect(moduleA).toHaveBeenCalledTimes(1);
    expect(moduleB).toHaveBeenCalledTimes(1);
    expect(moduleC).toHaveBeenCalledTimes(1);
    expect(renderA).toHaveBeenCalledTimes(4);
    expect(renderB).toHaveBeenCalledTimes(4);
    expect(renderC).toHaveBeenCalledTimes(4);

    unmount();
  });
});
