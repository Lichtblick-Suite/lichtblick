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

import { Time } from "@lichtblick/suite";
import FormatMessages from "@lichtblick/suite-base/panels/Log/FormatMessages";

enum LogLevel {
  UNKNOWN = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

type NormalizedLogMessage = {
  stamp: Time;
  level: LogLevel;
  message: string;
  name?: string;
  file?: string;
  line?: number;
};

describe("formatMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should format a log message correctly", () => {
    const timeStamp: Time = {
      sec: 1672531200,
      nsec: 0,
    };

    const item: NormalizedLogMessage = {
      level: 2,
      stamp: timeStamp,
      name: "TestLogger",
      message: "This is a test message",
    };

    const formatted = FormatMessages([item]);

    expect(formatted).toEqual(["[INFO] [12:00:00.000 AM WET] [TestLogger] This is a test message"]);
  });

  it("should format a log message without name attribute", () => {
    const timeStamp: Time = {
      sec: 1672531200,
      nsec: 0,
    };

    const item: NormalizedLogMessage = {
      level: 4,
      stamp: timeStamp,
      name: "",
      message: "This is a log message",
    };

    const formatted = FormatMessages([item]);

    expect(formatted).toEqual(["[ERROR] [12:00:00.000 AM WET] [] This is a log message"]);
  });
});
