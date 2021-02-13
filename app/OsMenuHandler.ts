/** Lists available OS Menu Actions */
interface OsMenuHandler {
  "file.open-bag": () => void;
  "file.open-websocket-url": () => void;
}

export type { OsMenuHandler };
