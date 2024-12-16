/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { render, screen } from "@testing-library/react";
import React from "react";

import MultiProvider from "@lichtblick/suite-base/components/MultiProvider";
import StudioToastProvider from "@lichtblick/suite-base/components/StudioToastProvider";
import { IAppConfiguration } from "@lichtblick/suite-base/context/AppConfigurationContext";
import LayoutStorageContext from "@lichtblick/suite-base/context/LayoutStorageContext";
import { INativeAppMenu } from "@lichtblick/suite-base/context/NativeAppMenuContext";
import { INativeWindow } from "@lichtblick/suite-base/context/NativeWindowContext";
import CurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider";
import LayoutManagerProvider from "@lichtblick/suite-base/providers/LayoutManagerProvider";
import ProblemsContextProvider from "@lichtblick/suite-base/providers/ProblemsContextProvider";
import { StudioLogsSettingsProvider } from "@lichtblick/suite-base/providers/StudioLogsSettingsProvider";
import UserProfileLocalStorageProvider from "@lichtblick/suite-base/providers/UserProfileLocalStorageProvider";

import { App } from "./App";
import Workspace from "./Workspace";

beforeEach(() => {
  jest.clearAllMocks();
});

// Mocking shared providers and components
jest.mock("./providers/LayoutManagerProvider", () =>
  jest.fn(({ children }) => <div data-testid="layout-manager-provider">{children}</div>),
);
jest.mock("./providers/PanelCatalogProvider", () =>
  jest.fn(({ children }) => <div data-testid="panel-catalog-provider">{children}</div>),
);
jest.mock("./components/MultiProvider", () =>
  jest.fn(({ children }) => <div data-testid="multi-provider">{children}</div>),
);
jest.mock("./components/StudioToastProvider", () =>
  jest.fn(({ children }) => <div data-testid="studio-toast-provider">{children}</div>),
);
jest.mock("./components/GlobalCss", () =>
  jest.fn(({ children }) => <div data-testid="global-css">{children}</div>),
);
jest.mock("./components/DocumentTitleAdapter", () =>
  jest.fn(({ children }) => <div data-testid="document-title-adapter">{children}</div>),
);
jest.mock("./components/ErrorBoundary", () =>
  jest.fn(({ children }) => <div data-testid="error-boundary">{children}</div>),
);
jest.mock("./components/ColorSchemeThemeProvider", () => ({
  ColorSchemeThemeProvider: jest.fn(({ children }) => (
    <div data-testid="color-scheme-theme">{children}</div>
  )),
}));
jest.mock("./components/CssBaseline", () =>
  jest.fn(({ children }) => <div data-testid="css-baseline">{children}</div>),
);
jest.mock("./components/SendNotificationToastAdapter", () =>
  jest.fn(({ children }) => <div data-testid="send-notification-toast-adapter">{children}</div>),
);
jest.mock("./context/NativeAppMenuContext", () => ({
  Provider: jest.fn(({ children }) => <div data-testid="native-app-component">{children}</div>),
}));
jest.mock("./Workspace", () => jest.fn(() => <div data-testid="workspace-component"></div>));
jest.mock("./screens/LaunchPreference", () => ({
  LaunchPreference: jest.fn(() => <div data-testid="launch-preference"></div>),
}));

// Mocked App configuration
const mockAppConfiguration: IAppConfiguration = {
  get: jest.fn(),
  set: jest.fn(),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
};

// Helper to render the App with default props
const setup = (overrides: Partial<React.ComponentProps<typeof App>> = {}) => {
  const defaultProps = {
    appConfiguration: mockAppConfiguration,
    deepLinks: [],
    dataSources: [],
    extensionLoaders: [],
    layoutLoaders: [],
    ...overrides,
  };
  return render(<App {...defaultProps} />);
};

describe("App Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    setup();
    //add more expects here verifying that render was successful
    expect(screen.getByTestId("color-scheme-theme")).toBeDefined();
    expect(screen.getByTestId("css-baseline")).toBeDefined();
    expect(screen.getByTestId("error-boundary")).toBeDefined();
    expect(screen.getByTestId("multi-provider")).toBeDefined();
    expect(screen.getByTestId("document-title-adapter")).toBeDefined();
    expect(screen.getByTestId("send-notification-toast-adapter")).toBeDefined();
    expect(screen.getByTestId("panel-catalog-provider")).toBeDefined();
    expect(screen.getByTestId("workspace-component")).toBeDefined();
  });

  it("renders GlobalCss when enableGlobalCss is true", () => {
    setup({ enableGlobalCss: true });
    expect(screen.getByTestId("global-css")).toBeDefined();
  });

  it("throw exception when enableGlobalCss is false", () => {
    setup({ enableGlobalCss: false });
    expect(() => screen.getByTestId("global-css")).toThrow();
  });

  it("adds and removes contextmenu event listener on mount/unmount", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = setup();

    expect(addEventListenerSpy).toHaveBeenCalledWith("contextmenu", expect.any(Function));
    expect(removeEventListenerSpy).not.toHaveBeenCalled();
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("contextmenu", expect.any(Function));
  });

  it("renders LaunchPreference component when enableLaunchPreferenceScreen is true", () => {
    setup({ enableLaunchPreferenceScreen: true });
    expect(screen.getByTestId("launch-preference")).toBeDefined();
  });

  it("passes deepLinks and onAppBarDoubleClick to Workspace", () => {
    const mockDeepLinks = ["link1", "link2"];
    const mockOnAppBarDoubleClick = jest.fn();
    expect(Workspace).not.toHaveBeenCalled();

    setup({
      deepLinks: mockDeepLinks,
      onAppBarDoubleClick: mockOnAppBarDoubleClick,
    });

    // Ensure Workspace receives the correct props by spying on Workspace
    expect(Workspace).toHaveBeenCalledWith(
      {
        deepLinks: mockDeepLinks,
        onAppBarDoubleClick: mockOnAppBarDoubleClick,
      },
      {},
    );
  });

  it("verifies that Multiprovider is called with correct providers", () => {
    setup();
    expect(screen.getByTestId("multi-provider")).toBeDefined();
    expect(screen.getByTestId("multi-provider").children.length).toBe(3);
  });

  it("verifies that Multiprovider has rendered all providers when its nativeApp", () => {
    setup({ nativeAppMenu: {} as INativeAppMenu });

    const props = (MultiProvider as jest.Mock).mock.calls[0][0];
    const providerTypes = props.providers.map((provider: React.ReactElement) => provider.type);

    expect(providerTypes).toContain(StudioToastProvider);
    expect(providerTypes).toContain(StudioLogsSettingsProvider);
    expect(providerTypes).toContain(ProblemsContextProvider);
    expect(providerTypes).toContain(CurrentLayoutProvider);
    expect(providerTypes).toContain(UserProfileLocalStorageProvider);
    expect(providerTypes).toContain(LayoutManagerProvider);
    expect(providerTypes).toContain(LayoutStorageContext.Provider);
  });

  it("verifies that Multiprovider has rendered all providers when its nativeWindow", () => {
    setup({ nativeWindow: {} as INativeWindow });
    const props = (MultiProvider as jest.Mock).mock.calls[0][0];
    const providerTypes = props.providers.map((provider: React.ReactElement) => provider.type);

    expect(providerTypes).toContain(StudioToastProvider);
    expect(providerTypes).toContain(StudioLogsSettingsProvider);
    expect(providerTypes).toContain(ProblemsContextProvider);
    expect(providerTypes).toContain(CurrentLayoutProvider);
    expect(providerTypes).toContain(UserProfileLocalStorageProvider);
    expect(providerTypes).toContain(LayoutManagerProvider);
    expect(providerTypes).toContain(LayoutStorageContext.Provider);
  });
});
