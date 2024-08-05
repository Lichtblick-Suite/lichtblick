// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Immutable, SettingsTreeAction } from "@lichtblick/suite";
import { useDataSourceInfo } from "@lichtblick/suite-base/PanelAPI";
import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import useGetItemStringWithTimezone from "@lichtblick/suite-base/components/JsonTree/useGetItemStringWithTimezone";
import {
  messagePathStructures,
  traverseStructure,
} from "@lichtblick/suite-base/components/MessagePathSyntax/messagePathsForDatatype";
import { MessagePathDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";
import Panel from "@lichtblick/suite-base/components/Panel";
import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import Stack from "@lichtblick/suite-base/components/Stack";
import { Toolbar } from "@lichtblick/suite-base/panels/RawMessages/Toolbar";
import getDiff, {
  DiffObject,
  diffLabels,
  diffLabelsByLabelText,
} from "@lichtblick/suite-base/panels/RawMessages/getDiff";
import { Topic } from "@lichtblick/suite-base/players/types";
import { usePanelSettingsTreeUpdate } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import { enumValuesByDatatypeAndField } from "@lichtblick/suite-base/util/enums";
import { useJsonTreeTheme } from "@lichtblick/suite-base/util/globalConstants";
import { Checkbox, FormControlLabel, Typography, useTheme } from "@mui/material";
import * as _ from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactHoverObserver from "react-hover-observer";
import Tree from "react-json-tree";
import { makeStyles } from "tss-react/mui";

import { parseMessagePath, MessagePathStructureItem, MessagePath } from "@foxglove/message-path";

import { DiffSpan } from "./DiffSpan";
import DiffStats from "./DiffStats";
import MaybeCollapsedValue from "./MaybeCollapsedValue";
import Metadata from "./Metadata";
import Value from "./Value";
import {
  ValueAction,
  getStructureItemForPath,
  getValueActionForValue,
} from "./getValueActionForValue";
import { Constants, NodeState, RawMessagesPanelConfig } from "./types";
import { DATA_ARRAY_PREVIEW_LIMIT, generateDeepKeyPaths, toggleExpansion } from "./utils";

type Props = {
  config: Immutable<RawMessagesPanelConfig>;
  saveConfig: SaveConfig<RawMessagesPanelConfig>;
};

const isSingleElemArray = (obj: unknown): obj is unknown[] => {
  if (!Array.isArray(obj)) {
    return false;
  }
  return obj.filter((a) => a != undefined).length === 1;
};

const dataWithoutWrappingArray = (data: unknown) => {
  return isSingleElemArray(data) && typeof data[0] === "object" ? data[0] : data;
};

const useStyles = makeStyles()((theme) => ({
  topic: {
    fontFamily: theme.typography.body1.fontFamily,
    fontFeatureSettings: `${theme.typography.fontFeatureSettings}, "zero"`,
  },
  hoverObserver: {
    display: "inline-flex",
    alignItems: "center",
  },
}));

function RawMessages(props: Props) {
  const {
    palette: { mode: themePreference },
  } = useTheme();
  const { classes } = useStyles();
  const jsonTreeTheme = useJsonTreeTheme();
  const { config, saveConfig } = props;
  const { openSiblingPanel } = usePanelContext();
  const { topicPath, diffMethod, diffTopicPath, diffEnabled, showFullMessageForDiff, fontSize } =
    config;
  const { topics, datatypes } = useDataSourceInfo();
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();
  const { setMessagePathDropConfig } = usePanelContext();

  useEffect(() => {
    setMessagePathDropConfig({
      getDropStatus(paths) {
        if (paths.length !== 1) {
          return { canDrop: false };
        }
        return { canDrop: true, effect: "replace" };
      },
      handleDrop(paths) {
        const path = paths[0];
        if (path) {
          saveConfig({ topicPath: path.path });
        }
      },
    });
  }, [setMessagePathDropConfig, saveConfig]);

  const defaultGetItemString = useGetItemStringWithTimezone();
  const getItemString = useMemo(
    () =>
      diffEnabled
        ? (_type: string, data: DiffObject, itemType: React.ReactNode) => (
            <DiffStats data={data} itemType={itemType} />
          )
        : defaultGetItemString,
    [defaultGetItemString, diffEnabled],
  );

  const topicRosPath: MessagePath | undefined = useMemo(
    () => parseMessagePath(topicPath),
    [topicPath],
  );
  const topic: Topic | undefined = useMemo(
    () => topicRosPath && topics.find(({ name }) => name === topicRosPath.topicName),
    [topicRosPath, topics],
  );

  const structures = useMemo(() => messagePathStructures(datatypes), [datatypes]);

  const rootStructureItem: MessagePathStructureItem | undefined = useMemo(() => {
    if (!topic || !topicRosPath || topic.schemaName == undefined) {
      return;
    }
    return traverseStructure(structures[topic.schemaName], topicRosPath.messagePath).structureItem;
  }, [structures, topic, topicRosPath]);

  const [expansion, setExpansion] = useState(config.expansion);

  // Pass an empty path to useMessageDataItem if our path doesn't resolve to a valid topic to avoid
  // spamming the message pipeline with useless subscription requests.
  const matchedMessages = useMessageDataItem(topic ? topicPath : "", { historySize: 2 });
  const diffMessages = useMessageDataItem(diffEnabled ? diffTopicPath : "");

  const diffTopicObj = diffMessages[0];
  const currTickObj = matchedMessages[matchedMessages.length - 1];
  const prevTickObj = matchedMessages[matchedMessages.length - 2];

  const inTimetickDiffMode = diffEnabled && diffMethod === Constants.PREV_MSG_METHOD;
  const baseItem = inTimetickDiffMode ? prevTickObj : currTickObj;
  const diffItem = inTimetickDiffMode ? currTickObj : diffTopicObj;

  const nodes = useMemo(() => {
    if (baseItem) {
      const data = dataWithoutWrappingArray(baseItem.queriedData.map(({ value }) => value));
      return generateDeepKeyPaths(data, 5);
    } else {
      return new Set<string>();
    }
  }, [baseItem]);

  const canExpandAll = useMemo(() => {
    if (expansion === "none") {
      return true;
    }
    if (expansion === "all") {
      return false;
    }
    if (
      typeof expansion === "object" &&
      Object.values(expansion).some((v) => v === NodeState.Collapsed)
    ) {
      return true;
    } else {
      return false;
    }
  }, [expansion]);

  const onTopicPathChange = useCallback(
    (newTopicPath: string) => {
      setExpansion(undefined);
      saveConfig({ topicPath: newTopicPath });
    },
    [saveConfig],
  );

  const onDiffTopicPathChange = useCallback(
    (newDiffTopicPath: string) => {
      saveConfig({ diffTopicPath: newDiffTopicPath });
    },
    [saveConfig],
  );

  const onToggleDiff = useCallback(() => {
    saveConfig({ diffEnabled: !diffEnabled });
  }, [diffEnabled, saveConfig]);

  const onToggleExpandAll = useCallback(() => {
    setExpansion(canExpandAll ? "all" : "none");
  }, [canExpandAll]);

  const onLabelClick = useCallback(
    (keypath: (string | number)[]) => {
      setExpansion((old) => toggleExpansion(old ?? "all", nodes, keypath.join("~")));
    },
    [nodes],
  );

  useEffect(() => {
    saveConfig({ expansion });
  }, [expansion, saveConfig]);

  const getValueLabels = useCallback(
    ({
      constantName,
      label,
      itemValue,
      keyPath,
    }: {
      constantName: string | undefined;
      label: string;
      itemValue: unknown;
      keyPath: ReadonlyArray<number | string>;
    }): { arrLabel: string; itemLabel: string } => {
      let itemLabel = label;
      if (typeof itemValue === "bigint") {
        itemLabel = itemValue.toString();
      }
      // output preview for the first x items if the data is in binary format
      // sample output: Int8Array(331776) [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, ...]
      let arrLabel = "";
      if (ArrayBuffer.isView(itemValue)) {
        const array = itemValue as Uint8Array;
        const itemPart = array.slice(0, DATA_ARRAY_PREVIEW_LIMIT).join(", ");
        const length = array.length;
        arrLabel = `(${length}) [${itemPart}${length >= DATA_ARRAY_PREVIEW_LIMIT ? ", …" : ""}] `;
        itemLabel = itemValue.constructor.name;
      }
      if (constantName != undefined) {
        itemLabel = `${itemLabel} (${constantName})`;
      }

      // When we encounter a nsec field (nanosecond) that is a number, we ensure the label displays 9 digits.
      // This helps when visually scanning time values from `sec` and `nsec` fields.
      // A nanosecond label of 099999999 makes it easier to realize this is 0.09 seconds compared to
      // 99999999 which requires some counting to reamize this is also 0.09
      if (keyPath[0] === "nsec" && typeof itemValue === "number") {
        itemLabel = _.padStart(itemLabel, 9, "0");
      }

      return { arrLabel, itemLabel };
    },
    [],
  );

  const renderDiffLabel = useCallback(
    (label: string, itemValue: unknown) => {
      let constantName: string | undefined;
      const { arrLabel, itemLabel } = getValueLabels({
        constantName,
        label,
        itemValue,
        keyPath: [],
      });
      return (
        <Value
          arrLabel={arrLabel}
          basePath=""
          itemLabel={itemLabel}
          itemValue={itemValue}
          valueAction={undefined}
          onTopicPathChange={onTopicPathChange}
          openSiblingPanel={openSiblingPanel}
        />
      );
    },
    [getValueLabels, onTopicPathChange, openSiblingPanel],
  );

  const enumMapping = useMemo(() => enumValuesByDatatypeAndField(datatypes), [datatypes]);

  const valueRenderer = useCallback(
    (
      structureItem: MessagePathStructureItem | undefined,
      data: unknown[],
      queriedData: MessagePathDataItem[],
      label: string,
      itemValue: unknown,
      ...keyPath: (number | string)[]
    ) => (
      <ReactHoverObserver className={classes.hoverObserver}>
        {({ isHovering }: { isHovering: boolean }) => {
          const lastKeyPath = _.last(keyPath) as number;
          let valueAction: ValueAction | undefined;
          if (isHovering) {
            valueAction = getValueActionForValue(
              data[lastKeyPath],
              structureItem,
              keyPath.slice(0, -1).reverse(),
            );
          }

          let constantName: string | undefined;
          if (structureItem) {
            const childStructureItem = getStructureItemForPath(
              structureItem,
              keyPath.slice(0, -1).reverse(),
            );
            if (childStructureItem) {
              // if it's an array index (typeof number) then we want the nearest named array which will be typeof string

              const keyPathIndex = keyPath.findIndex((key) => typeof key === "string");
              const field = keyPath[keyPathIndex];
              if (typeof field === "string") {
                const datatype = childStructureItem.datatype;
                constantName = enumMapping[datatype]?.[field]?.[String(itemValue)];
              }
            }
          }
          const basePath = queriedData[lastKeyPath]?.path ?? "";
          const { arrLabel, itemLabel } = getValueLabels({
            constantName,
            label,
            itemValue,
            keyPath,
          });

          return (
            <Value
              arrLabel={arrLabel}
              basePath={basePath}
              itemLabel={itemLabel}
              itemValue={itemValue}
              valueAction={valueAction}
              onTopicPathChange={onTopicPathChange}
              openSiblingPanel={openSiblingPanel}
            />
          );
        }}
      </ReactHoverObserver>
    ),
    [classes.hoverObserver, enumMapping, getValueLabels, onTopicPathChange, openSiblingPanel],
  );

  const renderSingleTopicOrDiffOutput = useCallback(() => {
    const shouldExpandNode = (keypath: (string | number)[]) => {
      if (expansion === "all") {
        return true;
      }
      if (expansion === "none") {
        return false;
      }

      const joinedPath = keypath.join("~");
      if (expansion && expansion[joinedPath] === NodeState.Collapsed) {
        return false;
      }
      if (expansion && expansion[joinedPath] === NodeState.Expanded) {
        return true;
      }

      return true;
    };

    if (topicPath.length === 0) {
      return <EmptyState>No topic selected</EmptyState>;
    }
    if (diffEnabled && diffMethod === Constants.CUSTOM_METHOD && (!baseItem || !diffItem)) {
      return (
        <EmptyState>{`Waiting to diff next messages from "${topicPath}" and "${diffTopicPath}"`}</EmptyState>
      );
    }

    if (!baseItem) {
      return <EmptyState>Waiting for next message…</EmptyState>;
    }

    const data = dataWithoutWrappingArray(baseItem.queriedData.map(({ value }) => value));
    const hideWrappingArray =
      baseItem.queriedData.length === 1 && typeof baseItem.queriedData[0]?.value === "object";
    const shouldDisplaySingleVal =
      (data != undefined && typeof data !== "object") ||
      (isSingleElemArray(data) && data[0] != undefined && typeof data[0] !== "object");
    const singleVal = isSingleElemArray(data) ? data[0] : data;

    const diffData =
      diffItem && dataWithoutWrappingArray(diffItem.queriedData.map(({ value }) => value));

    const diff = diffEnabled
      ? getDiff({
          before: data,
          after: diffData,
          idLabel: undefined,
          showFullMessageForDiff,
        })
      : {};

    return (
      <Stack
        className={classes.topic}
        flex="auto"
        overflowX="hidden"
        paddingLeft={0.75}
        data-testid="panel-scroll-container"
      >
        <Metadata
          data={data}
          diffData={diffData}
          diff={diff}
          message={baseItem.messageEvent}
          {...(topic ? { datatype: topic.schemaName } : undefined)}
          {...(diffItem ? { diffMessage: diffItem.messageEvent } : undefined)}
        />
        {shouldDisplaySingleVal ? (
          <Typography
            variant="h1"
            fontSize={fontSize}
            whiteSpace="pre-wrap"
            style={{ wordWrap: "break-word" }}
          >
            <MaybeCollapsedValue itemLabel={String(singleVal)} />
          </Typography>
        ) : diffEnabled && _.isEqual({}, diff) ? (
          <EmptyState>No difference found</EmptyState>
        ) : (
          <>
            {diffEnabled && (
              <FormControlLabel
                disableTypography
                checked={showFullMessageForDiff}
                control={
                  <Checkbox
                    size="small"
                    defaultChecked
                    onChange={() => {
                      saveConfig({ showFullMessageForDiff: !showFullMessageForDiff });
                    }}
                  />
                }
                label="Show full msg"
              />
            )}
            <Tree
              labelRenderer={(raw) => (
                <>
                  <DiffSpan>{_.first(raw)}</DiffSpan>
                  {/* https://stackoverflow.com/questions/62319014/make-text-selection-treat-adjacent-elements-as-separate-words */}
                  <span style={{ fontSize: 0 }}>&nbsp;</span>
                </>
              )}
              shouldExpandNode={shouldExpandNode}
              onExpand={(_data, _level, keyPath) => {
                onLabelClick(keyPath);
              }}
              onCollapse={(_data, _level, keyPath) => {
                onLabelClick(keyPath);
              }}
              hideRoot
              invertTheme={false}
              getItemString={getItemString}
              valueRenderer={(valueAsString: string, value, ...keyPath) => {
                if (diffEnabled) {
                  return renderDiffLabel(valueAsString, value);
                }
                if (hideWrappingArray) {
                  // When the wrapping array is hidden, put it back here.
                  return valueRenderer(
                    rootStructureItem,
                    [data],
                    baseItem.queriedData,
                    valueAsString,
                    value,
                    ...keyPath,
                    0,
                  );
                }

                return valueRenderer(
                  rootStructureItem,
                  data as unknown[],
                  baseItem.queriedData,
                  valueAsString,
                  value,
                  ...keyPath,
                );
              }}
              postprocessValue={(rawVal: unknown) => {
                if (rawVal == undefined) {
                  return rawVal;
                }
                const idValue = (rawVal as Record<string, unknown>)[diffLabels.ID.labelText];
                const addedValue = (rawVal as Record<string, unknown>)[diffLabels.ADDED.labelText];
                const changedValue = (rawVal as Record<string, unknown>)[
                  diffLabels.CHANGED.labelText
                ];
                const deletedValue = (rawVal as Record<string, unknown>)[
                  diffLabels.DELETED.labelText
                ];
                if (
                  (addedValue != undefined ? 1 : 0) +
                    (changedValue != undefined ? 1 : 0) +
                    (deletedValue != undefined ? 1 : 0) ===
                    1 &&
                  idValue == undefined
                ) {
                  return addedValue ?? changedValue ?? deletedValue;
                }
                return rawVal;
              }}
              theme={{
                ...jsonTreeTheme,
                tree: { margin: 0 },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nestedNode: ({ style }, keyPath: any) => {
                  const baseStyle = {
                    ...style,
                    fontSize,
                    paddingTop: 2,
                    paddingBottom: 2,
                    marginTop: 2,
                    textDecoration: "inherit",
                  };
                  if (!diffEnabled) {
                    return { style: baseStyle };
                  }
                  let backgroundColor;
                  let textDecoration;
                  if (diffLabelsByLabelText[keyPath[0]]) {
                    backgroundColor =
                      themePreference === "dark"
                        ? // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[keyPath[0]].invertedBackgroundColor
                        : // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[keyPath[0]].backgroundColor;
                    textDecoration =
                      keyPath[0] === diffLabels.DELETED.labelText ? "line-through" : "none";
                  }
                  const nestedObj = _.get(diff, keyPath.slice().reverse(), {});
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  const nestedObjKey = Object.keys(nestedObj)[0];
                  if (nestedObjKey != undefined && diffLabelsByLabelText[nestedObjKey]) {
                    backgroundColor =
                      themePreference === "dark"
                        ? // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[nestedObjKey].invertedBackgroundColor
                        : // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[nestedObjKey].backgroundColor;
                    textDecoration =
                      nestedObjKey === diffLabels.DELETED.labelText ? "line-through" : "none";
                  }
                  return {
                    style: {
                      ...baseStyle,
                      backgroundColor,
                      textDecoration: textDecoration ?? "inherit",
                    },
                  };
                },
                nestedNodeLabel: ({ style }) => ({
                  style: { ...style, textDecoration: "inherit" },
                }),
                nestedNodeChildren: ({ style }) => ({
                  style: { ...style, textDecoration: "inherit" },
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: ({ style }, _nodeType, keyPath: any) => {
                  const baseStyle = {
                    ...style,
                    fontSize,
                    textDecoration: "inherit",
                  };
                  if (!diffEnabled) {
                    return { style: baseStyle };
                  }
                  let backgroundColor;
                  let textDecoration;
                  const nestedObj = _.get(diff, keyPath.slice().reverse(), {});
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  const nestedObjKey = Object.keys(nestedObj)[0];
                  if (nestedObjKey != undefined && diffLabelsByLabelText[nestedObjKey]) {
                    backgroundColor =
                      themePreference === "dark"
                        ? // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[nestedObjKey].invertedBackgroundColor
                        : // @ts-expect-error backgroundColor is not a property?
                          diffLabelsByLabelText[nestedObjKey].backgroundColor;
                    textDecoration =
                      nestedObjKey === diffLabels.DELETED.labelText ? "line-through" : "none";
                  }
                  return {
                    style: {
                      ...baseStyle,
                      backgroundColor,
                      textDecoration: textDecoration ?? "inherit",
                    },
                  };
                },
                label: { textDecoration: "inherit" },
              }}
              data={diffEnabled ? diff : data}
            />
          </>
        )}
      </Stack>
    );
  }, [
    baseItem,
    classes.topic,
    fontSize,
    diffEnabled,
    diffItem,
    diffMethod,
    diffTopicPath,
    expansion,
    getItemString,
    jsonTreeTheme,
    onLabelClick,
    renderDiffLabel,
    rootStructureItem,
    saveConfig,
    showFullMessageForDiff,
    themePreference,
    topic,
    topicPath,
    valueRenderer,
  ]);

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === "update") {
        if (action.payload.path[0] === "general") {
          if (action.payload.path[1] === "fontSize") {
            saveConfig({
              fontSize:
                action.payload.value != undefined ? (action.payload.value as number) : undefined,
            });
          }
        }
      }
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: {
        general: {
          label: "General",
          fields: {
            fontSize: {
              label: "Font size",
              input: "select",
              options: [
                { label: "auto", value: undefined },
                ...Constants.FONT_SIZE_OPTIONS.map((value) => ({
                  label: `${value} px`,
                  value,
                })),
              ],
              value: fontSize,
            },
          },
        },
      },
    });
  }, [actionHandler, fontSize, updatePanelSettingsTree]);

  return (
    <Stack flex="auto" overflow="hidden" position="relative">
      <Toolbar
        canExpandAll={canExpandAll}
        diffEnabled={diffEnabled}
        diffMethod={diffMethod}
        diffTopicPath={diffTopicPath}
        onDiffTopicPathChange={onDiffTopicPathChange}
        onToggleDiff={onToggleDiff}
        onToggleExpandAll={onToggleExpandAll}
        onTopicPathChange={onTopicPathChange}
        saveConfig={saveConfig}
        topicPath={topicPath}
      />
      {renderSingleTopicOrDiffOutput()}
    </Stack>
  );
}

const defaultConfig: RawMessagesPanelConfig = {
  diffEnabled: false,
  diffMethod: Constants.CUSTOM_METHOD,
  diffTopicPath: "",
  showFullMessageForDiff: false,
  topicPath: "",
  fontSize: undefined,
};

export default Panel(
  Object.assign(RawMessages, {
    panelType: "RawMessages",
    defaultConfig,
  }),
);
