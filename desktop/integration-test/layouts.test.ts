// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { AppType, launchApp } from "./launchApp";

describe("menus", () => {
  const closeDataSourceDialogAfterAppLaunch = async (app: AppType) => {
    await expect(app.renderer.getByTestId("DataSourceDialog").isVisible()).resolves.toBe(true);
    await app.renderer.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
    await expect(app.renderer.getByTestId("DataSourceDialog").isVisible()).resolves.toBe(false);
  };

  async function accessLayout(app: AppType) {
    await closeDataSourceDialogAfterAppLaunch(app);
    await app.renderer.getByTestId("layouts-left").click();
    await app.renderer.getByTestId("layout-list-item").click();
}

  it("should open 3D panel when clicking on Layouts > default", async () => {
    await using app = await launchApp();
    await accessLayout(app);

    const threeDeeSettingsIcon = app.renderer.getByTestId("SettingsIcon").nth(0);
    await threeDeeSettingsIcon.click();

    await expect(app.renderer.getByText("3D panel", { exact: true }).innerText()).resolves.toBe(
      "3D panel",
    );
  }, 15_000);


   it("should open Image panel when clicking on Layouts > default", async () => {
    await using app = await launchApp();
    await accessLayout(app);

    const imagePanelSettingsIcon = app.renderer.getByTestId("SettingsIcon").nth(1);
    await imagePanelSettingsIcon.click();
    await expect(app.renderer.getByText("Image panel", { exact: true }).innerText()).resolves.toBe(
      "Image panel",
    );
  }, 15_000);

  it("should open Raw Messages panel when clicking on Layouts > default", async () => {
    await using app = await launchApp();
    await accessLayout(app);

    const rawMessagesSettingsIcon = app.renderer.getByTestId("SettingsIcon").nth(2);
    await rawMessagesSettingsIcon.click();
    await expect(app.renderer.getByText("Raw Messages panel", { exact: true }).innerText()).resolves.toBe(
      "Raw Messages panel",
    );
  }, 15_000);
});
