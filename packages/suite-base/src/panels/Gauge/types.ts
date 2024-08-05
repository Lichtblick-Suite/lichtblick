// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export type Config = {
  path: string;
  minValue: number;
  maxValue: number;
  colorMode: "colormap" | "gradient";
  colorMap: "red-yellow-green" | "rainbow" | "turbo";
  gradient: [string, string];
  reverse: boolean;
};
