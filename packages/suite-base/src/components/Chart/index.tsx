// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// These modules declaration merge into chart.js declarations for plugins
// Since we don't use the modules directly in this file, we need to load the types as references
// so typescript will have the merged declarations.
/// <reference types="chartjs-plugin-datalabels" />
/// <reference types="@foxglove/chartjs-plugin-zoom" />

import Logger from "@lichtblick/log";
import ChartJsMux, {
  ChartUpdateMessage,
} from "@lichtblick/suite-base/components/Chart/worker/ChartJsMux";
import Rpc, { createLinkedChannels } from "@lichtblick/suite-base/util/Rpc";
import WebWorkerManager from "@lichtblick/suite-base/util/WebWorkerManager";
import { mightActuallyBePartial } from "@lichtblick/suite-base/util/mightActuallyBePartial";
import { ChartOptions } from "chart.js";
import Hammer from "hammerjs";
import * as R from "ramda";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useMountedState } from "react-use";
import { assert } from "ts-essentials";
import { v4 as uuidv4 } from "uuid";

import { type ZoomPluginOptions } from "@foxglove/chartjs-plugin-zoom/types/options";

import { TypedChartData, ChartData, RpcElement, RpcScales } from "./types";

type PartialUpdate = Partial<ChartUpdateMessage>;

const log = Logger.getLogger(__filename);

function makeChartJSWorker() {
  // foxglove-depcheck-used: babel-plugin-transform-import-meta
  return new Worker(new URL("./worker/main", import.meta.url));
}

export type OnClickArg = {
  datalabel?: unknown;
  // x-value in scale
  x: number | undefined;
  // y-value in scale
  y: number | undefined;
};

type Props = {
  data?: ChartData;
  typedData?: TypedChartData;
  options: ChartOptions;
  isBoundsReset: boolean;
  type: "scatter";
  height: number;
  width: number;
  onClick?: (params: OnClickArg) => void;

  // called when the chart scales have updated (happens for zoom/pan/reset)
  onScalesUpdate?: (scales: RpcScales, opt: { userInteraction: boolean }) => void;

  // called when the chart is about to start rendering new data
  onStartRender?: () => void;

  // called when the chart has finished updating with new data
  onFinishRender?: () => void;

  // called when a user hovers over an element
  // uses the chart.options.hover configuration
  onHover?: (elements: RpcElement[]) => void;
};

const devicePixelRatio = mightActuallyBePartial(window).devicePixelRatio ?? 1;

const webWorkerManager = new WebWorkerManager(makeChartJSWorker, 4);

// turn a React.MouseEvent into an object we can send over rpc
function rpcMouseEvent(event: React.MouseEvent<HTMLElement>) {
  const boundingRect = event.currentTarget.getBoundingClientRect();

  return {
    cancelable: false,
    clientX: event.clientX - boundingRect.left,
    clientY: event.clientY - boundingRect.top,
    target: {
      boundingClientRect: boundingRect.toJSON(),
    },
  };
}

type RpcSend = <T>(
  topic: string,
  payload?: Record<string, unknown>,
  transferables?: Transferable[],
) => Promise<T>;

// Chart component renders data using workers with chartjs offscreen canvas

const supportsOffscreenCanvas =
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function";

function Chart(props: Props): JSX.Element {
  const [id] = useState(() => uuidv4());

  const initialized = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>();
  const containerRef = useRef<HTMLDivElement>(ReactNull);
  const isMounted = useMountedState();

  // to avoid changing useCallback deps for callbacks which access the scale value
  // at the time they are invoked
  const currentScalesRef = useRef<RpcScales | undefined>();

  const zoomEnabled =
    (props.options.plugins?.zoom as ZoomPluginOptions | undefined)?.zoom?.enabled ?? false;
  const panEnabled =
    (props.options.plugins?.zoom as ZoomPluginOptions | undefined)?.pan?.enabled ?? false;

  const {
    type,
    data,
    typedData,
    isBoundsReset,
    options,
    width,
    height,
    onStartRender,
    onFinishRender,
  } = props;

  const sendWrapperRef = useRef<RpcSend | undefined>();
  const rpcSendRef = useRef<RpcSend | undefined>();

  const hasPannedSinceMouseDown = useRef(false);
  const queuedUpdates = useRef<PartialUpdate[]>([]);
  const isSending = useRef<boolean>(false);
  const previousUpdateMessage = useRef<Record<string, unknown>>({});

  useLayoutEffect(() => {
    log.info(`Register Chart ${id}`);
    let rpc: Rpc;
    if (supportsOffscreenCanvas) {
      rpc = webWorkerManager.registerWorkerListener(id);
    } else {
      const { local, remote } = createLinkedChannels();
      new ChartJsMux(new Rpc(remote));
      rpc = new Rpc(local);
    }

    // helper function to send rpc to our worker - all invocations need an _id_ so we inject it here
    const sendWrapper = async <T,>(
      topic: string,
      payload?: Record<string, unknown>,
      transferables?: Transferable[],
    ) => {
      return await rpc.send<T>(topic, { id, ...payload }, transferables);
    };

    // store the send wrapper so it can be set to rpcSendRef once initialization occurs
    sendWrapperRef.current = sendWrapper;

    return () => {
      log.info(`Unregister chart ${id}`);
      sendWrapper("destroy").catch(() => {}); // may fail if worker is torn down
      rpcSendRef.current = undefined;
      sendWrapperRef.current = undefined;
      initialized.current = false;
      previousUpdateMessage.current = {};
      canvasRef.current?.remove();
      canvasRef.current = undefined;
      if (supportsOffscreenCanvas) {
        webWorkerManager.unregisterWorkerListener(id);
      }
    };
  }, [id]);

  // trigger when scales update
  const onScalesUpdateRef = useRef(props.onScalesUpdate);
  onScalesUpdateRef.current = props.onScalesUpdate;

  const maybeUpdateScales = useCallback(
    (newScales: RpcScales, opt?: { userInteraction: boolean }) => {
      if (!isMounted()) {
        return;
      }

      const oldScales = currentScalesRef.current;
      currentScalesRef.current = newScales;

      // cheap hack to only update the scales when the values change
      // avoids triggering handlers that depend on scales
      const oldStr = JSON.stringify(oldScales);
      const newStr = JSON.stringify(newScales);
      if (oldStr !== newStr) {
        onScalesUpdateRef.current?.(newScales, opt ?? { userInteraction: false });
      }
    },
    [isMounted],
  );

  // getNewUpdateMessage returns an update message for the changed fields from the last
  // call to get an update message
  //
  // The purpose of this mechanism is to avoid sending data/options/size to the worker
  // if they are unchanged from a previous initialization or update.
  const getNewUpdateMessage = useCallback(() => {
    const prev = previousUpdateMessage.current;
    const out: PartialUpdate = {};

    // NOTE(Roman): I don't know why this happens but when I initialize a chart using some data
    // and width/height of 0. Even when I later send an update for correct width/height the chart
    // does not render.
    //
    // The workaround here is to avoid sending any initialization or update messages until we have
    // a width and height that are non-zero
    if (width === 0 || height === 0) {
      return undefined;
    }

    if (prev.data !== data) {
      prev.data = out.data = data;
    }
    if (prev.typedData !== typedData) {
      prev.typedData = out.typedData = typedData;
    }
    if (prev.options !== options) {
      prev.options = out.options = options;
    }
    if (prev.height !== height) {
      prev.height = out.height = height;
    }
    if (prev.width !== width) {
      prev.width = out.width = width;
    }

    out.isBoundsReset = isBoundsReset;

    // nothing to update
    if (Object.keys(out).length === 0) {
      return;
    }

    return out;
  }, [data, typedData, height, options, isBoundsReset, width]);

  // Flush all new updates to the worker, coalescing them together if there is
  // more than one.
  const flushUpdates = useCallback(
    async (send: RpcSend | undefined) => {
      if (send == undefined || isSending.current) {
        return;
      }

      isSending.current = true;

      while (queuedUpdates.current.length > 0) {
        const { current: updates } = queuedUpdates;
        if (updates.length === 0) {
          break;
        }

        // We merge all of the pending updates together to do as few renders as
        // possible when we fall behind
        const coalesced = R.mergeAll(updates);
        onStartRender?.();
        const scales = await send<RpcScales>("update", coalesced);
        maybeUpdateScales(scales);
        onFinishRender?.();
        queuedUpdates.current = queuedUpdates.current.slice(updates.length);
      }

      isSending.current = false;
    },
    [maybeUpdateScales, onFinishRender, onStartRender],
  );

  // Update the chart with a new set of data
  const updateChart = useCallback(
    async (update: PartialUpdate) => {
      if (initialized.current) {
        queuedUpdates.current = [...queuedUpdates.current, update];
        await flushUpdates(rpcSendRef.current);
        return;
      }

      // first time initialization
      assert(canvasRef.current == undefined, "Canvas has already been initialized");
      assert(containerRef.current, "No container ref");
      assert(sendWrapperRef.current, "No RPC");

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.width = update.width ?? 0;
      canvas.height = update.height ?? 0;
      containerRef.current.appendChild(canvas);

      canvasRef.current = canvas;
      initialized.current = true;

      onStartRender?.();
      const offscreenCanvas =
        typeof canvas.transferControlToOffscreen === "function"
          ? canvas.transferControlToOffscreen()
          : canvas;
      const scales = await sendWrapperRef.current<RpcScales>(
        "initialize",
        {
          node: offscreenCanvas,
          type,
          data: update.data,
          typedData: update.typedData,
          options: update.options,
          devicePixelRatio,
          width: update.width,
          height: update.height,
        },
        [
          // If this is actually a HTMLCanvasElement then it will not be transferred because we
          // don't use a worker
          offscreenCanvas as OffscreenCanvas,
        ],
      );
      maybeUpdateScales(scales);
      onFinishRender?.();

      // We cannot rely solely on the call to `initialize`, since it doesn't
      // actually produce the first frame. However, if we append this update to
      // the end, it will overwrite updates that have been queued _since we
      // started initializing_. This is incorrect behavior and can set the
      // scales incorrectly on weak devices.
      //
      // To prevent this from happening, we put this update at the beginning of
      // the queue so that it gets coalesced properly.
      queuedUpdates.current = [update, ...queuedUpdates.current];
      await flushUpdates(sendWrapperRef.current);
      // once we are initialized, we can allow other handlers to send to the rpc endpoint
      rpcSendRef.current = sendWrapperRef.current;
    },
    [maybeUpdateScales, onFinishRender, onStartRender, type, flushUpdates],
  );

  const [updateError, setUpdateError] = useState<Error | undefined>();
  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    setUpdateError(undefined);

    const newUpdate = getNewUpdateMessage();
    if (!newUpdate) {
      return;
    }

    updateChart(newUpdate).catch((err: Error) => {
      if (isMounted()) {
        setUpdateError(err);
      }
      console.error(err);
    });
  }, [getNewUpdateMessage, isMounted, updateChart]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !panEnabled) {
      return;
    }

    const hammerManager = new Hammer.Manager(container);
    const threshold = props.options.plugins?.zoom?.pan?.threshold ?? 10;
    hammerManager.add(new Hammer.Pan({ threshold }));

    hammerManager.on("panstart", async (event) => {
      hasPannedSinceMouseDown.current = true;

      if (!rpcSendRef.current) {
        return;
      }

      const boundingRect = event.target.getBoundingClientRect();
      await rpcSendRef.current<RpcScales>("panstart", {
        event: {
          cancelable: false,
          deltaY: event.deltaY,
          deltaX: event.deltaX,
          center: {
            x: event.center.x,
            y: event.center.y,
          },
          target: {
            boundingClientRect: boundingRect.toJSON(),
          },
        },
      });
    });

    hammerManager.on("panmove", async (event) => {
      if (!rpcSendRef.current) {
        return;
      }

      const boundingRect = event.target.getBoundingClientRect();
      const scales = await rpcSendRef.current<RpcScales>("panmove", {
        event: {
          cancelable: false,
          deltaY: event.deltaY,
          deltaX: event.deltaX,
          target: {
            boundingClientRect: boundingRect.toJSON(),
          },
        },
      });
      maybeUpdateScales(scales, { userInteraction: true });
    });

    hammerManager.on("panend", async (event) => {
      if (!rpcSendRef.current) {
        return;
      }

      const boundingRect = event.target.getBoundingClientRect();
      const scales = await rpcSendRef.current<RpcScales>("panend", {
        event: {
          cancelable: false,
          deltaY: event.deltaY,
          deltaX: event.deltaX,
          target: {
            boundingClientRect: boundingRect.toJSON(),
          },
        },
      });
      maybeUpdateScales(scales, { userInteraction: true });
    });

    return () => {
      hammerManager.destroy();
    };
  }, [maybeUpdateScales, panEnabled, props.options.plugins?.zoom?.pan?.threshold]);

  const onWheel = useCallback(
    async (event: React.WheelEvent<HTMLElement>) => {
      if (!zoomEnabled || !rpcSendRef.current) {
        return;
      }

      const boundingRect = event.currentTarget.getBoundingClientRect();
      const scales = await rpcSendRef.current<RpcScales>("wheel", {
        event: {
          cancelable: false,
          deltaY: event.deltaY,
          deltaX: event.deltaX,
          clientX: event.clientX,
          clientY: event.clientY,
          target: {
            boundingClientRect: boundingRect.toJSON(),
          },
        },
      });
      maybeUpdateScales(scales, { userInteraction: true });
    },
    [zoomEnabled, maybeUpdateScales],
  );

  const onMouseDown = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      hasPannedSinceMouseDown.current = false;

      if (!rpcSendRef.current) {
        return;
      }

      const scales = await rpcSendRef.current<RpcScales>("mousedown", {
        event: rpcMouseEvent(event),
      });

      maybeUpdateScales(scales);
    },
    [maybeUpdateScales],
  );

  const onMouseUp = useCallback(async (event: React.MouseEvent<HTMLElement>) => {
    if (!rpcSendRef.current) {
      return;
    }

    return await rpcSendRef.current("mouseup", {
      event: rpcMouseEvent(event),
    });
  }, []);

  // Since hover events are handled via rpc, we might get a response back when we've
  // already hovered away from the chart. We gate calling onHover by whether the mouse is still
  // present on the component
  const mousePresentRef = useRef(false);

  const { onHover } = props;
  const onMouseMove = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      mousePresentRef.current = true; // The mouse must be present if we're getting this event.

      if (onHover == undefined || rpcSendRef.current == undefined) {
        return;
      }

      const elements = await rpcSendRef.current<RpcElement[]>("getElementsAtEvent", {
        event: rpcMouseEvent(event),
      });

      // Check mouse presence again in case the mouse has left the canvas while we
      // were waiting for the RPC call.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (isMounted() && mousePresentRef.current) {
        onHover(elements);
      }
    },
    [onHover, isMounted],
  );

  const onMouseEnter = useCallback(() => {
    mousePresentRef.current = true;
  }, []);

  const onMouseLeave = useCallback(() => {
    mousePresentRef.current = false;
    onHover?.([]);
  }, [onHover]);

  const onClick = useCallback(
    async (event: React.MouseEvent<HTMLElement>): Promise<void> => {
      if (
        !props.onClick ||
        !rpcSendRef.current ||
        !isMounted() ||
        hasPannedSinceMouseDown.current // Don't send click event if it was part of a pan gesture.
      ) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // maybe we should forward the click event and add support for datalabel listeners
      // the rpc channel doesn't have a way to send rpc back...
      const datalabel = await rpcSendRef.current("getDatalabelAtEvent", {
        event: { x: mouseX, y: mouseY, type: "click" },
      });

      let xVal: number | undefined;
      let yVal: number | undefined;

      const xScale = currentScalesRef.current?.x;
      if (xScale) {
        const pixels = xScale.pixelMax - xScale.pixelMin;
        const range = xScale.max - xScale.min;
        xVal = (range / pixels) * (mouseX - xScale.pixelMin) + xScale.min;
      }

      const yScale = currentScalesRef.current?.y;
      if (yScale) {
        const pixels = yScale.pixelMax - yScale.pixelMin;
        const range = yScale.max - yScale.min;
        yVal = (range / pixels) * (mouseY - yScale.pixelMin) + yScale.min;
      }

      props.onClick({
        datalabel,
        x: xVal,
        y: yVal,
      });
    },
    [isMounted, props],
  );

  if (updateError) {
    throw updateError;
  }

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      style={{ width, height, cursor: "crosshair", position: "relative" }}
    />
  );
}

export default Chart;
