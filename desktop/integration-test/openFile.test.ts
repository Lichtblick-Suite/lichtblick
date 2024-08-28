// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import path from "path";

import { AppType, launchApp } from "./launchApp";

describe("menus", () => {
  const closeDataSourceDialogAfterAppLaunch = async (app: AppType) => {
    await expect(app.renderer.getByTestId("DataSourceDialog").isVisible()).resolves.toBe(true);
    await app.renderer.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
    await expect(app.renderer.getByTestId("DataSourceDialog").isVisible()).resolves.toBe(false);
  };

  it("when opening the rosbag file the data should be shown on the 3D panel", async () => {
    await using app = await launchApp();
    await closeDataSourceDialogAfterAppLaunch(app);

    //Add rosbag file from source
    const filePath = path.resolve(
      __dirname,
      "../../packages/suite-base/src/test/fixtures/example.bag",
    );
    await expect(
      app.renderer.getByText("No data source", { exact: true }).innerText(),
    ).resolves.toBe("No data source");
    const fileInput = app.renderer.locator("[data-puppeteer-file-upload]");
    await fileInput.setInputFiles(filePath);

    // wait until the elements are rendered
    await app.renderer.waitForTimeout(6000);

    //Click on play button
    const playButton = app.renderer.getByTitle("Play").nth(0);
    await playButton.click();

    //Click on 3D panel
    const threeDeeSettingsIcon = app.renderer.getByTestId("SettingsIcon").nth(0);
    await threeDeeSettingsIcon.waitFor();
    await threeDeeSettingsIcon.click();
    // Verify if the file was loaded by searching on the left panel for the element contained on the file
    const textContent = app.renderer.locator('div[role="button"]').textContent();
    expect(textContent).toContain("world");
  }, 20_000);
});
