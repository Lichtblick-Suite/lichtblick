// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// proxy module for imports which haven't been updated to GlobalHooks

import {
  getGlobalConfig,
  setGlobalConfig,
  resetGlobalConfigToDefault,
} from "@foxglove-studio/app/GlobalConfig";

export function getGlobalHooks() {
  return getGlobalConfig();
}

export function setHooks(hooksToSet: Record<string, unknown>) {
  setGlobalConfig(hooksToSet);
}

export function resetHooksToDefault() {
  resetGlobalConfigToDefault();
}
