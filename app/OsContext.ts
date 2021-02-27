// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { OsMenuHandler } from "@foxglove-studio/app/OsMenuHandler";

/** OsContext is exposed over the electron Context Bridge */
export interface OsContext {
  // See Node.js process.platform
  platform: string;

  installMenuHandlers(handlers: OsMenuHandler): void;

  handleToolbarDoubleClick(): void;
}

type GlobalWithCtx = typeof global & {
  ctxbridge?: OsContext;
};

/** Global singleton of the OsContext provided by the bridge */
export const OsContextSingleton = (global as GlobalWithCtx).ctxbridge;
