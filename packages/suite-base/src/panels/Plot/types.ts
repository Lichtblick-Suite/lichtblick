// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Chart, ChartDataset, ScatterDataPoint } from "chart.js";

import { TimeBasedChartTooltipData } from "@lichtblick/suite-base/components/TimeBasedChart/TimeBasedChartTooltipContent";
import { PlotConfig } from "@lichtblick/suite-base/panels/Plot/config";
import { Bounds1D } from "@lichtblick/suite-base/types/Bounds";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

import { OriginalValue } from "./datum";

export type Scale = {
  min: number;
  max: number;
  left: number;
  right: number;
};

export type BaseInteractionEvent = {
  cancelable: boolean;
  deltaY: number;
  deltaX: number;

  boundingClientRect: DOMRect;
};

export type MouseBase = BaseInteractionEvent & {
  clientX: number;
  clientY: number;
};

export type WheelInteractionEvent = { type: "wheel" } & BaseInteractionEvent & MouseBase;

export type PanStartInteractionEvent = { type: "panstart" } & BaseInteractionEvent & {
    center: { x: number; y: number };
  };
export type PanMoveInteractionEvent = { type: "panmove" } & BaseInteractionEvent;

export type PanEndInteractionEvent = { type: "panend" } & BaseInteractionEvent;

export type InteractionEvent =
  | WheelInteractionEvent
  | PanStartInteractionEvent
  | PanMoveInteractionEvent
  | PanEndInteractionEvent;

export type Datum = ScatterDataPoint & { value?: OriginalValue };

export type Dataset = ChartDataset<"scatter", Datum[]>;

export type ChartType = Chart<"scatter", Datum[]>;

export type HoverElement = {
  data: Datum;
  configIndex: number;
};

export type Size = { width: number; height: number };

export type UpdateAction = {
  type: "update";
  size?: { width: number; height: number };
  showXAxisLabels?: boolean;
  showYAxisLabels?: boolean;
  xBounds?: Partial<Bounds1D>;
  yBounds?: Partial<Bounds1D>;
  zoomMode?: "x" | "y" | "xy";
  referenceLines?: { color: string; value: number }[];
  interactionEvents?: InteractionEvent[];
};

// allows us to override the chart.ctx instance field which zoom plugin uses for adding event listeners
export type MutableContext<T> = Omit<Chart, "ctx"> & { ctx: T };

export type PanEvent = {
  deltaX: number;
  deltaY: number;
};

export type PanStartEvent = PanEvent & {
  center: { x: number; y: number };
  target: {
    getBoundingClientRect(): DOMRect;
  };
};

export type ZoomableChart = Chart & {
  $zoom: {
    panStartHandler(event: PanStartEvent): void;
    panHandler(event: PanEvent): void;
    panEndHandler(): void;
  };
};

export type Props = {
  config: PlotConfig;
  saveConfig: SaveConfig<PlotConfig>;
};

export type ElementAtPixelArgs = {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
};

export type UseHoverHandlersHook = {
  onMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseOut: () => void;
  onWheel: (event: React.WheelEvent<HTMLElement>) => void;
  onResetView: () => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

export type TooltipStateSetter = {
  x: number;
  y: number;
  data: TimeBasedChartTooltipData[];
};
