//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ArrowSplitHorizontalIcon from "@mdi/svg/svg/arrow-split-horizontal.svg";
import ArrowSplitVerticalIcon from "@mdi/svg/svg/arrow-split-vertical.svg";
import CheckboxMultipleBlankOutlineIcon from "@mdi/svg/svg/checkbox-multiple-blank-outline.svg";
import CodeJsonIcon from "@mdi/svg/svg/code-json.svg";
import CogIcon from "@mdi/svg/svg/cog.svg";
import DragIcon from "@mdi/svg/svg/drag.svg";
import FullscreenIcon from "@mdi/svg/svg/fullscreen.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import cx from "classnames";
import * as React from "react"; // eslint-disable-line import/no-duplicates
import { useContext, useState, useCallback, useMemo } from "react"; // eslint-disable-line import/no-duplicates
import { MosaicContext, MosaicWindowContext } from "react-mosaic-component";

import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { bindActionCreators } from "redux";

import HelpButton from "./HelpButton";
import styles from "./index.module.scss";
import MosaicDragHandle from "./MosaicDragHandle";
import {
  savePanelConfigs,
  changePanelLayout,
  closePanel,
  splitPanel,
  swapPanel,
} from "@foxglove-studio/app/actions/panels";
import ChildToggle from "@foxglove-studio/app/components/ChildToggle";
import Dimensions from "@foxglove-studio/app/components/Dimensions";
import Dropdown from "@foxglove-studio/app/components/Dropdown";
import Icon from "@foxglove-studio/app/components/Icon";
import { Item, SubMenu } from "@foxglove-studio/app/components/Menu";
import PanelContext from "@foxglove-studio/app/components/PanelContext";
import { getPanelTypeFromMosaic } from "@foxglove-studio/app/components/PanelToolbar/utils";
import renderToBody from "@foxglove-studio/app/components/renderToBody";
import ShareJsonModal from "@foxglove-studio/app/components/ShareJsonModal";
// @ts-expect-error flow imports have any type
import PanelList, { PanelSelection } from "@foxglove-studio/app/panels/PanelList";
import frameless from "@foxglove-studio/app/util/frameless";
import { TAB_PANEL_TYPE } from "@foxglove-studio/app/util/globalConstants";
import logEvent, { getEventNames, getEventTags } from "@foxglove-studio/app/util/logEvent";
import { State } from "@foxglove-studio/app/reducers";

type Props = {
  children?: React.ReactNode;
  floating?: boolean;
  helpContent?: React.ReactNode;
  menuContent?: React.ReactNode;
  showPanelName?: boolean;
  additionalIcons?: React.ReactNode;
  hideToolbars?: boolean;
  showHiddenControlsOnHover?: boolean;
  isUnknownPanel?: boolean;
};

// separated into a sub-component so it can always skip re-rendering
// it never changes after it initially mounts
function StandardMenuItems({ tabId, isUnknownPanel }: { tabId?: string; isUnknownPanel: boolean }) {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const savedProps = useSelector((state: State) => state.persistedState.panels.savedProps);
  const dispatch = useDispatch();
  const actions = useMemo(
    () =>
      bindActionCreators(
        { savePanelConfigs, changePanelLayout, closePanel, splitPanel, swapPanel },
        dispatch,
      ),
    [dispatch],
  );

  const getPanelType = useCallback(
    () => getPanelTypeFromMosaic(mosaicWindowActions, mosaicActions),
    [mosaicActions, mosaicWindowActions],
  );

  const close = useCallback(() => {
    logEvent({
      name: getEventNames().PANEL_REMOVE,
      tags: { [getEventTags().PANEL_TYPE]: getPanelType() },
    });
    actions.closePanel({
      tabId,
      root: mosaicActions.getRoot() as any,
      path: mosaicWindowActions.getPath(),
    });
  }, [actions, getPanelType, mosaicActions, mosaicWindowActions, tabId]);

  const split = useCallback(
    (store, id: string | null | undefined, direction: "row" | "column") => {
      const type = getPanelType();
      if (!id || !type) {
        throw new Error("Trying to split unknown panel!");
      }
      logEvent({
        name: getEventNames().PANEL_SPLIT,
        tags: { [getEventTags().PANEL_TYPE]: getPanelType() },
      });

      const config = savedProps[id];
      actions.splitPanel({
        id,
        tabId,
        direction,
        root: mosaicActions.getRoot() as any,
        path: mosaicWindowActions.getPath(),
        config,
      });
    },
    [actions, getPanelType, mosaicActions, mosaicWindowActions, savedProps, tabId],
  );

  const swap = useCallback(
    (id: string | null | undefined) => ({ type, config, relatedConfigs }: PanelSelection) => {
      actions.swapPanel({
        tabId,
        originalId: id as any,
        type,
        root: mosaicActions.getRoot() as any,
        path: mosaicWindowActions.getPath(),
        config,
        relatedConfigs,
      });
      logEvent({ name: getEventNames().PANEL_SWAP, tags: { [getEventTags().PANEL_TYPE]: type } });
    },
    [actions, mosaicActions, mosaicWindowActions, tabId],
  );

  const onImportClick = useCallback(
    (store, id) => {
      if (!id) {
        return;
      }
      const panelConfigById = store.getState().persistedState.panels.savedProps;
      const modal = renderToBody(
        <ShareJsonModal
          onRequestClose={() => modal.remove()}
          value={panelConfigById[id] || {}}
          onChange={(config) =>
            actions.savePanelConfigs({ configs: [{ id, config, override: true }] })
          }
          noun="panel configuration"
        />,
      );
    },
    [actions],
  );

  const type = getPanelType();
  if (!type) {
    return null;
  }

  return (
    <ReactReduxContext.Consumer>
      {({ store }) => (
        <PanelContext.Consumer>
          {(panelContext) => (
            <>
              <SubMenu
                text="Change panel"
                icon={<CheckboxMultipleBlankOutlineIcon />}
                dataTest="panel-settings-change"
              >
                <PanelList
                  selectedPanelTitle={panelContext?.title}
                  onPanelSelect={swap(panelContext?.id)}
                />
              </SubMenu>
              {!isUnknownPanel && (
                <>
                  <Item
                    icon={<FullscreenIcon />}
                    onClick={panelContext?.enterFullscreen}
                    dataTest="panel-settings-fullscreen"
                    tooltip="(shortcut: ` or ~)"
                  >
                    Fullscreen
                  </Item>
                  <Item
                    icon={<ArrowSplitHorizontalIcon />}
                    onClick={() => split(store, panelContext?.id, "column")}
                    dataTest="panel-settings-hsplit"
                    tooltip="(shortcut: ` or ~)"
                  >
                    Split horizontal
                  </Item>
                  <Item
                    icon={<ArrowSplitVerticalIcon />}
                    onClick={() => split(store, panelContext?.id, "row")}
                    dataTest="panel-settings-vsplit"
                    tooltip="(shortcut: ` or ~)"
                  >
                    Split vertical
                  </Item>
                </>
              )}
              <Item
                icon={<TrashCanOutlineIcon />}
                onClick={close}
                dataTest="panel-settings-remove"
                tooltip="(shortcut: ` or ~)"
              >
                Remove panel
              </Item>
              {!isUnknownPanel && (
                <Item
                  icon={<CodeJsonIcon />}
                  onClick={() => onImportClick(store, panelContext?.id)}
                  disabled={type === TAB_PANEL_TYPE}
                  dataTest="panel-settings-config"
                >
                  Import/export panel settings
                </Item>
              )}
            </>
          )}
        </PanelContext.Consumer>
      )}
    </ReactReduxContext.Consumer>
  );
}

type PanelToolbarControlsProps = Props & {
  isRendered: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isUnknownPanel: boolean;
};

// Keep controls, which don't change often, in a pure component in order to avoid re-rendering the
// whole PanelToolbar when only children change.
const PanelToolbarControls = React.memo(function PanelToolbarControls(
  props: PanelToolbarControlsProps,
) {
  const panelData = useContext(PanelContext);
  const {
    floating,
    helpContent,
    menuContent,
    showPanelName,
    additionalIcons,
    showHiddenControlsOnHover,
  } = props;
  const { isRendered, onDragStart, onDragEnd, isUnknownPanel } = props;

  return (
    <div
      className={styles.iconContainer}
      style={showHiddenControlsOnHover && !isRendered ? { visibility: "hidden" } : {}}
    >
      {showPanelName && panelData && <div className={styles.panelName}>{panelData.title}</div>}
      {additionalIcons}
      {helpContent && <HelpButton>{helpContent}</HelpButton>}
      <Dropdown
        flatEdges={!floating}
        toggleComponent={
          <Icon fade tooltip="Panel settings" dataTest="panel-settings">
            <CogIcon className={styles.icon} />
          </Icon>
        }
      >
        <StandardMenuItems tabId={panelData?.tabId} isUnknownPanel={isUnknownPanel} />
        {menuContent && <hr />}
        {menuContent}
      </Dropdown>
      {!isUnknownPanel && (
        <MosaicDragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} tabId={panelData?.tabId}>
          {/* Can only nest native nodes into <MosaicDragHandle>, so wrapping in a <span> */}
          <span>
            <Icon fade tooltip="Move panel (shortcut: ` or ~)">
              <DragIcon className={styles.dragIcon} />
            </Icon>
          </span>
        </MosaicDragHandle>
      )}
    </div>
  );
});

// Panel toolbar should be added to any panel that's part of the
// react-mosaic layout.  It adds a drag handle, remove/replace controls
// and has a place to add custom controls via it's children property
export default React.memo<Props>(function PanelToolbar(props: Props) {
  const {
    children,
    floating,
    helpContent,
    menuContent,
    additionalIcons,
    hideToolbars,
    showHiddenControlsOnHover,
    isUnknownPanel,
  } = props;
  const { isHovered } = useContext(PanelContext) || {};
  const [isDragging, setIsDragging] = useState(false);
  const onDragStart = useCallback(() => setIsDragging(true), []);
  const onDragEnd = useCallback(() => setIsDragging(false), []);

  if (frameless() || hideToolbars) {
    return null;
  }

  return (
    <Dimensions>
      {({ width }) => (
        <ChildToggle.ContainsOpen>
          {(containsOpen) => {
            const isRendered = isHovered || containsOpen || isDragging || !!isUnknownPanel;
            return (
              <div
                className={cx(styles.panelToolbarContainer, {
                  [styles.floating]: floating,
                  [styles.floatingShow]: floating && isRendered,
                  [styles.containsOpen]: containsOpen,
                  [styles.hasChildren]: !!children,
                })}
              >
                {(isRendered || !floating) && children}
                {(isRendered || showHiddenControlsOnHover) && (
                  <PanelToolbarControls
                    isRendered={isRendered}
                    showHiddenControlsOnHover={showHiddenControlsOnHover}
                    floating={floating}
                    helpContent={helpContent}
                    menuContent={menuContent}
                    showPanelName={width > 360}
                    additionalIcons={additionalIcons}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isUnknownPanel={!!isUnknownPanel}
                  />
                )}
              </div>
            );
          }}
        </ChildToggle.ContainsOpen>
      )}
    </Dimensions>
  );
});
