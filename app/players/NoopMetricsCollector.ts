//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
import { Time } from "rosbag";

import {
  PlayerMetricsCollectorInterface,
  SubscribePayload,
} from "@foxglove-studio/app/players/types";

export default class NoopMetricsCollector implements PlayerMetricsCollectorInterface {
  playerConstructed(): void {
    // no-op
  }
  initialized(): void {
    // no-op
  }
  play(_speed: number): void {
    // no-op
  }
  seek(_time: Time): void {
    // no-op
  }
  setSpeed(_speed: number): void {
    // no-op
  }
  pause(): void {
    // no-op
  }
  close(): void {
    // no-op
  }
  setSubscriptions(_subscriptions: SubscribePayload[]): void {
    // no-op
  }
  recordPlaybackTime(_time: Time): void {
    // no-op
  }
  recordBytesReceived(_bytes: number): void {
    // no-op
  }
  recordDataProviderPerformance(): void {
    // no-op
  }
  recordUncachedRangeRequest(): void {
    // no-op
  }
  recordTimeToFirstMsgs(): void {
    // no-op
  }
  recordDataProviderInitializePerformance() {
    // no-op
  }
  recordDataProviderStall() {
    // no-op
  }
}
