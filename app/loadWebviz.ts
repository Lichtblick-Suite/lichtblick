// proxy module for imports which haven't been updated to GlobalHooks

import {
  getGlobalConfig,
  setGlobalConfig,
  resetGlobalConfigToDefault,
} from "@foxglove-studio/app/GlobalConfig";

export function getGlobalHooks() {
  return getGlobalConfig();
}

export function setHooks(hooksToSet: object) {
  setGlobalConfig(hooksToSet);
}

export function resetHooksToDefault() {
  resetGlobalConfigToDefault();
}
