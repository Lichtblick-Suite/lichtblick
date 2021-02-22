//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import cx from "classnames";
import React, { useMemo } from "react";
import { PolygonBuilder, MouseEventObject, Polygon } from "regl-worldview";

import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import CameraInfo from "@foxglove-studio/app/panels/ThreeDimensionalViz/CameraInfo";
import Crosshair from "@foxglove-studio/app/panels/ThreeDimensionalViz/Crosshair";
import DrawingTools, {
  DrawingTabType,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/DrawingTools";
import MeasuringTool, {
  MeasureInfo,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/DrawingTools/MeasuringTool";
import FollowTFControl from "@foxglove-studio/app/panels/ThreeDimensionalViz/FollowTFControl";
import Interactions from "@foxglove-studio/app/panels/ThreeDimensionalViz/Interactions";
import { TabType } from "@foxglove-studio/app/panels/ThreeDimensionalViz/Interactions/Interactions";
import styles from "@foxglove-studio/app/panels/ThreeDimensionalViz/Layout.module.scss";
import MainToolbar from "@foxglove-studio/app/panels/ThreeDimensionalViz/MainToolbar";
import MeasureMarker from "@foxglove-studio/app/panels/ThreeDimensionalViz/MeasureMarker";
import SearchText, {
  SearchTextProps,
} from "@foxglove-studio/app/panels/ThreeDimensionalViz/SearchText";
import { LayoutToolbarSharedProps } from "@foxglove-studio/app/panels/ThreeDimensionalViz/TopicTree/Layout";

type Props = LayoutToolbarSharedProps &
  SearchTextProps & {
    autoSyncCameraState: boolean;
    debug: boolean;
    interactionsTabType: TabType | null | undefined;
    measureInfo: MeasureInfo;
    measuringElRef: { current: MeasuringTool | null };
    onSetDrawingTabType: (arg0: DrawingTabType | null | undefined) => void;
    onSetPolygons: (polygons: Polygon[]) => void;
    onToggleCameraMode: () => void;
    onToggleDebug: () => void;
    polygonBuilder: PolygonBuilder;
    rootTf: string | null | undefined;
    selectedObject: MouseEventObject | null | undefined;
    selectedPolygonEditFormat: "json" | "yaml";
    setInteractionsTabType: (arg0: TabType | null | undefined) => void;
    setMeasureInfo: (arg0: MeasureInfo) => void;
    showCrosshair: boolean | null | undefined;
    isHidden: boolean;
  };

function LayoutToolbar({
  autoSyncCameraState,
  cameraState,
  debug,
  followOrientation,
  followTf,
  interactionsTabType,
  isPlaying,
  measureInfo,
  measuringElRef,
  onAlignXYAxis,
  onCameraStateChange,
  onFollowChange,
  onSetDrawingTabType,
  onSetPolygons,
  onToggleCameraMode,
  onToggleDebug,
  polygonBuilder,
  rootTf,
  saveConfig,
  searchInputRef,
  searchText,
  searchTextMatches,
  searchTextOpen,
  selectedMatchIndex,
  selectedObject,
  selectedPolygonEditFormat,
  setInteractionsTabType,
  setMeasureInfo,
  setSearchText,
  setSearchTextMatches,
  setSelectedMatchIndex,
  showCrosshair,
  isHidden,
  targetPose,
  toggleSearchTextOpen,
  transforms,
}: Props) {
  const additionalToolbarItemsElem = useMemo(() => {
    const AdditionalToolbarItems = getGlobalHooks().perPanelHooks().ThreeDimensionalViz
      .AdditionalToolbarItems;
    return (
      <div className={cx(styles.buttons, styles.cartographer)}>
        <AdditionalToolbarItems transforms={transforms} />
      </div>
    );
  }, [transforms]);

  return isHidden ? null : (
    <>
      <MeasuringTool
        ref={measuringElRef}
        measureState={measureInfo.measureState}
        measurePoints={measureInfo.measurePoints}
        onMeasureInfoChange={setMeasureInfo}
      />
      <div className={cx(styles.toolbar, styles.right)}>
        <div className={styles.buttons}>
          <SearchText
            searchTextOpen={searchTextOpen}
            toggleSearchTextOpen={toggleSearchTextOpen}
            searchText={searchText}
            setSearchText={setSearchText}
            setSearchTextMatches={setSearchTextMatches}
            searchTextMatches={searchTextMatches}
            searchInputRef={searchInputRef}
            setSelectedMatchIndex={setSelectedMatchIndex}
            selectedMatchIndex={selectedMatchIndex}
            onCameraStateChange={onCameraStateChange}
            cameraState={cameraState}
            transforms={transforms}
            rootTf={rootTf}
            onFollowChange={onFollowChange}
          />
        </div>
        <div className={styles.buttons}>
          <FollowTFControl
            transforms={transforms}
            tfToFollow={followTf ? followTf : undefined}
            followOrientation={followOrientation}
            onFollowChange={onFollowChange}
          />
        </div>
        <MainToolbar
          measureInfo={measureInfo}
          measuringTool={measuringElRef.current}
          perspective={cameraState.perspective}
          debug={debug}
          onToggleCameraMode={onToggleCameraMode}
          onToggleDebug={onToggleDebug}
        />
        {measuringElRef.current && measuringElRef.current.measureDistance}
        <Interactions
          selectedObject={selectedObject}
          interactionsTabType={interactionsTabType}
          setInteractionsTabType={setInteractionsTabType}
        />
        <DrawingTools
          onSetPolygons={onSetPolygons}
          polygonBuilder={polygonBuilder}
          selectedPolygonEditFormat={selectedPolygonEditFormat}
          onSetDrawingTabType={onSetDrawingTabType}
        />
        <CameraInfo
          cameraState={cameraState}
          targetPose={targetPose}
          followOrientation={followOrientation}
          followTf={followTf}
          isPlaying={isPlaying}
          onAlignXYAxis={onAlignXYAxis}
          onCameraStateChange={onCameraStateChange}
          showCrosshair={!!showCrosshair}
          autoSyncCameraState={autoSyncCameraState}
        />
        {additionalToolbarItemsElem}
      </div>
      {!cameraState.perspective && showCrosshair && <Crosshair cameraState={cameraState} />}
      <MeasureMarker measurePoints={measureInfo.measurePoints} />
    </>
  );
}

export default React.memo<Props>(LayoutToolbar);
