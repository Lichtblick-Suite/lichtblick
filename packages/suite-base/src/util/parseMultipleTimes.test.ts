// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { parseTimestampStr } from "./parseMultipleTimes";

describe("parseTimestampStr", () => {
  it("should return the same number if input is a Unix timestamp in seconds", () => {
    expect(parseTimestampStr("1633046400")).toBe(1633046400);
  });

  it("should starts in 01/01/1970 at 01:00:00", () => {
    expect(parseTimestampStr("1970-01-01 01:00:00")).toBe(0);
  });

  describe("parse valid date strings and return Unix timestamps in seconds", () => {
    it("should return Unix timestamp in seconds with default timezone (CET)", () => {
      expect(parseTimestampStr("2021-10-01T00:00:00Z")).toBe(1633046400); // UTC (equivalent to CET)
      expect(parseTimestampStr("2020-04-07 11:45:21 PM")).toBe(1586299521); // Without timezone (defaults to CET)
      expect(parseTimestampStr("2024-12-02 11:45:21.325123 PM")).toBe(1733179521.325); // Without timezone (defaults to CET)
      expect(parseTimestampStr("2024-12-02 11:45:21.325123")).toBe(1733136321.325); // Without timezone (defaults to CET)
      expect(parseTimestampStr("2024-12-02 11:45:21")).toBe(1733136321); // Without timezone (defaults to CET)
      expect(parseTimestampStr("2024-12-02 11:45")).toBe(1733136300); // Without timezone (defaults to CET)
      expect(parseTimestampStr("2024-12-02")).toBe(1733137200); // Without timezone (defaults to CET)
    });

    it("should return Unix timestamp with explicit CET timezone", () => {
      expect(parseTimestampStr("2024-12-02 11:45:21 CET")).toBe(1733136321); // CET
      expect(parseTimestampStr("2024-12-02 11:45:21.325123 CET")).toBe(1733136321.325); // CET with fractional seconds
    });

    it("should return Unix timestamp with WET timezone", () => {
      expect(parseTimestampStr("2024-12-02 11:45:21 WET")).toBe(1733136321 + 3600); // WET (1 hour behind CET)
      expect(parseTimestampStr("2024-12-02 11:45:21.325123 WET")).toBe(1733136321.325 + 3600); // WET with fractional seconds (1 hour behind CET)
    });

    it("should return Unix timestamp with random timestamp", () => {
      const year = BasicBuilder.number({ min: 1970, max: 3000 });
      const month = BasicBuilder.number({ min: 1, max: 12 });
      const day = BasicBuilder.number({ min: 1, max: 31 });
      const hour = BasicBuilder.number({ min: 0, max: 23 });
      const minute = BasicBuilder.number({ min: 0, max: 59 });
      const second = BasicBuilder.number({ min: 0, max: 59 });
      const timezone = BasicBuilder.sample(["CET", "WET"]);

      const timestampStr = `${year}-${month}-${day} ${hour}:${minute}:${second} ${timezone}`;
      const timestampWithTimezone = `${year}-${month}-${day} ${hour}:${minute}:${second} ${timezone}`;
      const timestamp = parseTimestampStr(timestampStr);

      expect(timestamp).toBeDefined();
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toEqual(parseTimestampStr(timestampWithTimezone));
    });

    it("should return the same timestamp for equivalent times in CET and WET", () => {
      const timestampWithoutTimezone = parseTimestampStr("2024-12-02 10:45:21");
      const timestampWithCET = parseTimestampStr("2024-12-02 10:45:21 CET");
      const timestampWithWET = parseTimestampStr("2024-12-02 09:45:21 WET");

      expect(timestampWithoutTimezone).toBe(timestampWithCET);
      expect(timestampWithoutTimezone).toBe(timestampWithWET);
    });
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
