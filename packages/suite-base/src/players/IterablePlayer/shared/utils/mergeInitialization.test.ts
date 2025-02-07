// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Time } from "@lichtblick/rostime";
import {
  InitMetadata,
  InitTopicStatsMap,
} from "@lichtblick/suite-base/players/IterablePlayer/shared/types";
import {
  accumulateMap,
  mergeMetadata,
  mergeTopicStats,
  setEndTime,
  setStartTime,
} from "@lichtblick/suite-base/players/IterablePlayer/shared/utils/mergeInitialization";

describe("mergeInitialization utils", () => {
  describe("setStartTime", () => {
    it("should return the earlier time", () => {
      const time1: Time = { sec: 10, nsec: 0 };
      const time2: Time = { sec: 20, nsec: 0 };
      expect(setStartTime(time1, time2)).toEqual(time1);
      expect(setStartTime(time2, time1)).toEqual(time1);
    });
  });

  describe("setEndTime", () => {
    it("should return the later time", () => {
      const time1: Time = { sec: 10, nsec: 0 };
      const time2: Time = { sec: 20, nsec: 0 };
      expect(setEndTime(time1, time2)).toEqual(time2);
      expect(setEndTime(time2, time1)).toEqual(time2);
    });
  });

  describe("mergeMetadata", () => {
    it("should merge two metadata arrays", () => {
      const metadata1: InitMetadata = [{ name: "value1", metadata: { key: "value1" } }];
      const metadata2: InitMetadata = [{ name: "value2", metadata: { key: "value2" } }];
      const result = mergeMetadata(metadata1, metadata2);
      expect(result!.length).toBe(2);
      expect(result![0]!.name).toBe("value1");
      expect(result![1]!.name).toBe("value2");
      expect(result![0]!.metadata.key).toBe("value1");
      expect(result![1]!.metadata.key).toBe("value2");
    });

    it("should handle undefined metadata", () => {
      const metadata1: InitMetadata = [{ name: "value1", metadata: { key: "value1" } }];
      const metadata2: InitMetadata = undefined;
      const result = mergeMetadata(metadata1, metadata2);
      expect(result!.length).toBe(1);
      expect(result![0]!.name).toBe("value1");
      expect(result![0]!.metadata.key).toBe("value1");
    });

    it("should handle undefined metadata in both", () => {
      const metadata1: InitMetadata = undefined;
      const metadata2: InitMetadata = undefined;
      const result = mergeMetadata(metadata1, metadata2);
      expect(result).toEqual([]);
    });
  });

  describe("accumulateMap", () => {
    it("should merge two maps", () => {
      const map1 = new Map<string, number>([["key1", 1]]);
      const map2 = new Map<string, number>([["key2", 2]]);
      const result = accumulateMap(map1, map2);
      expect(result.size).toBe(2);
      expect(result.get("key1")).toBe(1);
      expect(result.get("key2")).toBe(2);
    });
  });

  describe("mergeTopicStats", () => {
    it("should merge two topic stats maps", () => {
      const statsMap1: InitTopicStatsMap = new Map([["topic1", { numMessages: 5 }]]);
      const statsMap2: InitTopicStatsMap = new Map([
        ["topic1", { numMessages: 3 }],
        ["topic2", { numMessages: 7 }],
      ]);
      const result = mergeTopicStats(statsMap1, statsMap2);
      expect(result.get("topic1")!.numMessages).toBe(8);
      expect(result.get("topic2")!.numMessages).toBe(7);
    });
  });
});
