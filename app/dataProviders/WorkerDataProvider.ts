//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Time } from "rosbag";

import { DataProvider, InitializationResult } from "./types";
import RpcDataProvider from "@foxglove-studio/app/dataProviders/RpcDataProvider";
import {
  DataProviderDescriptor,
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
} from "@foxglove-studio/app/dataProviders/types";
import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import Rpc from "@foxglove-studio/app/util/Rpc";
// eslint-disable-next-line import/no-unresolved
import WorkerDataProviderWorker from "worker-loader!@foxglove-studio/app/dataProviders/WorkerDataProvider.worker";

const params = new URLSearchParams(window.location.search);
const secondSourceUrlParams = getGlobalHooks().getSecondSourceUrlParams();
const hasSecondSource = secondSourceUrlParams.some((param) => params.has(param));

// We almost always use a WorkerDataProvider in Webviz. By initializing the first worker before we actually construct
// the WorkerDataProvider we can potentially improve performance by loading while waiting for async requests.
let preinitializedWorkers: any[] = [];
if (process.env.NODE_ENV !== "test") {
  preinitializedWorkers = hasSecondSource
    ? [
        new WorkerDataProviderWorker(),
        new WorkerDataProviderWorker(),
        new WorkerDataProviderWorker(),
        new WorkerDataProviderWorker(),
      ]
    : [new WorkerDataProviderWorker(), new WorkerDataProviderWorker()];
}

// Wraps the underlying DataProviderDescriptor tree in a Web Worker, therefore allowing
// `getMessages` calls to get resolved in parallel to the main thread.
export default class WorkerDataProvider implements DataProvider {
  _worker?: Worker;
  _provider?: RpcDataProvider;
  _child: DataProviderDescriptor;

  constructor(args: any, children: DataProviderDescriptor[]) {
    if (children.length !== 1) {
      throw new Error(`Incorrect number of children to WorkerDataProvider: ${children.length}`);
    }
    this._child = children[0];
  }

  initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    if (preinitializedWorkers.length > 0) {
      this._worker = preinitializedWorkers.pop();
    } else {
      this._worker = new WorkerDataProviderWorker();
    }

    if (!this._worker) {
      throw new Error("WorderDataProvider failed to initialize");
    }

    this._provider = new RpcDataProvider(new Rpc(this._worker), [this._child]);
    return this._provider.initialize(extensionPoint);
  }

  getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    if (!this._provider) {
      throw new Error("WorkerDataProvieder not initialized");
    }
    return this._provider.getMessages(start, end, topics);
  }

  async close(): Promise<void> {
    await this._provider?.close();
    this._worker?.terminate();
  }
}
