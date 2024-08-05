// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time, MessageEvent } from "@lichtblick/suite";
import { Header } from "@lichtblick/suite-base/types/Messages";

import { Log as FoxgloveLog } from "@foxglove/schemas";

export type Config = {
  searchTerms: string[];
  minLogLevel: number;
  topicToRender?: string;
  nameFilter?: Record<string, { visible?: boolean }>;
};

export enum LogLevel {
  UNKNOWN = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export type Ros1RosgraphMsgs$Log = Readonly<{
  header: Header;
  level: number;
  name: string;
  msg: string;
  file: string;
  function: string;
  line: number;
  topics: readonly string[];
}>;

export type Ros2RosgraphMsgs$Log = Readonly<{
  stamp: Time;
  level: number;
  name: string;
  msg: string;
  file: string;
  function: string;
  line: number;
}>;

export type NormalizedLogMessage = {
  stamp: Time;
  level: LogLevel;
  message: string;
  name?: string;
  file?: string;
  line?: number;
};

export type LogMessageEvent =
  | MessageEvent<FoxgloveLog>
  | MessageEvent<Ros1RosgraphMsgs$Log>
  | MessageEvent<Ros2RosgraphMsgs$Log>;
