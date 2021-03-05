// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// @sentry/electron isn't able to detect that the renderer should be loaded when in the preload script
// instead if tries to load esm/main which is only applicable for the main script
import { init as initSentry } from "@sentry/electron/esm/renderer";
import { contextBridge, ipcRenderer } from "electron";

import { OsContext, OsContextWindowEvent } from "@foxglove-studio/app/OsContext";

if (process.env.SENTRY_DSN !== undefined) {
  initSentry({ dsn: process.env.SENTRY_DSN });
}

type IpcListener = (ev: unknown, ...args: unknown[]) => void;
const menuClickListeners = new Map<string, IpcListener>();

const ctx: OsContext = {
  platform: process.platform,
  handleToolbarDoubleClick() {
    ipcRenderer.send("window.toolbar-double-clicked");
  },
  addWindowEventListener(eventName: OsContextWindowEvent, handler: () => void) {
    ipcRenderer.on(eventName, () => handler());
  },
  async menuAddInputSource(name: string, handler: () => void) {
    if (menuClickListeners.has(name)) {
      throw new Error(`Menu input source ${name} already exists`);
    }

    const listener: IpcListener = (_ev, ...args) => {
      if (args[0] === name) {
        handler();
      }
    };

    await ipcRenderer.invoke("menu.add-input-source", name);
    menuClickListeners.set(name, listener);
    ipcRenderer.on("menu.click-input-source", listener);
  },
  async menuRemoveInputSource(name: string) {
    const listener = menuClickListeners.get(name);
    if (listener === undefined) {
      return;
    }
    menuClickListeners.delete(name);
    ipcRenderer.off("menu.click-input-source", listener);
    ipcRenderer.invoke("menu.remove-input-source", name);
  },
};

// NOTE: Context Bridge imposes a number of limitations around how objects move between the context
// and the outside world. These restrictions impact what the api surface can expose and how.
//
// i.e.: returning a class instance doesn't work because prototypes do not survive the boundary
contextBridge.exposeInMainWorld("ctxbridge", ctx);
