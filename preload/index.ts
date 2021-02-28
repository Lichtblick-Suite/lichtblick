// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// @sentry/electron isn't able to detect that the renderer should be loaded when in the preload script
// instead if tries to load esm/main which is only applicable for the main script
import { init as initSentry } from "@sentry/electron/esm/renderer";
import { contextBridge, ipcRenderer } from "electron";

import { OsContext } from "@foxglove-studio/app/OsContext";
import { OsMenuHandler } from "@foxglove-studio/app/OsMenuHandler";

if (process.env.SENTRY_DSN) {
  initSentry({ dsn: process.env.SENTRY_DSN });
}

const ctx: OsContext = {
  platform: process.platform,
  installMenuHandlers(handlers: OsMenuHandler) {
    ipcRenderer.on("menu.file.open-bag", async () => {
      handlers["file.open-bag"]();
    });
    ipcRenderer.on("menu.file.open-websocket-url", async () => {
      handlers["file.open-websocket-url"]();
    });
  },
  handleToolbarDoubleClick() {
    ipcRenderer.send("window.toolbar-double-clicked");
  },
};

// NOTE: Context Bridge imposes a number of limitations around how objects move between the context
// and the outside world. These restrictions impact what the api surface can expose and how.
//
// i.e.: returning a class instance doesn't work because prototypes do not survive the boundary
contextBridge.exposeInMainWorld("ctxbridge", ctx);
