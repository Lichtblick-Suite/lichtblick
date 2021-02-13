import { contextBridge, ipcRenderer } from 'electron';

import { MenuHandler } from '@foxglove-studio/app/MenuHandler';
import { Bridge } from '@foxglove-studio/app/Bridge';

const bridge: Bridge = {
  installMenuHandlers: (handlers: MenuHandler) => {
    ipcRenderer.on('menu.file.open-bag', async () => {
      handlers['file.open-bag']();
    });
    ipcRenderer.on('menu.file.open-websocket-url', async () => {
      handlers['file.open-websocket-url']();
    });
  },
};

// NOTE: Context Bridge imposes a number of limitations around how objects move between the context
// and the outside world. These restrictions impact what the api surface can expose and how.
//
// i.e.: returning a class instance doesn't work because prototypes do not survive the boundary
contextBridge.exposeInMainWorld('ctxbridge', bridge);
