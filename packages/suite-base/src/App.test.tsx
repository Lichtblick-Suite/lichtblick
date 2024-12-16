/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { render, screen } from "@testing-library/react";
import { App } from "./App";
import { IAppConfiguration } from "@lichtblick/suite-base/context/AppConfigurationContext";

beforeEach(() => {
  jest.clearAllMocks();
});

const mockAppConfiguration: IAppConfiguration = {
  get: jest.fn(),
  set: jest.fn(),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn()
};

jest.mock("./providers/LayoutManagerProvider", () => jest.fn(() => <></>));
jest.mock("./components/SyncAdapters", () => jest.fn(() => <></>));
jest.mock("./components/MultiProvider", () =>
  jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
);
jest.mock("./components/GlobalCss", () =>  jest.fn(({ children }) => <div data-testid="global-css">{children}</div>));
jest.mock("./components/StudioToastProvider", () => jest.fn(() => <></>));
jest.mock("./components/PlayerManager", () => jest.fn(() => <></>));
jest.mock("./components/DocumentTitleAdapter", () => jest.fn(() => <></>));
jest.mock("./components/ErrorBoundary", () => jest.fn(() => <></>));
jest.mock("./components/ColorSchemeThemeProvider", () => ({
  ColorSchemeThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("./components/CssBaseline", () => jest.fn(({ children }) => <>cssBaseline {children}</>));
jest.mock("./screens/LaunchPreference", () => ({
  LaunchPreference: jest.fn(({ children }) => <>maybeLaunchPreference {children}</>)
}));

describe("App Component", () => {

  it("renders without crashing", () => {
    render(
      <App
        appConfiguration={mockAppConfiguration}
        deepLinks={[]}
        dataSources={[]}
        extensionLoaders={[]}
        layoutLoaders={[]}
      />
    );
    expect(screen.getByText("cssBaseline")).toBeDefined();
  });

  it("renders GlobalCss when enableGlobalCss is true", () => {
    render(
      <App
        appConfiguration={mockAppConfiguration}
        deepLinks={[]}
        dataSources={[]}
        extensionLoaders={[]}
        layoutLoaders={[]}
        enableGlobalCss={true}
      />
    );
    expect(screen.getByTestId("global-css")).toBeDefined();
  });

  it("renders LaunchPreference screen when enableLaunchPreferenceScreen is true", () => {
    render(

      <App
        appConfiguration={mockAppConfiguration}
        dataSources={[]}
        extensionLoaders={[]}
        layoutLoaders={[]}
        deepLinks={[]}
        enableLaunchPreferenceScreen={true}
      />

    );
    expect(screen.getByText("maybeLaunchPreference")).toBeDefined();
  });

});
