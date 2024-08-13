// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export interface SensorStatus {
  sensor_name: string;
  status: "OK" | "WARN" | "ERROR" | "STALE";
  fps: string;
  dropsInWindow: string;
}

export const statusLevels: Record<number, "OK" | "WARN" | "ERROR" | "STALE"> = {
  0: "OK",
  1: "WARN",
  2: "ERROR",
  3: "STALE",
};
