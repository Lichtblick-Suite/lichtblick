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

import ChartJSChart from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import datalabelPlugin from "chartjs-plugin-datalabels";

import installMulticolorLineChart from "@foxglove-studio/app/util/multicolorLineChart";

export default function installChartjs(Chart: any = ChartJSChart) {
  Chart.plugins.register(annotationPlugin);
  Chart.plugins.register(datalabelPlugin);
  installMulticolorLineChart(Chart);

  // Otherwise we'd get labels everywhere.
  Chart.defaults.global.plugins.datalabels = {};
  Chart.defaults.global.plugins.datalabels.display = false;

  if (Chart.plugins.count() !== 5) {
    throw new Error(
      "Incorrect number of Chart.js plugins; one probably has not loaded correctly (make sure we don't have duplicate chart.js instances when running `yarn list`.",
    );
  }
}
