// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

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

export type NumberBuilder = {
  min: number;
  max: number;
};

export type StringBuilder = {
  capitalization?: Capitalization;
  charset: "alphanumeric" | "alphabetic" | "numeric";
  count?: number;
  length: number;
};

export type MapBuilder = StringBuilder & {
  count?: number;
};

export enum Capitalization {
  LOWERCASE = "lowercase",
  UPPERCASE = "uppercase",
}