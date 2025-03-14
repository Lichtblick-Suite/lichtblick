// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import type { Theme } from "@mui/material";
import { EventEmitter } from "eventemitter3";
import * as _ from "lodash-es";

import { simpleGetMessagePathDataItems } from "@lichtblick/suite-base/components/MessagePathSyntax/simpleGetMessagePathDataItems";
import { InteractionEvent } from "@lichtblick/suite-base/panels/Plot/types";
import { MessageBlock } from "@lichtblick/suite-base/players/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import PlayerBuilder from "@lichtblick/suite-base/testing/builders/PlayerBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { Bounds } from "@lichtblick/suite-base/types/Bounds";

import { OffscreenCanvasRenderer } from "./OffscreenCanvasRenderer";
import { PlotCoordinator } from "./PlotCoordinator";
import { IDatasetsBuilder, SeriesItem } from "./builders/IDatasetsBuilder";

jest.mock("./OffscreenCanvasRenderer");
jest.mock("./builders/IDatasetsBuilder");

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

jest.mock(
  "@lichtblick/suite-base/components/MessagePathSyntax/simpleGetMessagePathDataItems",
  () => ({
    simpleGetMessagePathDataItems: jest.fn(),
  }),
);

describe("PlotCoordinator", () => {
  let renderer: jest.Mocked<OffscreenCanvasRenderer>;
  let datasetsBuilder: jest.Mocked<IDatasetsBuilder>;
  let plotCoordinator: PlotCoordinator;

  beforeEach(() => {
    const canvas = new OffscreenCanvas(500, 500);
    const theme: Theme = { name: "dark" } as Theme;
    renderer = new OffscreenCanvasRenderer(canvas, theme) as jest.Mocked<OffscreenCanvasRenderer>;
    datasetsBuilder = new (EventEmitter as any)() as jest.Mocked<IDatasetsBuilder>;

    datasetsBuilder.handlePlayerState = jest.fn().mockReturnValue(undefined);
    datasetsBuilder.getViewportDatasets = jest.fn().mockResolvedValue({
      datasetsByConfigIndex: [],
      pathsWithMismatchedDataLengths: [],
    });
    datasetsBuilder.setSeries = jest.fn();
    datasetsBuilder.handleBlocks = jest.fn().mockResolvedValue(undefined);
    datasetsBuilder.getCsvData = jest.fn().mockResolvedValue([]);

    plotCoordinator = new PlotCoordinator(renderer, datasetsBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize plotCoordinator", () => {
    expect(plotCoordinator).toBeDefined();
  });

  describe("handlePlayerState", () => {
    it("should emit 'currentValuesChanged' when processing player state", () => {
      const state = PlayerBuilder.playerState({
        activeData: PlayerBuilder.activeData(),
      });

      const listener = jest.fn();
      plotCoordinator.on("currentValuesChanged", listener);

      plotCoordinator.handlePlayerState(state);

      expect(listener).toHaveBeenCalledWith([]);
    });

    it("should not emit when no activeData", () => {
      const state = PlayerBuilder.playerState({ activeData: undefined });

      const listener = jest.fn();
      plotCoordinator.on("currentValuesChanged", listener);

      plotCoordinator.handlePlayerState(state);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should return immediately if plotCoordinator is destroyed", () => {
      const state = PlayerBuilder.playerState();
      jest.spyOn(plotCoordinator as any, "isDestroyed").mockReturnValue(true);
      const handlePlayerStateSpy = jest.spyOn(datasetsBuilder, "handlePlayerState");
      const updateSpy = jest.spyOn(renderer, "update");

      plotCoordinator.handlePlayerState(state);

      expect(handlePlayerStateSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("should update currentSeconds if isTimeseriesPlot is true", () => {
      const state = PlayerBuilder.playerState({
        activeData: PlayerBuilder.activeData({
          currentTime: RosTimeBuilder.time({ sec: 100, nsec: 0 }),
          startTime: RosTimeBuilder.time({ sec: 50, nsec: 0 }),
        }),
      });
      (plotCoordinator as any).isTimeseriesPlot = true;

      plotCoordinator.handlePlayerState(state);

      expect(plotCoordinator["currentSeconds"]).toBe(
        state.activeData!.currentTime.sec - state.activeData!.startTime.sec,
      );
    });

    it("should update currentValuesByConfigIndex with the latest message item", () => {
      const state = PlayerBuilder.playerState({
        activeData: PlayerBuilder.activeData(),
      });
      plotCoordinator["series"] = [
        {
          parsed: { topicName: state.activeData?.messages[0]?.topic },
          configIndex: 0,
        },
        {
          parsed: { topicName: state.activeData?.messages[1]?.topic },
          configIndex: 1,
        },
      ] as SeriesItem[];
      const itemsResponse = [BasicBuilder.numbers(), [BasicBuilder.number()]];
      (simpleGetMessagePathDataItems as jest.Mock)
        .mockReturnValueOnce(itemsResponse[0])
        .mockReturnValueOnce(itemsResponse[1]);

      plotCoordinator.handlePlayerState(state);

      expect(simpleGetMessagePathDataItems).toHaveBeenCalledTimes(2);
      expect(plotCoordinator["currentValuesByConfigIndex"]).toEqual([
        _.last(itemsResponse[0]),
        _.last(itemsResponse[1]),
      ]);
    });

    it("should not update currentValuesByConfigIndex", () => {
      const state = PlayerBuilder.playerState({
        activeData: PlayerBuilder.activeData(),
      });
      plotCoordinator["series"] = [
        {
          parsed: { topicName: state.activeData?.messages[0]?.topic },
          configIndex: 0,
          timestampMethod: "headerStamp",
        },
        {
          parsed: { topicName: state.activeData?.messages[1]?.topic },
          configIndex: 1,
          timestampMethod: "headerStamp",
        },
      ] as SeriesItem[];

      plotCoordinator.handlePlayerState(state);

      expect(simpleGetMessagePathDataItems).not.toHaveBeenCalled();
      expect(plotCoordinator["currentValuesByConfigIndex"]).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("should set 'destroyed' to true when calling destroy", () => {
      plotCoordinator.destroy();

      expect(plotCoordinator["destroyed"]).toBe(true);
    });
  });

  describe("dispatchRender", () => {
    it("should call 'update' on the renderer when dispatching render", async () => {
      renderer.update.mockResolvedValue({ x: { min: 0, max: 10 }, y: { min: 0, max: 10 } });

      await plotCoordinator["dispatchRender"]();

      const updateSpyOn = jest.spyOn(renderer, "update");
      expect(updateSpyOn).toHaveBeenCalled();
    });

    it("should emit 'timeseriesBounds' when updating limits", async () => {
      const listener = jest.fn();
      plotCoordinator.on("timeseriesBounds", listener);
      const bounds: Bounds = {
        x: { min: BasicBuilder.number(), max: BasicBuilder.number() },
        y: { min: BasicBuilder.number(), max: BasicBuilder.number() },
      };
      (renderer.update as jest.Mock).mockResolvedValue(bounds);
      plotCoordinator.addInteractionEvent({
        type: "zoom",
        scaleX: BasicBuilder.number(),
        scaleY: BasicBuilder.number(),
      } as unknown as InteractionEvent);

      await plotCoordinator["dispatchRender"]();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bounds.x);
    });
  });

  describe("dispatchDownsample", () => {
    it("should call 'getViewportDatasets' when dispatching downsample", async () => {
      datasetsBuilder.getViewportDatasets = jest.fn().mockResolvedValue({
        datasetsByConfigIndex: [],
        pathsWithMismatchedDataLengths: [],
      });

      await plotCoordinator["dispatchDownsample"]();

      const getViewportDatasetsSpyOn = jest.spyOn(datasetsBuilder, "getViewportDatasets");
      expect(getViewportDatasetsSpyOn).toHaveBeenCalled();
    });
  });

  describe("resetBounds", () => {
    it("should reset limits correctly", () => {
      plotCoordinator.resetBounds();

      expect(plotCoordinator["interactionBounds"]).toBeUndefined();
      expect(plotCoordinator["globalBounds"]).toBeUndefined();
    });
  });

  describe("dispatchBlocks", () => {
    it("should process and store message blocks correctly", async () => {
      datasetsBuilder.handleBlocks = jest.fn().mockResolvedValue(undefined);
      const blocks = [{}] as MessageBlock[];
      const startTime = RosTimeBuilder.time();

      await plotCoordinator["dispatchBlocks"](startTime, blocks);

      const handleBlocksSpyOn = jest.spyOn(datasetsBuilder, "handleBlocks");
      expect(handleBlocksSpyOn).toHaveBeenCalled();
    });
  });
});
