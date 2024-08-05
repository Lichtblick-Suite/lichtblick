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

import { TimeDisplayMethod } from "@lichtblick/suite-base/types/panels";
import momentDurationFormatSetup from "moment-duration-format";
import moment from "moment-timezone";

import { Time, toDate, fromDate } from "@foxglove/rostime";

import parseFuzzyRosTime from "./parseFuzzyRosTime";

// All time functions that require `moment` should live in this file.

// @ts-expect-error suppress Argument of type 'typeof moment' is not assignable to parameter of type 'typeof import ...
// There is some miss-match between the moment we import and the one the type declarations expect
momentDurationFormatSetup(moment);

export function format(stamp: Time, timezone?: string): string {
  return `${formatDate(stamp, timezone)} ${formatTime(stamp, timezone)}`;
}

export function formatDate(stamp: Time, timezone?: string): string {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), timezone ?? moment.tz.guess()).format("YYYY-MM-DD");
}

export function formatTime(stamp: Time, timezone?: string): string {
  if (stamp.sec < 0 || stamp.nsec < 0) {
    console.error("Times are not allowed to be negative");
    return "(invalid negative time)";
  }
  return moment.tz(toDate(stamp), timezone ?? moment.tz.guess()).format("h:mm:ss.SSS A z");
}

export function formatDuration(stamp: Time): string {
  return moment
    .duration(Math.round(stamp.sec * 1000 + stamp.nsec / 1e6))
    .format("h:mm:ss.SSS", { trim: false });
}

export function parseTimeStr(str: string, timezone?: string): Time | undefined {
  const newMomentTimeObj =
    timezone != undefined
      ? moment.tz(str, "YYYY-MM-DD h:mm:ss.SSS A z", timezone)
      : moment(str, "YYYY-MM-DD h:mm:ss.SSS A z");
  const date = newMomentTimeObj.toDate();
  const result = newMomentTimeObj.isValid() ? fromDate(date) : undefined;

  if (!result || result.sec <= 0 || result.nsec < 0) {
    return undefined;
  }
  return result;
}

const todDateTimeRegex = /^\d+-\d+-\d+\s+\d+:\d+:\d+.\d+\s[PpAa][Mm]\s[A-Za-z$]+/;
export const getValidatedTimeAndMethodFromString = ({
  text,
  timezone,
}: {
  text?: string;
  timezone?: string;
}): { time?: Time; method: TimeDisplayMethod } | undefined => {
  if (text == undefined || text === "") {
    return;
  }
  const isInvalidRawTime = isNaN(+text);
  const isInvalidTodTime = !(todDateTimeRegex.test(text) && parseTimeStr(text, timezone));

  if (isInvalidRawTime && isInvalidTodTime) {
    return;
  }

  return {
    time: !isInvalidRawTime ? parseFuzzyRosTime(text) : parseTimeStr(text, timezone),
    method: isInvalidRawTime ? "TOD" : "SEC",
  };
};
