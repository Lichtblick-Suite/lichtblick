// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time, fromNanoSec } from "@lichtblick/rostime";

const ONE_MS_IN_NS = 1_000_000;

export function now(): Time {
  const stampMs = performance.now() + performance.timeOrigin;
  const stampNs = BigInt(Math.round(stampMs * ONE_MS_IN_NS));
  return fromNanoSec(stampNs);
}
