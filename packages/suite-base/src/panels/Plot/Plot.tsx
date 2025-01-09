// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button, Tooltip, Fade, useTheme } from "@mui/material";
import * as _ from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMountedState } from "react-use";
import { v4 as uuidv4 } from "uuid";

import { parseMessagePath } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import KeyListener from "@lichtblick/suite-base/components/KeyListener";
import { fillInGlobalVariablesInPath } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import {
  useMessagePipelineGetter,
  useMessagePipelineSubscribe,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import {
  PanelContextMenu,
  PanelContextMenuItem,
} from "@lichtblick/suite-base/components/PanelContextMenu";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import { PANEL_TOOLBAR_MIN_HEIGHT } from "@lichtblick/suite-base/components/PanelToolbar/constants";
import Stack from "@lichtblick/suite-base/components/Stack";
import TimeBasedChartTooltipContent from "@lichtblick/suite-base/components/TimeBasedChart/TimeBasedChartTooltipContent";
import useGlobalVariables from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { VerticalBars } from "@lichtblick/suite-base/panels/Plot/VerticalBars";
import { defaultSidebarDimension } from "@lichtblick/suite-base/panels/Plot/constants";
import useHoverHandlers from "@lichtblick/suite-base/panels/Plot/hooks/useHoverHandlers";
import usePanning from "@lichtblick/suite-base/panels/Plot/hooks/usePanning";
import { PlotProps, TooltipStateSetter } from "@lichtblick/suite-base/panels/Plot/types";
import { PANEL_TITLE_CONFIG_KEY } from "@lichtblick/suite-base/util/layout";
import { getLineColor } from "@lichtblick/suite-base/util/plotColors";

import { useStyles } from "./Plot.style";
import { PlotCoordinator } from "./PlotCoordinator";
import { PlotLegend } from "./PlotLegend";
import { CurrentCustomDatasetsBuilder } from "./builders/CurrentCustomDatasetsBuilder";
import { CustomDatasetsBuilder } from "./builders/CustomDatasetsBuilder";
import { IndexDatasetsBuilder } from "./builders/IndexDatasetsBuilder";
import { TimestampDatasetsBuilder } from "./builders/TimestampDatasetsBuilder";
import { downloadCSV } from "./csv";
import useGlobalSync from "./hooks/useGlobalSync";
import { useRenderer } from "./hooks/useRenderer";
import useSubscriptions from "./hooks/useSubscriptions";
import { usePlotPanelSettings } from "./settings";

export function Plot(props: PlotProps): React.JSX.Element {
  const { saveConfig, config } = props;
  const {
    paths: series,
    showLegend,
    xAxisVal: xAxisMode,
    xAxisPath,
    legendDisplay = config.showSidebar === true ? "left" : "floating",
    sidebarDimension = config.sidebarWidth ?? defaultSidebarDimension,
    [PANEL_TITLE_CONFIG_KEY]: customTitle,
  } = config;

  const { classes } = useStyles();
  const theme = useTheme();

  const { setMessagePathDropConfig } = usePanelContext();
  const draggingRef = useRef(false);

  useEffect(() => {
    setMessagePathDropConfig({
      getDropStatus(paths) {
        if (paths.some((path) => !path.isLeaf)) {
          return { canDrop: false };
        }
        return { canDrop: true, effect: "add" };
      },
      handleDrop(paths) {
        saveConfig((prevConfig) => ({
          ...prevConfig,
          paths: [
            ...prevConfig.paths,
            ...paths.map((path) => ({
              value: path.path,
              enabled: true,
              timestampMethod: "receiveTime" as const,
            })),
          ],
        }));
      },
    });
  }, [saveConfig, setMessagePathDropConfig]);

  // When true the user can reset the plot back to the original view
  const [canReset, setCanReset] = useState(false);

  const [activeTooltip, setActiveTooltip] = useState<TooltipStateSetter>();

  const isMounted = useMountedState();
  const [focusedPath, setFocusedPath] = useState<undefined | string[]>(undefined);
  const [subscriberId] = useState(() => uuidv4());
  const [canvasDiv, setCanvasDiv] = useState<HTMLDivElement | ReactNull>(ReactNull);
  const [coordinator, setCoordinator] = useState<PlotCoordinator | undefined>(undefined);
  const shouldSync = config.xAxisVal === "timestamp" && config.isSynced;
  const renderer = useRenderer(canvasDiv, theme);

  const { onMouseMove, onMouseOut, onResetView, onWheel, onClick } = useHoverHandlers(
    coordinator,
    renderer,
    subscriberId,
    config,
    setActiveTooltip,
    { shouldSync },
    draggingRef,
  );

  usePlotPanelSettings(config, saveConfig, focusedPath);
  useSubscriptions(config, subscriberId);
  useGlobalSync(coordinator, setCanReset, { shouldSync }, subscriberId);
  usePanning(canvasDiv, coordinator, draggingRef);

  const onClickPath = useCallback((index: number) => {
    setFocusedPath(["paths", String(index)]);
  }, []);

  const getMessagePipelineState = useMessagePipelineGetter();

  const subscribeMessagePipeline = useMessagePipelineSubscribe();

  const { globalVariables } = useGlobalVariables();

  const getPanelContextMenuItems = useCallback(() => {
    const items: PanelContextMenuItem[] = [
      {
        type: "item",
        label: "Download plot data as CSV",
        onclick: async () => {
          const data = await coordinator?.getCsvData();
          if (!data || !isMounted()) {
            return;
          }

          downloadCSV(customTitle ?? "plot_data", data, xAxisMode);
        },
      },
    ];
    return items;
  }, [coordinator, customTitle, isMounted, xAxisMode]);

  useEffect(() => {
    coordinator?.handleConfig(config, theme.palette.mode, globalVariables);
  }, [coordinator, config, globalVariables, theme.palette.mode]);

  // This effect must come after the one above it so the coordinator gets the latest config before
  // the latest player state and can properly initialize if the player state already contains the
  // data for display.
  useEffect(() => {
    if (!coordinator) {
      return;
    }

    const unsub = subscribeMessagePipeline((state) => {
      coordinator.handlePlayerState(state.playerState);
    });

    // Subscribing only gets us _new_ updates, so we feed the latest state into the chart
    coordinator.handlePlayerState(getMessagePipelineState().playerState);
    return unsub;
  }, [coordinator, getMessagePipelineState, subscribeMessagePipeline]);

  const datasetsBuilder = useMemo(() => {
    switch (xAxisMode) {
      case "timestamp":
        return new TimestampDatasetsBuilder();
      case "index":
        return new IndexDatasetsBuilder();
      case "custom":
        return new CustomDatasetsBuilder();
      case "currentCustom":
        return new CurrentCustomDatasetsBuilder();
      default:
        throw new Error(`unsupported mode: ${xAxisMode}`);
    }
  }, [xAxisMode]);

  useEffect(() => {
    if (
      datasetsBuilder instanceof CurrentCustomDatasetsBuilder ||
      datasetsBuilder instanceof CustomDatasetsBuilder
    ) {
      if (!xAxisPath?.value) {
        datasetsBuilder.setXPath(undefined);
        return;
      }

      const parsed = parseMessagePath(xAxisPath.value);
      if (!parsed) {
        datasetsBuilder.setXPath(undefined);
        return;
      }

      datasetsBuilder.setXPath(fillInGlobalVariablesInPath(parsed, globalVariables));
    }
  }, [datasetsBuilder, globalVariables, xAxisPath]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!renderer || !datasetsBuilder || !canvasDiv) {
      return;
    }

    const contentRect = canvasDiv.getBoundingClientRect();

    const plotCoordinator = new PlotCoordinator(renderer, datasetsBuilder);
    setCoordinator(plotCoordinator);

    plotCoordinator.setSize({
      width: contentRect.width,
      height: contentRect.height,
    });

    const isCanvasTarget = (entry: Immutable<ResizeObserverEntry>) => entry.target === canvasDiv;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = _.findLast(entries, isCanvasTarget);
      if (entry) {
        plotCoordinator.setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(canvasDiv);

    return () => {
      resizeObserver.disconnect();
      plotCoordinator.destroy();
    };
  }, [canvasDiv, datasetsBuilder, renderer]);

  const { colorsByDatasetIndex, labelsByDatasetIndex } = useMemo(() => {
    const labels: Record<string, string> = {};
    const colors: Record<string, string> = {};

    for (let idx = 0; idx < config.paths.length; ++idx) {
      const item = config.paths[idx]!;
      labels[idx] = item.label ?? item.value;
      colors[idx] = getLineColor(item.color, idx);
    }

    return {
      colorsByDatasetIndex: colors,
      labelsByDatasetIndex: labels,
    };
  }, [config.paths]);

  const numSeries = config.paths.length;
  const tooltipContent = useMemo(() => {
    return activeTooltip ? (
      <TimeBasedChartTooltipContent
        content={activeTooltip.data}
        multiDataset={numSeries > 1}
        colorsByConfigIndex={colorsByDatasetIndex}
        labelsByConfigIndex={labelsByDatasetIndex}
      />
    ) : undefined;
  }, [activeTooltip, colorsByDatasetIndex, labelsByDatasetIndex, numSeries]);

  const hoveredValuesBySeriesIndex = useMemo(() => {
    if (!config.showPlotValuesInLegend) {
      return;
    }

    if (!activeTooltip?.data) {
      return;
    }

    const values = new Array(config.paths.length).fill(undefined);
    for (const item of activeTooltip.data) {
      values[item.configIndex] ??= item.value;
    }

    return values;
  }, [activeTooltip, config.paths.length, config.showPlotValuesInLegend]);

  const { keyDownHandlers, keyUphandlers } = useMemo(() => {
    return {
      keyDownHandlers: {
        v: () => {
          coordinator?.setZoomMode("y");
        },
        b: () => {
          coordinator?.setZoomMode("xy");
        },
      },
      keyUphandlers: {
        v: () => {
          coordinator?.setZoomMode("x");
        },
        b: () => {
          coordinator?.setZoomMode("x");
        },
      },
    };
  }, [coordinator]);

  return (
    <Stack
      flex="auto"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      position="relative"
    >
      <PanelToolbar />
      <Stack
        direction={legendDisplay === "top" ? "column" : "row"}
        flex="auto"
        fullWidth
        style={{ height: `calc(100% - ${PANEL_TOOLBAR_MIN_HEIGHT}px)` }}
        position="relative"
      >
        {/* Pass stable values here for properties when not showing values so that the legend memoization remains stable. */}
        {legendDisplay !== "none" && (
          <PlotLegend
            coordinator={coordinator}
            legendDisplay={legendDisplay}
            onClickPath={onClickPath}
            paths={series}
            saveConfig={saveConfig}
            showLegend={showLegend}
            sidebarDimension={sidebarDimension}
            showValues={config.showPlotValuesInLegend}
            hoveredValuesBySeriesIndex={hoveredValuesBySeriesIndex}
          />
        )}
        <Tooltip
          arrow={false}
          classes={{ tooltip: classes.tooltip }}
          open={tooltipContent != undefined}
          placement="right"
          title={tooltipContent ?? <></>}
          disableInteractive
          followCursor
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 0 }}
        >
          <div className={classes.verticalBarWrapper}>
            <div
              className={classes.canvasDiv}
              ref={setCanvasDiv}
              onWheel={onWheel}
              onMouseMove={onMouseMove}
              onMouseOut={onMouseOut}
              onClick={onClick}
              onDoubleClick={onResetView}
            />
            <VerticalBars
              coordinator={coordinator}
              hoverComponentId={subscriberId}
              xAxisIsPlaybackTime={xAxisMode === "timestamp"}
            />
          </div>
        </Tooltip>
        {canReset && (
          <div className={classes.resetZoomButton}>
            <Button
              variant="contained"
              color="inherit"
              title="(shortcut: double-click)"
              onClick={onResetView}
            >
              Reset view
            </Button>
          </div>
        )}
        <PanelContextMenu getItems={getPanelContextMenuItems} />
      </Stack>
      <KeyListener global keyDownHandlers={keyDownHandlers} keyUpHandlers={keyUphandlers} />
    </Stack>
  );
}
