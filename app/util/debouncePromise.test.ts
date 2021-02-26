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

import debouncePromise from "./debouncePromise";
import signal from "@foxglove-studio/app/shared/signal";

describe("debouncePromise", () => {
  it.skip("debounces with resolved and rejected promises", async () => {
    const promises = [Promise.resolve(), Promise.reject(), Promise.reject(), Promise.resolve()];

    let calls = 0;
    const debouncedFn = debouncePromise(() => {
      ++calls;
      return promises.shift()!;
    });

    expect(calls).toBe(0);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();
    expect(calls).toBe(1);

    await Promise.resolve();
    expect(calls).toBe(2);
    expect(debouncedFn.currentPromise).toBeUndefined();

    debouncedFn();
    expect(calls).toBe(3);
    expect(debouncedFn.currentPromise).toBeDefined();

    debouncedFn();
    expect(calls).toBe(3);
    await Promise.resolve();
    expect(calls).toBe(4);
    expect(debouncedFn.currentPromise).toBeUndefined();
    expect(promises).toHaveLength(0);
  });

  it("provides currentPromise to wait on the current call", async () => {
    expect.assertions(5);

    const sig = signal();
    let calls = 0;
    const debouncedFn = debouncePromise(() => {
      ++calls;
      return sig;
    });

    expect(calls).toBe(0);

    debouncedFn();
    expect(calls).toBe(1);

    // the original function should not be called until the signal is resolved
    debouncedFn();
    debouncedFn();
    await Promise.resolve();
    expect(calls).toBe(1);

    // once the first promise is resolved, the second call should start
    let promise = debouncedFn.currentPromise;
    if (!promise) {
      throw new Error("currentPromise should be defined");
    }
    promise = promise.then(() => {
      expect(calls).toBe(2);
    });

    sig.resolve();

    await promise;

    // after pending calls are finished, there is no more currentPromise
    expect(debouncedFn.currentPromise).toBeUndefined();
  });

  it("handles nested calls", async () => {
    expect.assertions(3);

    let calls = 0;
    const debouncedFn = debouncePromise(async () => {
      ++calls;
      if (calls === 1) {
        debouncedFn();
        expect(calls).toBe(1);
      }
    });

    debouncedFn();
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(calls).toBe(2);
  });
});
