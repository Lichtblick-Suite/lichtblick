// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { parseTimestampStr } from "./parseMultipleTimes";

describe("parseTimestampStr", () => {
  it("should return the same number if input is a Unix timestamp in seconds", () => {
    expect(parseTimestampStr("1633046400")).toBe(1633046400);
  });

  it("should convert milliseconds to seconds if input is a Unix timestamp in milliseconds", () => {
    expect(parseTimestampStr("1633046400000")).toBe(1633046400);
  });

  it("should starts in 01/01/1970 at 01:00:00", () => {
    expect(parseTimestampStr("1970-01-01 01:00:00")).toBe(0);
  });

  it("should parse date string and return Unix timestamp in seconds", () => {
    expect(parseTimestampStr("2021-10-01T00:00:00Z")).toBe(1633046400);
    expect(parseTimestampStr("2020-04-07 11:45:21 PM")).toBe(1586299521);
    expect(parseTimestampStr("2024-12-02 11:45:21.325123 PM")).toBe(1733183121.325);
    expect(parseTimestampStr("2024-12-02 11:45:21.325123")).toBe(1733139921.325);
    expect(parseTimestampStr("2024-12-02 11:45:21")).toBe(1733139921);
    expect(parseTimestampStr("2024-12-02 11:45")).toBe(1733139900);
    expect(parseTimestampStr("2024-12-02")).toBe(1733140800);
  });

  it("should return undefined for invalid date string", () => {
    expect(parseTimestampStr("invalid-date")).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(parseTimestampStr("")).toBeUndefined();
  });

  it("should return undefined for non-numeric string", () => {
    expect(parseTimestampStr("not-a-number")).toBeUndefined();
  });
});
