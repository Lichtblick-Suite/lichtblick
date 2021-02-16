//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

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
