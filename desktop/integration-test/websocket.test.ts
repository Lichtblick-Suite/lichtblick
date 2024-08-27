import { spawn, ChildProcess } from 'child_process';
import { launchApp } from "./launchApp";

describe('websocket connection',() => {

    let sysmonProcess: ChildProcess;

    afterAll((done) => {
      // Close all channels to ensure that there is not any async leak
        sysmonProcess.stdin?.end();
        sysmonProcess.stdout?.destroy();
        sysmonProcess.stderr?.destroy();

        // Kill the process
        sysmonProcess.kill();

        // Ensure jest waits for the process to be fully closed
        sysmonProcess.on('close', () => {
            done();
        });
    });

    test('should show correct attributes using sysmon ws and raw messages panel', async () => {
        // Start the sysmon process using npx
        sysmonProcess = spawn('npx', ['@foxglove/ws-protocol-examples@latest', 'sysmon']);

        const app = await launchApp();

        await app.renderer.getByText("Open connection").click();
        await app.renderer.getByText("Open", { exact: true }).click();

        // Show connection to "ws://localhost:8765 sysmon", it is located on top bar
        await expect(app.renderer.getByText("ws://localhost:8765 sysmon").innerHTML()).resolves.toBeDefined();

        // Check if system is listed on topics menu
        await app.renderer.getByText("Topics", { exact: true }).click();
        await expect(app.renderer.getByText("system_stats").innerHTML()).resolves.toBeDefined();

        // Add raw messages panel to check messages
        await app.renderer.getByLabel("Add panel button").click();
        await app.renderer.getByText("Raw Messages").click();

        // Select the topic
        await app.renderer.getByPlaceholder("/some/topic.msgs[0].field").nth(0).click();
        await app.renderer.getByTestId('autocomplete-item').getByText('system_stats').click();

        const rawMessagesPanel = app.renderer.getByTestId(/RawMessages/)

        // Check if message is correctly beeing displayed
        await expect(rawMessagesPanel.getByText("hostname", { exact: true }).innerText()).resolves.toBe("hostname");
        await expect(rawMessagesPanel.getByText("platform", { exact: true }).innerText()).resolves.toBe("platform");
        await expect(rawMessagesPanel.getByText("type", { exact: true }).innerText()).resolves.toBe("type");
        await expect(rawMessagesPanel.getByText("arch", { exact: true }).innerText()).resolves.toBe("arch");
        await expect(rawMessagesPanel.getByText("version", { exact: true }).innerText()).resolves.toBe("version");
        await expect(rawMessagesPanel.getByText("release", { exact: true }).innerText()).resolves.toBe("release");
        await expect(rawMessagesPanel.getByText("endianness", { exact: true }).innerText()).resolves.toBe("endianness");
        await expect(rawMessagesPanel.getByText("uptime", { exact: true }).innerText()).resolves.toBe("uptime");
        await expect(rawMessagesPanel.getByText("freemem", { exact: true }).innerText()).resolves.toBe("freemem");
        await expect(rawMessagesPanel.getByText("totalmem", { exact: true }).innerText()).resolves.toBe("totalmem");
        await expect(rawMessagesPanel.getByText("cpus", { exact: true }).innerText()).resolves.toBe("cpus");

        app.main.close();
    });

})
