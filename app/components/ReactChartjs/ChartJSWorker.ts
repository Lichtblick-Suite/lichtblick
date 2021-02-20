//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Chart from "chart.js";

import ChartJSManager from "./ChartJSManager";
import { RpcLike } from "@foxglove-studio/app/util/FakeRpc";
import installChartjs from "@foxglove-studio/app/util/installChartjs";
import Rpc from "@foxglove-studio/app/util/Rpc";
import { setupWorker } from "@foxglove-studio/app/util/RpcWorkerUtils";
import { inWebWorker } from "@foxglove-studio/app/util/workers";

let hasInstalledChartjs = false;

export default class ChartJSWorker {
  _rpc: RpcLike;
  _managersById: {
    [key: string]: ChartJSManager;
  };

  constructor(rpc: RpcLike) {
    if (!hasInstalledChartjs) {
      installChartjs(Chart);
      hasInstalledChartjs = true;
    }
    this._managersById = {};
    this._rpc = rpc;

    if (process.env.NODE_ENV !== "test" && inWebWorker() && this._rpc instanceof Rpc) {
      setupWorker(this._rpc);
    }

    rpc.receive("initialize", (args: any) => {
      const manager = new ChartJSManager(args);
      this._managersById[args.id] = manager;
      return this._managersById[args.id].getScaleBounds();
    });
    rpc.receive("doZoom", (args: any) => this._managersById[args.id]?.doZoom(args));
    rpc.receive("resetZoomDelta", (args: any) => this._managersById[args.id]?.resetZoomDelta());
    rpc.receive("doPan", (args: any) => this._managersById[args.id]?.doPan(args));
    rpc.receive("resetPanDelta", (args: any) => this._managersById[args.id]?.resetPanDelta());
    rpc.receive("update", (args: any) => this._managersById[args.id]?.update(args));
    rpc.receive("resetZoom", (args: any) => this._managersById[args.id]?.resetZoom());
    rpc.receive("destroy", (args: any) => {
      const manager = this._managersById[args.id];
      if (manager) {
        const result = manager.destroy();
        delete this._managersById[args.id];
        return result;
      }
    });
    rpc.receive("getElementAtXAxis", (args: any) =>
      this._managersById[args.id]?.getElementAtXAxis(args),
    );
    rpc.receive("getDatalabelAtEvent", (args: any) =>
      this._managersById[args.id]?.getDatalabelAtEvent(args),
    );
  }
}
