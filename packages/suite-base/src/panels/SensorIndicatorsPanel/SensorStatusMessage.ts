// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export interface SensorStatusMessage {
  topic: string;
  message: {
    status: Array<{
      hardware_id: string;
      level: number;
      message: string;
      name: string;
      values: Array<{ key: string; value: string }>;
    }>;
  };
}
