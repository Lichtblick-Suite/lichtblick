// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { launchApp } from "./launchApp";

describe("Uninstall extension", () => {
  it("should display 'Uninstalling...' during uninstallation and 'Uninstall' when idle", async () => {
    await using app = await launchApp();

    await app.renderer.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();

    // Step 1: Click on the Profile icon
    await app.renderer.getByTestId("PersonIcon").click();

    // Step 2: Click on the "Extensions" option in the menu
    await app.renderer.getByText("Extensions").click();

    // Step 3: Search for "turtle" in the search bar
    const searchBar = app.renderer.getByPlaceholder("Search Extensions...");
    await searchBar.fill("turtle");

    // Step 4: Click on the item in the list that contains "turtle"
    await app.renderer.getByText("turtle", { exact: false }).click();

    // Step 5: Verify the "Uninstall" button is visible
    expect(await app.renderer.getByText("Uninstall").isVisible()).toBe(true);

    // Click the "Uninstall" button
    await app.renderer.getByText("Uninstall").click();

    // Check if the button text changes to "Installing..." and is disabled
    const uninstallingButton = app.renderer.getByText("Uninstalling...");
    await app.renderer.getByText("Uninstalling...").waitFor({ state: "visible", timeout: 15_000 });
    expect(await uninstallingButton.isEnabled()).toBe(false);
  }, 20_000);
});
