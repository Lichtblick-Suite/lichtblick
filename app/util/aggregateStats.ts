// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import { every } from "lodash";

export default function aggregateStats(stats: any): any {
  // Add all numeric stat values together.
  const addedStats = stats.reduce((accumulator: any, stat: any) => {
    Object.keys(stat).forEach((key) => {
      if (typeof stat[key] === "number") {
        accumulator[key] = accumulator[key] || 0;
        accumulator[key] += stat[key];
      }
    });
    return accumulator;
  }, {});
  // Then divide by the number of stats.
  Object.keys(addedStats).forEach((key) => {
    const mean = addedStats[key] / stats.length;
    addedStats[key] = mean;
    if (every(stats, (obj) => typeof obj[key] === "number")) {
      addedStats[`${key}_stddev`] = Math.sqrt(
        stats.map((obj: any) => Math.pow(obj[key] - mean, 2)).reduce((a: any, b: any) => a + b) /
          stats.length,
      );
    }
  });
  return addedStats;
}
