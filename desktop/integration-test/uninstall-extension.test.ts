// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import path from "path";

import { launchApp } from "./launchApp";

describe("Uninstall extension", () => {
  it("should display 'Uninstalling...' during uninstallation and 'Uninstall' when idle", async () => {
    await using app = await launchApp();

    /** Install the extension via file upload
     * This step is necessary to ensure the extension is installed before we try to uninstall it
     */
    const extensionPath = path.resolve(
      __dirname,
      "../../packages/suite-base/src/test/fixtures/lichtblick.suite-extension-turtlesim-0.0.1.foxe",
    );

    const fileInput = app.renderer.locator("[data-puppeteer-file-upload]");
    await fileInput.setInputFiles(extensionPath);

    /** End of installation */

    // Close the data source dialog if it appears
    await app.renderer.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();

    await app.renderer.getByTestId("PersonIcon").click();
    await app.renderer.getByText("Extensions").click();
    const searchBar = app.renderer.getByPlaceholder("Search Extensions...");
    await searchBar.fill("turtlesim");
    const extensionListItem = app.renderer
      .locator('[data-testid="extension-list-entry"]')
      .filter({ hasText: "turtlesim" })
      .filter({ hasText: "0.0.1" });
    await extensionListItem.click();

    // Wait for the installation to complete
    await app.renderer.getByText("Uninstall").waitFor({ state: "visible", timeout: 30_000 });

    expect(await app.renderer.getByText("Uninstall").isVisible()).toBe(true);

    await app.renderer.getByText("Uninstall").click();

    const uninstallingButton = app.renderer.getByText("Uninstalling...");
    await uninstallingButton.waitFor({ state: "visible", timeout: 15_000 });
    expect(await uninstallingButton.isEnabled()).toBe(false);
  }, 60_000);
});
