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

import aggregateStats from "./aggregateStats";

describe("aggregateStats", () => {
  it("Aggregates only numeric stats", () => {
    const aggregated = aggregateStats([
      { number: 1, array: [] },
      { number: 3, array: [] },
      { number: 5, array: [] },
    ]);

    expect(aggregated).toEqual({ number: 3, number_stddev: 1.632993161855452 });
  });
});
