// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { spawn, ChildProcess } from "child_process";

import { launchApp } from "./launchApp";

describe("websocket connection", () => {
  let sysmonProcess: ChildProcess;

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      // Close all channels to ensure that there is no async leak
      sysmonProcess.stdin?.end();
      sysmonProcess.stdout?.destroy();
      sysmonProcess.stderr?.destroy();

      // Kill the process
      sysmonProcess.kill();

      // Ensure Jest waits for the process to be fully closed
      sysmonProcess.on("close", () => {
        resolve();
      });
    });
  });

  it("should show correct attributes using sysmon ws and raw messages panel", async () => {
    // Start the sysmon process using npx
    sysmonProcess = spawn("npx", ["@foxglove/ws-protocol-examples@latest", "sysmon"]);

    const app = await launchApp();

    await app.renderer.getByText("Open connection").click();
    await app.renderer.getByText("Open", { exact: true }).click();

    // Show connection to "ws://localhost:8765 sysmon", it is located on top bar
    await expect(
      app.renderer.getByText("ws://localhost:8765 sysmon").innerHTML(),
    ).resolves.toBeDefined();

    // Check if system is listed on topics menu
    await app.renderer.getByText("Topics", { exact: true }).click();
    await expect(app.renderer.getByText("system_stats").innerHTML()).resolves.toBeDefined();

    // Add raw messages panel to check messages
    await app.renderer.getByLabel("Add panel button").click();
    await app.renderer.getByText("Raw Messages").click();

    // Select the topic
    await app.renderer.getByPlaceholder("/some/topic.msgs[0].field").nth(0).click();
    await app.renderer.getByTestId("autocomplete-item").getByText("system_stats").click();

    const rawMessagesPanel = app.renderer.getByTestId(/RawMessages/);

    // Check if message is correctly beeing displayed
    const labelsToCheck = [
      "hostname",
      "platform",
      "type",
      "arch",
      "version",
      "release",
      "endianness",
      "uptime",
      "freemem",
      "totalmem",
      "cpus",
    ];

    for (const label of labelsToCheck) {
      await expect(rawMessagesPanel.getByText(label, { exact: true }).innerText()).resolves.toBe(
        label,
      );
    }

    await app.main.close();
  });
});
