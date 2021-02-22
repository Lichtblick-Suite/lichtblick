//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import React, { useCallback, useMemo, useState, forwardRef, ElementRef } from "react";
import {
  MosaicWithoutDragDropContext,
  MosaicWindow,
  MosaicDumbWindow,
} from "react-mosaic-component";
import { useSelector, useDispatch } from "react-redux";
import "react-mosaic-component/react-mosaic-component.css";
import { bindActionCreators } from "redux";

import ErrorBoundary from "./ErrorBoundary";
import "./PanelLayout.scss";
import { setMosaicId } from "@foxglove-studio/app/actions/mosaic";
import {
  changePanelLayout,
  savePanelConfigs,
  SAVE_PANEL_CONFIGS,
} from "@foxglove-studio/app/actions/panels";
import { useExperimentalFeature } from "@foxglove-studio/app/components/ExperimentalFeatures";
import Flex from "@foxglove-studio/app/components/Flex";
import Icon from "@foxglove-studio/app/components/Icon";
import PanelToolbar from "@foxglove-studio/app/components/PanelToolbar";
import SpinningLoadingIcon from "@foxglove-studio/app/components/SpinningLoadingIcon";
import { getGlobalHooks } from "@foxglove-studio/app/loadWebviz";
import PanelList from "@foxglove-studio/app/panels/PanelList";
import { EmptyDropTarget } from "@foxglove-studio/app/panels/Tab/EmptyDropTarget";
import { State, Dispatcher } from "@foxglove-studio/app/reducers";
import { MosaicNode, SaveConfigsPayload } from "@foxglove-studio/app/types/panels";
import { getPanelIdForType, getPanelTypeFromId } from "@foxglove-studio/app/util/layout";
import { colors } from "@foxglove-studio/app/util/sharedStyleConstants";

type Props = {
  layout: MosaicNode | null | undefined;
  onChange: (panels: any) => void;
  setMosaicId: (mosaicId: string) => void;
  savePanelConfigs: (arg0: SaveConfigsPayload) => Dispatcher<SAVE_PANEL_CONFIGS>;
  importHooks: boolean;
  forwardedRef?: ElementRef<any>;
  mosaicId?: string;
  tabId?: string;

  /*
   * React mosaic adds a DropTarget wrapper around the mosaic root; remove for
   * Tab panels so that users can correctly drag panels in from the outer
   * layout.
   */
  removeRootDropTarget?: boolean;
};

// we subclass the mosaic layout without dragdropcontext
// dragdropcontext is initialized in the App container
// so components outside the mosaic component can participate
class MosaicRoot extends MosaicWithoutDragDropContext {
  componentDidMount() {
    // set the mosaic id in redux so elements outside the container
    // can use the id to register their drag intents with mosaic drop targets
    (this.props as any).setMosaicId(this.state.mosaicId);
  }
}

export function UnconnectedPanelLayout(props: Props) {
  const {
    importHooks,
    layout,
    onChange,
    savePanelConfigs: saveConfigs,
    tabId,
    removeRootDropTarget,
    mosaicId,
  } = props;
  const [hooksImported, setHooksImported] = useState(getGlobalHooks().areHooksImported());

  if (importHooks && !hooksImported) {
    const globalHooks = getGlobalHooks();
    globalHooks
      .importHooksAsync()
      .then(() => {
        setHooksImported({ hooksImported: true });
      })
      .catch((reason) => {
        console.error(`Import failed ${reason}`);
      });
  }

  const createTile = useCallback(
    (config: any) => {
      const defaultPanelType = "RosOut";
      const type = config ? config.type || defaultPanelType : defaultPanelType;
      const id = getPanelIdForType(type);
      if (config.panelConfig) {
        saveConfigs({ configs: [{ id, config: config.panelConfig }] });
      }
      return id;
    },
    [saveConfigs],
  );

  const renderTile = useCallback(
    (id: string, path: any) => {
      // `id` is usually a string. But when `layout` is empty, `id` will be an empty object, in which case we don't need to render Tile
      if (!id || typeof id !== "string") {
        return;
      }
      const type = getPanelTypeFromId(id);
      const MosaicWindowComponent: any = type === "Tab" ? MosaicDumbWindow : MosaicWindow;

      return (
        <MosaicWindowComponent
          key={path}
          path={path}
          createNode={createTile}
          renderPreview={() => null}
          tabId={tabId}
        >
          {(() => {
            if (!hooksImported) {
              return null;
            }
            // If we haven't found a panel of the given type, render the panel selector
            const PanelComponent = PanelList.getComponentForType(type);
            if (!PanelComponent) {
              return (
                // @ts-ignore typings say title is required property?
                <MosaicWindow
                  path={path}
                  createNode={createTile}
                  renderPreview={() => {
                    return <></>;
                  }}
                >
                  <Flex col center>
                    <PanelToolbar floating isUnknownPanel />
                    Unknown panel type: {type}.
                  </Flex>
                </MosaicWindow>
              );
            }
            return <PanelComponent childId={id} tabId={tabId} />;
          })()}
          <div
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              position: "absolute",
              background: colors.DARK2,
              opacity: hooksImported ? 0 : 1,
              pointerEvents: "none",
              zIndex: 1,
              transition: `all ${0.35}s ease-out ${Math.random() + 0.25}s`,
            }}
          >
            <Flex center style={{ width: "100%", height: "100%" }}>
              <Icon large>
                <SpinningLoadingIcon />
              </Icon>
            </Flex>
          </div>
        </MosaicWindowComponent>
      );
    },
    [createTile, hooksImported, tabId],
  );
  const isDemoMode = useExperimentalFeature("demoMode");
  const bodyToRender = useMemo(
    () =>
      layout ? (
        <MosaicRoot
          renderTile={renderTile as any}
          className={isDemoMode ? "borderless" : "none"}
          resize={{ minimumPaneSizePercentage: 2 }}
          value={layout}
          onChange={onChange}
          // @ts-expect-error setMosaicId property does not exist?
          setMosaicId={props.setMosaicId}
          mosaicId={mosaicId}
          removeRootDropTarget={removeRootDropTarget}
        />
      ) : (
          <EmptyDropTarget tabId={tabId} mosaicId={mosaicId} />
        ),
    [
      isDemoMode,
      layout,
      mosaicId,
      onChange,
      props.setMosaicId,
      removeRootDropTarget,
      renderTile,
      tabId,
    ],
  );

  return <ErrorBoundary ref={props.forwardedRef as any}>{bodyToRender}</ErrorBoundary>;
}

const ConnectedPanelLayout = ({ importHooks = true }: { importHooks?: boolean }, ref: any) => {
  const layout = useSelector((state: State) => state.persistedState.panels.layout);
  const dispatch = useDispatch();
  const actions = React.useMemo(
    () => bindActionCreators({ changePanelLayout, savePanelConfigs, setMosaicId }, dispatch),
    [dispatch],
  );
  const onChange = useCallback(
    (newLayout: MosaicNode) => {
      actions.changePanelLayout({ layout: newLayout });
    },
    [actions],
  );
  return (
    <UnconnectedPanelLayout
      forwardedRef={ref}
      importHooks={importHooks}
      layout={layout}
      onChange={onChange}
      savePanelConfigs={actions.savePanelConfigs}
      setMosaicId={actions.setMosaicId}
    />
  );
};
export default forwardRef<{ importHooks?: boolean }, any>(function PanelLayout(props, ref) {
  return ConnectedPanelLayout(props, ref);
});
