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

// Equivalent to `number % modulus`, but always returns a positive number (given that modulus is
// a positive number). This is the same as the `%` in e.g. Python.
// See https://stackoverflow.com/a/4467559 and https://en.wikipedia.org/wiki/Modulo_operation
export default function positiveModulo(number: number, modulus: number): number {
  return ((number % modulus) + modulus) % modulus;
}
