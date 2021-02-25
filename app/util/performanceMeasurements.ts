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

/**
 * This library has convenience utilities for doing performance measurements in development. It wraps around the User timing api in the browser,
 * so before using these have a look at that to understand what's happening behind these functions. Some useful links:
 * - https://www.html5rocks.com/en/tutorials/webperformance/usertiming/
 * - https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API
 * - https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/timeline-tool
 *
 * To use these, first record a mark with a unique-ish string (e.g `recordMark("myFnStarted")`) and then at the end of the period you want to
 * record, call `recordAndClearMeasure("myFn", "myFnStarted")`. This will then be shown on the devtools user timings timeline when you record
 * performance measurements. It's particularly useful for situations where you don't want to pass around a "start time", e.g start the timer in
 * one module and context, and stop it later in a different module / context.
 *
 * Note: It only runs in develop and if the api exists, so you can leave it in production code and it'll effectively be a no-op.
 */

export const recordAndClearMeasure = (
  measureName: string,
  startMarkName: string,
  endMarkName?: string,
) => {
  if (process.env.NODE_ENV === "development" && performance) {
    try {
      performance.measure(measureName, startMarkName, endMarkName);
    } catch (e) {
      // Ignore errors. Typically: startMark is missing, which throws.
    } finally {
      performance.clearMarks(startMarkName);
      performance.clearMeasures(measureName);
    }
  }
};

export const recordMark = (startMarkName: string) => {
  if (process.env.NODE_ENV === "development" && performance) {
    performance.mark(startMarkName);
  }
};
