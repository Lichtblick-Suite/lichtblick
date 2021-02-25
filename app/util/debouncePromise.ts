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

type DebouncedFn = ((...args: any) => void) & { currentPromise?: Promise<void> | null | undefined };

export default function debouncePromise(fn: (...args: any) => Promise<void>): DebouncedFn {
  // Whether we are currently waiting for a promise returned by `fn` to resolve.
  let calling = false;
  // Whether another call to the debounced function was made while a call was in progress.
  let callPending: any[] | null | undefined;

  const debouncedFn: DebouncedFn = (...args: any) => {
    if (calling) {
      callPending = args;
    } else {
      start(args);
    }
  };

  function start(args: any[]) {
    calling = true;
    callPending = undefined;

    debouncedFn.currentPromise = fn(...args).finally(() => {
      calling = false;
      debouncedFn.currentPromise = undefined;
      if (callPending) {
        start(callPending);
      }
    });
  }

  return debouncedFn;
}
