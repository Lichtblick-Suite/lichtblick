// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

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

import * as _ from "lodash-es";

import { NormalizedLogMessage } from "@lichtblick/suite-base/panels/Log/types";
import { formatTime } from "@lichtblick/suite-base/util/formatTime";

import LevelToString from "./LevelToString";

const formattedMessage = (item: NormalizedLogMessage): string => {
  return `[${LevelToString(item.level)}] [${formatTime(item.stamp)}] ${!_.isEmpty(item.name) ? `[${item.name}]` : ""} ${item.message}`;
};

export default function FormatMessages(items: NormalizedLogMessage[]): string[] {
  const messages = items.map((item) => formattedMessage(item));
  return messages;
}