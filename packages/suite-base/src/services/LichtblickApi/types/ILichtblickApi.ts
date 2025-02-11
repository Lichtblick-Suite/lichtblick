// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { LichtblickApiExtensions } from "@lichtblick/suite-base/services/LichtblickApi/LichtblickApiExtensions";
import { LichtblickApiLayouts } from "@lichtblick/suite-base/services/LichtblickApi/LichtblickApiLayouts";

export interface ILichtblickApi {
  readonly extensions: LichtblickApiExtensions;
  readonly layouts: LichtblickApiLayouts;
}
