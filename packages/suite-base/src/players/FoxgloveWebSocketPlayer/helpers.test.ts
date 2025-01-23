// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StatusLevel } from "@foxglove/ws-protocol";

import {
  dataTypeToFullName,
  statusLevelToProblemSeverity,
} from "@lichtblick/suite-base/players/FoxgloveWebSocketPlayer/helpers";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

describe("dataTypeToFullName", () => {
  it("should convert dataType to include /msg/ on it", () => {
    const message = "unit/test";

    const result = dataTypeToFullName(message);

    expect(result).toContain("/msg/");
  });

  it("should return the message unaltered if it differs from the 'text/text' format", () => {
    const message = BasicBuilder.string();

    const result = dataTypeToFullName(message);

    expect(result).toBe(message);
  });
});

describe("statusLevelToProblemSeverity", () => {
  it("should map StatusLevel.INFO to 'info' severity", () => {
    const level = StatusLevel.INFO;

    const result = statusLevelToProblemSeverity(level);

    expect(result).toBe("info");
  });

  it("should map StatusLevel.WARNING to 'warn' severity", () => {
    const level = StatusLevel.WARNING;

    const result = statusLevelToProblemSeverity(level);

    expect(result).toBe("warn");
  });

  it("should map StatusLevel.ERROR to 'error' severity", () => {
    const level = StatusLevel.ERROR;

    const result = statusLevelToProblemSeverity(level);

    expect(result).toBe("error");
  });
});
