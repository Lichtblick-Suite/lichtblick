// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import Rpc, { Channel } from "@lichtblick/suite-base/util/Rpc";
import { setupMainThreadRpc } from "@lichtblick/suite-base/util/RpcMainThreadUtils";
import * as _ from "lodash-es";

// This file provides a convenient way to set up and tear down workers as needed. It will create only a single worker
// of each class, and terminate the worker when all listeners are unregistered.

type WorkerListenerState<W> = { rpc: Rpc; worker: W; listenerIds: string[] };

export default class WebWorkerManager<W extends Channel> {
  #createWorker: () => W;
  #maxWorkerCount: number;
  #workerStates: (WorkerListenerState<W> | undefined)[];
  #allListeners: Set<string>;

  public constructor(createWorker: () => W, maxWorkerCount: number) {
    this.#createWorker = createWorker;
    this.#maxWorkerCount = maxWorkerCount;
    this.#workerStates = new Array(maxWorkerCount);
    this.#allListeners = new Set();
  }

  public testing_workerCount(): number {
    return this.#workerStates.filter(Boolean).length;
  }

  public testing_getWorkerState(id: string): WorkerListenerState<W> | undefined {
    return this.#workerStates.find((workerState) => workerState?.listenerIds.includes(id));
  }

  public registerWorkerListener(id: string): Rpc {
    if (this.#allListeners.has(id)) {
      throw new Error("cannot register the same listener id twice");
    }
    this.#allListeners.add(id);

    const currentWorkerCount = this.#workerStates.filter(Boolean).length;
    if (currentWorkerCount < this.#maxWorkerCount) {
      const worker = this.#createWorker();
      const rpc = new Rpc(worker);
      setupMainThreadRpc(rpc);

      const emptyIndex = _.findIndex(this.#workerStates, (x) => !x);
      this.#workerStates[emptyIndex] = { worker, rpc, listenerIds: [id] };
      return rpc;
    }
    const workerStateByListenerCount = _.sortBy(
      this.#workerStates.filter(Boolean),
      (workerState) => workerState?.listenerIds.length,
    );
    const workerState = workerStateByListenerCount[0];
    if (!workerState) {
      throw new Error("no worker state");
    }
    workerState.listenerIds.push(id);
    return workerState.rpc;
  }

  public unregisterWorkerListener(id: string): void {
    if (!this.#allListeners.has(id)) {
      throw new Error("Cannot find listener to unregister");
    }
    this.#allListeners.delete(id);

    const workerStateIndex = _.findIndex(this.#workerStates, (workerState) => {
      if (!workerState) {
        return false;
      }
      return workerState.listenerIds.includes(id);
    });
    const workerState = this.#workerStates[workerStateIndex];
    if (workerStateIndex >= 0 && workerState) {
      workerState.listenerIds = workerState.listenerIds.filter((_id) => _id !== id);
      if (workerState.listenerIds.length === 0) {
        this.#workerStates[workerStateIndex] = undefined;
        workerState.worker.terminate();
        workerState.rpc.terminate();
      }
    }
  }
}
