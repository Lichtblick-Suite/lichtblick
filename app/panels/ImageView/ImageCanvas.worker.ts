//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { renderImage } from "./renderImage";
import { Dimensions, RawMarkerData, OffscreenCanvas } from "./util";
import { Message } from "@foxglove-studio/app/players/types";
import Rpc from "@foxglove-studio/app/util/Rpc";
import { setupWorker } from "@foxglove-studio/app/util/RpcWorkerUtils";

export default class ImageCanvasWorker {
  _idToCanvas: {
    [key: string]: OffscreenCanvas;
  } = {};
  _rpc: Rpc;

  constructor(rpc: Rpc) {
    setupWorker(rpc);
    this._rpc = rpc;

    rpc.receive("initialize", async ({ id, canvas }: { id: string; canvas: OffscreenCanvas }) => {
      this._idToCanvas[id] = canvas;
    });

    rpc.receive(
      "renderImage",
      async ({
        id,
        imageMessage,
        imageMessageDatatype,
        rawMarkerData,
      }: {
        id: string;
        imageMessage: Message | null | undefined;
        imageMessageDatatype: string | null | undefined;
        rawMarkerData: RawMarkerData;
      }): Promise<Dimensions | null | undefined> => {
        const canvas = this._idToCanvas[id];
        return renderImage({ canvas, imageMessage, imageMessageDatatype, rawMarkerData });
      },
    );
  }
}

if ((global as any).postMessage && !global.onmessage) {
  // @ts-expect-error not yet using TS Worker lib: FG-64
  new ImageCanvasWorker(new Rpc(global));
}
