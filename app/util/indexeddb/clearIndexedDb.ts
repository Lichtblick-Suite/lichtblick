// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

// https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/databases
// If this lands in lib.dom.d.ts we can remove it from here
declare global {
  interface IDBFactory {
    databases: () => Promise<{ name: string; version: string }[]>;
  }
}

// For browser-based integration tests; don't use directly.
export function clearIndexedDbWithoutConfirmation() {
  return window.indexedDB.databases().then((databases) => {
    for (const database of databases) {
      window.indexedDB.deleteDatabase(database.name);
    }
  });
}
