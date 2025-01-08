// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Chart, ChartOptions, Scale } from "chart.js";

import { Zoom as ZoomPlugin } from "@lichtblick/chartjs-plugin-zoom";
import { Immutable } from "@lichtblick/suite";
import { ChartRenderer } from "@lichtblick/suite-base/panels/Plot/ChartRenderer";
import { getChartOptions } from "@lichtblick/suite-base/panels/Plot/ChartUtilities/ChartOptions";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { ChartOptionsPlot, ChartRendererProps, ChartType, UpdateAction } from "./types";

const OPTIONS_CHART: ChartOptionsPlot = {
  devicePixelRatio: 2,
  gridColor: "#ccc",
  tickColor: "#000",
};

const SCALES_CHART: Record<string, Partial<Scale>> = {
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
};

jest.mock("chart.js", () => {
  const canvas = { width: 0, height: 0 };
  const options: ChartOptions = {
    scales: {
      x: {
        ticks: {
          color: OPTIONS_CHART.tickColor,
        },
      },
      y: {
        ticks: {
          color: OPTIONS_CHART.tickColor,
        },
      },
    },
    plugins: {},
    interaction: {},
  };

  return {
    Chart: jest.fn().mockImplementation(() => ({
      update: jest.fn(),
      resize: jest.fn(),
      data: { datasets: [] },
      options,
      scales: SCALES_CHART,
      canvas,
      getElementsAtEventForMode: jest.fn().mockReturnValue([]),
    })),
  };
});

jest.mock("@lichtblick/chartjs-plugin-zoom", () => ({
  Zoom: {
    start: jest.fn(),
  },
}));

jest.mock("@lichtblick/suite-base/panels/Plot/ChartUtilities/ChartOptions", () => ({
  getChartOptions: jest.fn().mockReturnValue({}),
}));

global.OffscreenCanvas = class {
  public width: number;
  public height: number;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public getContext() {
    return {};
  }
} as unknown as typeof OffscreenCanvas;

type Setup = {
  actionOverride?: Partial<UpdateAction>;
};

// chartMocked();
describe("ChartRenderer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  // afterEach(() => {
  //   jest.clearAllMocks();
  // });

  function setup({ actionOverride }: Setup = {}) {
    const canvas = new OffscreenCanvas(500, 500);
    const props: ChartRendererProps = {
      canvas,
      ...OPTIONS_CHART,
    };

    const action: Immutable<UpdateAction> = {
      type: "update",
      ...actionOverride,
    };

    const chartOptions = {
      scales: {
        x: { ticks: { tickColor: props.tickColor } },
        y: { ticks: { tickColor: props.tickColor } },
      },
    };
    (getChartOptions as jest.Mock).mockReturnValue(chartOptions);

    const chartRenderer = new ChartRenderer(props);

    return {
      canvas,
      props,
      chartRenderer,
      action,
      chartOptions,
    };
  }

  it("should initialize a Chart instance with correct chart options", () => {
    const { props } = setup();

    expect(Chart).toHaveBeenCalledWith(expect.anything(), {
      data: { datasets: [] },
      options: expect.any(Object),
      plugins: [ZoomPlugin],
      type: "scatter",
    });
    expect(getChartOptions).toHaveBeenCalledWith({
      devicePixelRatio: props.devicePixelRatio,
      gridColor: props.gridColor,
      tickColor: props.tickColor,
    });
  });

  describe("Update ChartRenderer", () => {
    it("should update chart dimensions on update action", () => {
      const { action, chartRenderer } = setup({
        actionOverride: {
          size: {
            width: BasicBuilder.number({ min: 800, max: 3840 }),
            height: BasicBuilder.number({ min: 600, max: 2160 }),
          },
        },
      });

      chartRenderer.update(action);
      const chartInstance = chartRenderer.getChartInstance();
      const resizeSpy = jest.spyOn(chartInstance, "resize");

      expect(chartInstance.canvas.width).toBe(action.size?.width);
      expect(chartInstance.canvas.height).toBe(action.size?.height);
      expect(resizeSpy).toHaveBeenCalledTimes(1);
      // expect(chartInstance.resize).toHaveBeenCalledTimes(1);
    });

    it("should update chart scales on update action", () => {
      const { action, chartRenderer } = setup({
        actionOverride: {
          xBounds: {
            min: BasicBuilder.number({ min: 0, max: 100 }),
            max: BasicBuilder.number({ min: 101, max: 200 }),
          },
          yBounds: {
            min: BasicBuilder.number({ min: 0, max: 100 }),
            max: BasicBuilder.number({ min: 101, max: 200 }),
          },
        },
      });

      chartRenderer.update(action);
      const chartInstance: ChartType = chartRenderer.getChartInstance();

      expect(chartInstance.options.scales!.x!.min).toBe(action.xBounds!.min);
      expect(chartInstance.options.scales!.x!.max).toBe(action.xBounds!.max);
      expect(chartInstance.options.scales!.y!.min).toBe(action.yBounds!.min);
      expect(chartInstance.options.scales!.y!.max).toBe(action.yBounds!.max);
    });

    it("should display x-axis labels when enabled in update action", () => {
      const { action, chartRenderer } = setup({
        actionOverride: {
          showXAxisLabels: true,
        },
      });

      chartRenderer.update(action);
      const chartInstance: ChartType = chartRenderer.getChartInstance();

      expect(chartInstance.options.scales!.x!.ticks?.display).toBe(true);
    });

    it("should display y-axis labels when enabled in update action", () => {
      const { action, chartRenderer } = setup({
        actionOverride: {
          showYAxisLabels: true,
        },
      });

      chartRenderer.update(action);
      const chartInstance: ChartType = chartRenderer.getChartInstance();

      expect(chartInstance.options.scales!.y!.ticks?.display).toBe(true);
    });

    it("should update chart on update action", () => {
      const { action, chartRenderer } = setup();

      chartRenderer.update(action);
      const chartInstance = chartRenderer.getChartInstance();
      const updateSpy = jest.spyOn(chartInstance, "update");

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith("none");
    });

    it("should update returns x and y scales", () => {
      const { action, chartRenderer } = setup();

      const chartUpdated = chartRenderer.update(action);

      expect(chartUpdated?.x.min).toBe(SCALES_CHART.x!.min!);
      expect(chartUpdated?.x.max).toBe(SCALES_CHART.x!.max!);
      expect(chartUpdated?.y.min).toBe(SCALES_CHART.y!.min!);
      expect(chartUpdated?.y.max).toBe(SCALES_CHART.y!.max!);
    });

    it("should update returns undefined", () => {
      (Chart as unknown as jest.Mock).mockImplementation(() => ({
        update: jest.fn(),
        scales: {
          x: undefined,
          y: undefined,
        },
      }));
      const { action, chartRenderer } = setup();

      const chartUpdated = chartRenderer.update(action);

      expect(chartUpdated).toBeUndefined();
    });
  });
});
