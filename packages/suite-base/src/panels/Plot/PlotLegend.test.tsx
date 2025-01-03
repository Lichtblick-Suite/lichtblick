/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { fireEvent } from "@storybook/testing-library";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useMemo } from "react";

import PanelContext from "@lichtblick/suite-base/components/PanelContext";
import { useSelectedPanels } from "@lichtblick/suite-base/context/CurrentLayoutContext";

import { PlotLegend } from "./PlotLegend";

const defaultProps = {
  showLegend: true,
  saveConfig: jest.fn(),
  sidebarDimension: 200,
  paths: [],
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const contextValue = useMemo(
    () => ({
      type: "foo",
      id: "bar",
      title: "Foo Panel",
      config: {},
      saveConfig: jest.fn(),
      updatePanelConfigs: jest.fn(),
      openSiblingPanel: jest.fn(),
      replacePanel: jest.fn(),
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn(),
      setHasFullscreenDescendant: jest.fn(),
      isFullscreen: false,
      connectToolbarDragHandle: jest.fn(),
      setMessagePathDropConfig: jest.fn(),
    }),
    [],
  );

  return (
    <PanelContext.Provider value={contextValue}>
      <div data-testid="drag-handle">{children}</div>
    </PanelContext.Provider>
  );
};

const setup = (overrides = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(
    <PanelContext.Provider
      value={{
        type: "foo",
        id: "bar",
        title: "Foo Panel",
        config: {},
        saveConfig: jest.fn(),
        updatePanelConfigs: jest.fn(),
        openSiblingPanel: jest.fn(),
        replacePanel: jest.fn(),
        enterFullscreen: jest.fn(),
        exitFullscreen: jest.fn(),
        setHasFullscreenDescendant: jest.fn(),
        isFullscreen: false,
        connectToolbarDragHandle: jest.fn(),
        setMessagePathDropConfig: jest.fn(),
      }}
    >
      <TestWrapper>
        <PlotLegend
          coordinator={undefined}
          legendDisplay="floating"
          onClickPath={function (): void {
            throw new Error("Function not implemented.");
          }}
          showValues={false}
          {...props}
        />
      </TestWrapper>
    </PanelContext.Provider>,
  );
};

jest.mock("@lichtblick/hooks", () => ({
  useGuaranteedContext: jest.fn(() => ({
    setState: jest.fn(),
    state: {},
  })),
  useSetState: jest.fn(),
  useContext: jest.fn(),
}));

jest.mock("@lichtblick/suite-base/context/CurrentLayoutContext", () => ({
  useCurrentLayoutActions: jest.fn(() => ({
    getCurrentLayoutState: jest.fn(),
    setCurrentLayout: jest.fn(),
  })),
  useSelectedPanels: jest.fn(() => []),
}));

describe("PlotLegend", () => {
  const mockSetSelectedPanelIds = jest.fn();
  beforeEach(() => {
    (useSelectedPanels as jest.Mock).mockReturnValue({
      setSelectedPanelIds: mockSetSelectedPanelIds,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders PlotLegend without crashing", () => {
    setup();
    expect(screen.getByTitle("Add series")).toBeDefined();
  });

  it("toggles legend visibility when IconButton is clicked", () => {
    const mockSaveConfig = jest.fn();
    const { getByRole } = setup({ showLegend: false, saveConfig: mockSaveConfig });
    const button = getByRole("button");
    fireEvent.click(button);
    expect(mockSaveConfig).toHaveBeenCalledWith({ showLegend: true });
  });

  it("renders paths from props", () => {
    const paths = [
      { value: "path1", enabled: true, timestampMethod: "method1" },
      { value: "path2", enabled: true, timestampMethod: "method2" },
    ];
    setup({ paths });

    expect(screen.getByText("path1")).toBeDefined();
    expect(screen.getByText("path2")).toBeDefined();
  });

  it("calls onClickPath when a path is clicked", () => {
    const mockOnClickPath = jest.fn();
    const paths = [{ value: "path1", enabled: true, timestampMethod: "method1" }];
    setup({ paths, onClickPath: mockOnClickPath });

    const pathElement = screen.getByText("path1");
    fireEvent.click(pathElement);

    expect(mockOnClickPath).toHaveBeenCalledWith(0);
  });
});
