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

import { ParameterValue } from "@lichtblick/suite";
import CopyButton from "@lichtblick/suite-base/components/CopyButton";
import EmptyState from "@lichtblick/suite-base/components/EmptyState";
import JsonInput from "@lichtblick/suite-base/components/JsonInput";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import { PlayerCapabilities } from "@lichtblick/suite-base/players/types";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import * as _ from "lodash-es";
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "tss-react/mui";
import { useDebouncedCallback } from "use-debounce";

// The minimum amount of time to wait between showing the parameter update animation again
const ANIMATION_RESET_DELAY_MS = 3000;

function isActiveElementEditable(): boolean {
  const activeEl = document.activeElement;
  return (
    activeEl != undefined &&
    ((activeEl as HTMLElement).isContentEditable ||
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA")
  );
}

// Keep a single empty map so selector return value is reference-equal
const EMPTY_PARAMETERS = new Map<string, ParameterValue>();

function selectCapabilities(ctx: MessagePipelineContext) {
  return ctx.playerState.capabilities;
}
function selectSetParameter(ctx: MessagePipelineContext) {
  return ctx.setParameter;
}
function selectParameters(ctx: MessagePipelineContext) {
  return ctx.playerState.activeData?.parameters ?? EMPTY_PARAMETERS;
}

const useStyles = makeStyles<void, "copyIcon">()((_theme, _params, classes) => ({
  tableRow: {
    [`&:hover .${classes.copyIcon}`]: {
      visibility: "visible",
    },
  },
  copyIcon: {
    visibility: "hidden",

    "&:hover": {
      backgroundColor: "transparent",
    },
  },
}));

/**
 * Converts a parameter value into a value that can be edited in the JsonInput. Wraps
 * any value JsonInput can't handle in JSON.stringify.
 */
function editableValue(
  value: unknown,
): string | number | boolean | unknown[] | Uint8Array | object {
  if (value instanceof Uint8Array) {
    return Array.from(value);
  } else if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    _.isObject(value)
  ) {
    return value;
  } else {
    return JSON.stringify(value) ?? "";
  }
}

/**
 * Converts a parameter value into a string we can display value or use as a title.
 */
function displayableValue(value: unknown): string {
  if (value == undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  } else if (value instanceof Uint8Array) {
    return JSON.stringify(Array.from(value)) ?? "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  } else {
    return JSON.stringify(value) ?? "";
  }
}

function SubmittableJsonInput(props: {
  value: unknown;
  onSubmit: (newVal: unknown) => void;
}): ReactElement {
  const [value, setValue] = useState<unknown>(editableValue(props.value));

  return (
    <Stack direction="row">
      <JsonInput
        value={value}
        onChange={(newVal) => {
          setValue(newVal);
        }}
      />
      {!_.isEqual(editableValue(value), editableValue(props.value)) && [
        <Tooltip key="submit" title="Submit change">
          <IconButton
            onClick={() => {
              if (props.value instanceof Uint8Array) {
                props.onSubmit(new Uint8Array(value as number[]));
              } else {
                props.onSubmit(value);
              }
            }}
          >
            <CheckIcon />
          </IconButton>
        </Tooltip>,
        <Tooltip key="reset" title="Reset">
          <IconButton
            key="reset"
            onClick={() => {
              setValue(editableValue(props.value));
            }}
          >
            <ClearIcon />
          </IconButton>
        </Tooltip>,
      ]}
    </Stack>
  );
}

function Parameters(): ReactElement {
  const { classes } = useStyles();

  const capabilities = useMessagePipeline(selectCapabilities);
  const setParameterUnbounced = useMessagePipeline(selectSetParameter);
  const parameters = useMessagePipeline(selectParameters);

  const setParameter = useDebouncedCallback(
    useCallback(
      (name: string, value: ParameterValue) => {
        setParameterUnbounced(name, value);
      },
      [setParameterUnbounced],
    ),
    500,
  );

  const [changedParameters, setChangedParameters] = useState<string[]>([]);

  const canGetParams = capabilities.includes(PlayerCapabilities.getParameters);
  const canSetParams = capabilities.includes(PlayerCapabilities.setParameters);

  const parameterNames = useMemo(() => Array.from(parameters.keys()), [parameters]);

  // Don't run the animation when the Table first renders
  const skipAnimation = useRef<boolean>(true);
  const previousParametersRef = useRef<ReadonlyMap<string, unknown> | undefined>(parameters);

  useEffect(() => {
    const timeoutId = setTimeout(() => (skipAnimation.current = false), ANIMATION_RESET_DELAY_MS);
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (skipAnimation.current || isActiveElementEditable()) {
      previousParametersRef.current = parameters;
      return;
    }
    const newChangedParameters = _.union(
      Array.from(parameters.keys()),
      Array.from(previousParametersRef.current?.keys() ?? []),
    ).filter((name) => {
      const previousValue = previousParametersRef.current?.get(name);
      return !_.isEqual(previousValue, parameters.get(name));
    });

    setChangedParameters(newChangedParameters);
    previousParametersRef.current = parameters;
    const timerId = setTimeout(() => {
      setChangedParameters([]);
    }, ANIMATION_RESET_DELAY_MS);
    return () => {
      clearTimeout(timerId);
    };
  }, [parameters, skipAnimation]);

  if (!canGetParams) {
    return (
      <Stack fullHeight>
        <PanelToolbar />
        <EmptyState>Connect to a ROS source to view parameters</EmptyState>
      </Stack>
    );
  }

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <TableContainer style={{ flex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parameter</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>&nbsp;</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parameterNames.map((name) => {
              const displayValue = displayableValue(parameters.get(name));

              return (
                <TableRow
                  hover
                  className={classes.tableRow}
                  key={`parameter-${name}-${displayValue}`}
                  selected={!skipAnimation.current && changedParameters.includes(name)}
                >
                  <TableCell variant="head">
                    <Typography noWrap title={name} variant="inherit">
                      {name}
                    </Typography>
                  </TableCell>

                  {canSetParams ? (
                    <TableCell padding="none">
                      <SubmittableJsonInput
                        value={parameters.get(name)}
                        onSubmit={(newVal) => {
                          setParameter(name, newVal as ParameterValue);
                        }}
                      />
                    </TableCell>
                  ) : (
                    <TableCell>
                      <Typography
                        noWrap
                        title={displayValue}
                        variant="inherit"
                        color="text.secondary"
                      >
                        {displayValue}
                      </Typography>
                    </TableCell>
                  )}

                  <TableCell padding="none" align="center">
                    <CopyButton
                      className={classes.copyIcon}
                      edge="end"
                      size="small"
                      iconSize="small"
                      getText={() => `${name}: ${displayValue}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

Parameters.panelType = "Parameters";
Parameters.defaultConfig = {
  title: "Parameters",
};

export default Panel(Parameters);
