import { OsMenuHandler } from "@foxglove-studio/app/OsMenuHandler";

// Events that are forwarded from the main process and can be listened to using ctxbridge.addWindowEventListener
export type OsContextWindowEvent = "enter-full-screen" | "leave-full-screen";

/** OsContext is exposed over the electron Context Bridge */
export interface OsContext {
  // See Node.js process.platform
  platform: string;

  installMenuHandlers(handlers: OsMenuHandler): void;

  // Events from the native window are available in the main process but not the renderer, so we forward them through the bridge.
  addWindowEventListener(eventName: OsContextWindowEvent, handler: () => void): void;

  handleToolbarDoubleClick(): void;
}

type GlobalWithCtx = typeof global & {
  ctxbridge?: OsContext;
};

/** Global singleton of the OsContext provided by the bridge */
export const OsContextSingleton = (global as GlobalWithCtx).ctxbridge;
