// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// exposes React into the global scope to avoid "import React from 'react'" in every component
/// <reference types="react" />

declare global {
  namespace React {}
}

export {};
