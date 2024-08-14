// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SensorStatus, statusLevels } from "./SensorStatus";
import { SensorStatusMessage } from "./SensorStatusMessage";

export const getBackgroundColor = (status: string) => {
  switch (status) {
    case "OK":
      return "green";
    case "WARN":
      return "yellow";
    case "ERROR":
      return "red";
    case "STALE":
      return "grey";
    default:
      return "white";
  }
};

export const parseSensorMessages = (sensorMessages: SensorStatusMessage[]): SensorStatus[] => {
  return sensorMessages.flatMap((sensorMessage) => {
    try {
      return sensorMessage.message.status.map((sensorData) => {
        const fps = sensorData.values.find((v) => v.key === "frame_rate_msg")?.value || "N/A";
        const dropsInWindow =
          sensorData.values.find((v) => v.key === "total_dropped_frames")?.value || "N/A";
        const status = statusLevels[sensorData.level] || "STALE";

        return {
          sensor_name: sensorData.name,
          status,
          fps,
          dropsInWindow,
        };
      });
    } catch (e) {
      console.error("Failed to parse sensor message:", e);
      return [];
    }
  });
};
