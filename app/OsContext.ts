import { OsMenuHandler } from '@foxglove-studio/app/OsMenuHandler';

/** OsContext is exposed over the electron Context Bridge */
interface OsContext {
  installMenuHandlers: (handlers: OsMenuHandler) => void;
}

type GlobalWithCtx = typeof global & {
  ctxbridge?: OsContext;
};

/** Global singleton of the OsContext provided by the bridge */
const OsContextSingleton = (global as GlobalWithCtx).ctxbridge;

export { OsContextSingleton };
export type { OsContext };
