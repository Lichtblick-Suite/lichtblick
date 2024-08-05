// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import Timestamp from "@lichtblick/suite-base/components/Timestamp";
import { useAppTimeFormat } from "@lichtblick/suite-base/hooks";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import { formatDuration } from "@lichtblick/suite-base/util/formatTime";
import { formatTimeRaw, isAbsoluteTime } from "@lichtblick/suite-base/util/time";
import { Skeleton, Typography } from "@mui/material";
import { MutableRefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { makeStyles } from "tss-react/mui";

import { subtract as subtractTimes, Time } from "@foxglove/rostime";

import { MultilineMiddleTruncate } from "./MultilineMiddleTruncate";

const useStyles = makeStyles()((theme) => ({
  overline: {
    opacity: 0.6,
  },
  numericValue: {
    fontFeatureSettings: `${theme.typography.fontFeatureSettings}, "zero"`,
  },
}));

const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;

function DataSourceInfoContent(props: {
  disableSource?: boolean;
  durationRef: MutableRefObject<ReactNull | HTMLDivElement>;
  endTimeRef: MutableRefObject<ReactNull | HTMLDivElement>;
  playerName?: string;
  playerPresence: PlayerPresence;
  startTime?: Time;
  isLiveConnection: boolean;
}): JSX.Element {
  const {
    disableSource = false,
    durationRef,
    endTimeRef,
    playerName,
    playerPresence,
    startTime,
  } = props;
  const { classes } = useStyles();
  const { t } = useTranslation("dataSourceInfo");

  const isLiveConnection = props.isLiveConnection;

  return (
    <Stack gap={1.5}>
      {!disableSource && (
        <Stack>
          <Typography className={classes.overline} display="block" variant="overline">
            {t("currentSource")}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Typography variant="inherit">
              <Skeleton animation="wave" width="40%" />
            </Typography>
          ) : playerPresence === PlayerPresence.RECONNECTING ? (
            <Typography variant="inherit">{t("waitingForConnection")}</Typography>
          ) : playerName ? (
            <Typography variant="inherit" component="span">
              <MultilineMiddleTruncate text={playerName} />
            </Typography>
          ) : (
            <Typography className={classes.numericValue} variant="inherit">
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {t("startTime")}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width="50%" />
        ) : startTime ? (
          <Timestamp horizontal time={startTime} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit">
            &mdash;
          </Typography>
        )}
      </Stack>

      {!isLiveConnection && (
        <Stack>
          <Typography className={classes.overline} variant="overline">
            {t("endTime")}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Skeleton animation="wave" width="50%" />
          ) : (
            <Typography className={classes.numericValue} variant="inherit" ref={endTimeRef}>
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {t("duration")}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width={100} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit" ref={durationRef}>
            &mdash;
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

const MemoDataSourceInfoContent = React.memo(DataSourceInfoContent);

const EmDash = "\u2014";

export function DataSourceInfoView({ disableSource }: { disableSource?: boolean }): JSX.Element {
  const startTime = useMessagePipeline(selectStartTime);
  const endTime = useMessagePipeline(selectEndTime);
  const playerName = useMessagePipeline(selectPlayerName);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const seek = useMessagePipeline(selectSeek);

  const durationRef = useRef<HTMLDivElement>(ReactNull);
  const endTimeRef = useRef<HTMLDivElement>(ReactNull);
  const { formatDate, formatTime } = useAppTimeFormat();

  // We bypass react and update the DOM elements directly for better performance here.
  useEffect(() => {
    if (durationRef.current) {
      const duration = endTime && startTime ? subtractTimes(endTime, startTime) : undefined;
      if (duration) {
        const durationStr = formatDuration(duration);
        durationRef.current.innerText = durationStr;
      } else {
        durationRef.current.innerText = EmDash;
      }
    }
    if (endTimeRef.current) {
      if (endTime) {
        const date = formatDate(endTime);
        endTimeRef.current.innerText = !isAbsoluteTime(endTime)
          ? `${formatTimeRaw(endTime)}`
          : `${date} ${formatTime(endTime)}`;
      } else {
        endTimeRef.current.innerHTML = EmDash;
      }
    }
  }, [endTime, formatTime, startTime, playerPresence, formatDate]);

  return (
    <MemoDataSourceInfoContent
      disableSource={disableSource}
      durationRef={durationRef}
      endTimeRef={endTimeRef}
      playerName={playerName}
      playerPresence={playerPresence}
      startTime={startTime}
      isLiveConnection={seek == undefined}
    />
  );
}
