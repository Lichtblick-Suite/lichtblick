// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Immutable } from "@lichtblick/suite";
import { useDataSourceInfo } from "@lichtblick/suite-base/PanelAPI";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import useCallbackWithToast from "@lichtblick/suite-base/hooks/useCallbackWithToast";
import usePublisher from "@lichtblick/suite-base/hooks/usePublisher";
import { PlayerCapabilities } from "@lichtblick/suite-base/players/types";
import { useDefaultPanelTitle } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import { Button, inputBaseClasses, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { makeStyles } from "tss-react/mui";
import { useDebounce } from "use-debounce";

import { MessageDefinition } from "@foxglove/message-definition";
import CommonRosTypes from "@foxglove/rosmsg-msgs-common";

import { defaultConfig, usePublishPanelSettings } from "./settings";
import { PublishConfig } from "./types";

type Props = {
  config: PublishConfig;
  saveConfig: SaveConfig<PublishConfig>;
};

const useStyles = makeStyles<{ buttonColor?: string }>()((theme, { buttonColor }) => {
  const augmentedButtonColor = buttonColor
    ? theme.palette.augmentColor({
        color: { main: buttonColor },
      })
    : undefined;

  return {
    button: {
      backgroundColor: augmentedButtonColor?.main,
      color: augmentedButtonColor?.contrastText,

      "&:hover": {
        backgroundColor: augmentedButtonColor?.dark,
      },
    },
    textarea: {
      height: "100%",

      [`.${inputBaseClasses.root}`]: {
        width: "100%",
        height: "100%",
        textAlign: "left",
        backgroundColor: theme.palette.background.paper,
        overflow: "hidden",
        padding: theme.spacing(1, 0.5),

        [`.${inputBaseClasses.input}`]: {
          height: "100% !important",
          lineHeight: 1.4,
          fontFamily: theme.typography.fontMonospace,
          overflow: "auto !important",
          resize: "none",
        },
      },
    },
  };
});

function parseInput(value: string): { error?: string; parsedObject?: unknown } {
  let parsedObject;
  let error = undefined;
  try {
    const parsedAny: unknown = JSON.parse(value);
    if (Array.isArray(parsedAny)) {
      error = "Message content must be an object, not an array";
    } else if (parsedAny == null /* eslint-disable-line no-restricted-syntax */) {
      error = "Message content must be an object, not null";
    } else if (typeof parsedAny !== "object") {
      error = `Message content must be an object, not ‘${typeof parsedAny}’`;
    } else {
      parsedObject = parsedAny;
    }
  } catch (e) {
    error = value.length !== 0 ? e.message : "Enter valid message content as JSON";
  }
  return { error, parsedObject };
}

function selectDataSourceProfile(ctx: MessagePipelineContext) {
  return ctx.playerState.profile;
}

function Publish(props: Props) {
  const { saveConfig, config } = props;
  const { topics, datatypes: dataSourceDatatypes, capabilities } = useDataSourceInfo();
  const { classes } = useStyles({ buttonColor: config.buttonColor });
  const [debouncedTopicName] = useDebounce(config.topicName ?? "", 500);
  const dataSourceProfile = useMessagePipeline(selectDataSourceProfile);

  const datatypes = useMemo(() => {
    // Add common ROS datatypes, depending on the data source profile.
    const commonTypes: Record<string, MessageDefinition> | undefined = {
      ros1: CommonRosTypes.ros1,
      ros2: CommonRosTypes.ros2galactic,
    }[dataSourceProfile ?? ""];

    if (commonTypes == undefined) {
      return dataSourceDatatypes;
    }

    // dataSourceDatatypes is added after commonTypes to take precedence (override) any commonTypes of the same name
    return new Map<string, Immutable<MessageDefinition>>([
      ...Object.entries(commonTypes),
      ...dataSourceDatatypes,
    ]);
  }, [dataSourceProfile, dataSourceDatatypes]);

  const publish = usePublisher({
    name: "Publish",
    topic: debouncedTopicName,
    schemaName: config.datatype,
    datatypes,
  });

  const { error, parsedObject } = useMemo(() => parseInput(config.value ?? ""), [config.value]);

  usePublishPanelSettings(config, saveConfig, topics, datatypes);

  const onPublishClicked = useCallbackWithToast(() => {
    if (config.topicName != undefined && parsedObject != undefined) {
      publish(parsedObject as Record<string, unknown>);
    } else {
      throw new Error(`called _publish() when input was invalid`);
    }
  }, [config.topicName, parsedObject, publish]);

  const [, setDefaultPanelTitle] = useDefaultPanelTitle();

  useEffect(() => {
    if (config.topicName != undefined && config.topicName.length > 0) {
      setDefaultPanelTitle(`Publish ${config.topicName}`);
    } else {
      setDefaultPanelTitle("Publish");
    }
  }, [config.topicName, setDefaultPanelTitle]);

  const canPublish = Boolean(
    capabilities.includes(PlayerCapabilities.advertise) &&
      config.value &&
      config.topicName &&
      config.datatype &&
      parsedObject != undefined,
  );

  const statusMessage = useMemo(() => {
    if (!capabilities.includes(PlayerCapabilities.advertise)) {
      return "Connect to a data source that supports publishing";
    }
    if (!config.topicName || !config.datatype) {
      return "Configure a topic and message schema in the panel settings";
    }
    return undefined;
  }, [capabilities, config.datatype, config.topicName]);

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack flex="auto" gap={1} padding={1.5} position="relative">
        {config.advancedView && (
          <Stack flexGrow="1">
            <TextField
              variant="outlined"
              className={classes.textarea}
              multiline
              size="small"
              placeholder="Enter message content as JSON"
              value={config.value}
              onChange={(event) => {
                saveConfig({ value: event.target.value });
              }}
              error={error != undefined}
            />
          </Stack>
        )}
        <Stack
          direction={config.advancedView ? "row" : "column-reverse"}
          justifyContent={config.advancedView ? "flex-end" : "center"}
          alignItems="center"
          overflow="hidden"
          flexGrow={0}
          gap={1.5}
        >
          {(error != undefined || statusMessage != undefined) && (
            <Typography variant="caption" noWrap color={error ? "error" : undefined}>
              {error ?? statusMessage}
            </Typography>
          )}
          <Tooltip
            placement={config.advancedView ? "left" : undefined}
            title={config.buttonTooltip}
          >
            <span>
              <Button
                className={classes.button}
                variant="contained"
                disabled={!canPublish}
                onClick={onPublishClicked}
              >
                {config.buttonText}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default Panel(
  Object.assign(React.memo(Publish), {
    panelType: "Publish",
    defaultConfig,
  }),
);
