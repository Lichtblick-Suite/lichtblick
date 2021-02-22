//
//  Copyright (c) 2019-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import React, { forwardRef } from "react";
import { Worldview, CameraState, MouseHandler, DEFAULT_CAMERA_STATE } from "regl-worldview";

import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import { LAYER_INDEX_DEFAULT_BASE } from "@foxglove-studio/app/panels/ThreeDimensionalViz/constants";
import {
  WorldSearchTextProps,
  useGLText,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/SearchText";
import { withDiffMode } from "@foxglove-studio/app/panels/ThreeDimensionalViz/utils/diffModeUtils";
import withHighlights from "@foxglove-studio/app/panels/ThreeDimensionalViz/withWorldMarkerHighlights";
import WorldMarkers, {
  InteractiveMarkersByType,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/WorldMarkers";
// @ts-expect-error flow imports have any type
import inScreenshotTests from "@foxglove-studio/app/stories/inScreenshotTests";
import { MarkerCollector, MarkerProvider } from "@foxglove-studio/app/types/Scene";

type Props = WorldSearchTextProps & {
  autoTextBackgroundColor: boolean;
  cameraState: CameraState;
  children?: Node;
  isPlaying: boolean;
  isDemoMode: boolean;
  markerProviders: MarkerProvider[];
  onCameraStateChange: (arg0: CameraState) => void;
  onClick: MouseHandler;
  onDoubleClick: MouseHandler;
  onMouseDown?: MouseHandler;
  onMouseMove?: MouseHandler;
  onMouseUp?: MouseHandler;
  diffModeEnabled: boolean;
};

function getMarkers(markerProviders: MarkerProvider[]): InteractiveMarkersByType {
  const markers: InteractiveMarkersByType = {
    arrow: [],
    cube: [],
    cubeList: [],
    cylinder: [],
    filledPolygon: [],
    glText: [],
    grid: [],
    instancedLineList: [],
    laserScan: [],
    linedConvexHull: [],
    lineList: [],
    lineStrip: [],
    overlayIcon: [],
    pointcloud: [],
    points: [],
    poseMarker: [],
    sphere: [],
    sphereList: [],
    text: [],
    triangleList: [],
  };

  const collector: any = {};
  getGlobalHooks()
    .perPanelHooks()
    .ThreeDimensionalViz.allSupportedMarkers.forEach((field: any) => {
      if (!(markers as any)[field]) {
        (markers as any)[field] = [];
      }
      collector[field] = (o: any) => (markers as any)[field].push(o);
    });

  markerProviders.forEach((provider) => {
    if (provider) {
      provider.renderMarkers((collector as any) as MarkerCollector);
    }
  });

  return markers;
}

// Wrap the WorldMarkers in HoC(s)
const WrappedWorldMarkers = withHighlights(withDiffMode(WorldMarkers));

function World(
  {
    onClick,
    autoTextBackgroundColor,
    children,
    onCameraStateChange,
    diffModeEnabled,
    cameraState,
    isPlaying,
    isDemoMode,
    markerProviders,
    onDoubleClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    setSearchTextMatches,
    searchText,
    searchTextOpen,
    selectedMatchIndex,
    searchTextMatches,
  }: Props,
  ref: typeof Worldview,
) {
  const markersByType = getMarkers(markerProviders);
  const { text = [] } = markersByType;
  const processedMarkersByType = {
    ...markersByType,
    text: [],
    glText: useGLText({
      text,
      setSearchTextMatches,
      searchText,
      searchTextOpen,
      selectedMatchIndex,
      searchTextMatches,
    }),
  };

  return (
    <Worldview
      cameraState={cameraState}
      enableStackedObjectEvents={!isPlaying}
      hideDebug={inScreenshotTests()}
      onCameraStateChange={onCameraStateChange} // Rendering the hitmap is an expensive operation and we want to avoid
      // doing it when the user is dragging the view with the mouse. By ignoring
      // these events, the only way to select an object is when receiving an "onClick" event.
      disableHitmapForEvents={["onMouseDown", "onMouseMove", "onMouseUp"]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      resolutionScale={isDemoMode ? 2 : 1}
      ref={ref}
      contextAttributes={{ preserveDrawingBuffer: true }}
    >
      {children}
      <WrappedWorldMarkers
        {...{
          autoTextBackgroundColor,
          markersByType: processedMarkersByType,
          layerIndex: LAYER_INDEX_DEFAULT_BASE,
          clearCachedMarkers: false,
          isDemoMode,
          cameraDistance: cameraState.distance || DEFAULT_CAMERA_STATE.distance,
          diffModeEnabled,
        }}
      />
    </Worldview>
  );
}

export default forwardRef<typeof Worldview>(World as any) as any;
