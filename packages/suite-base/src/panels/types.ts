// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { MessagePath } from "@lichtblick/message-path";
import { MessageEvent } from "@lichtblick/suite";

export type GaugeAndIndicatorState = {
  error: Error | undefined;
  latestMatchingQueriedData: unknown;
  latestMessage: MessageEvent | undefined;
  parsedPath: MessagePath | undefined;
  path: string;
  pathParseError: string | undefined;
};

export type GaugeAndIndicatorAction =
  | { type: "frame"; messages: readonly MessageEvent[] }
  | { type: "path"; path: string }
  | { type: "seek" };
