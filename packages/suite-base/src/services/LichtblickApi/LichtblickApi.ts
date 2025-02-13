// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { LichtblickApiExtensions } from "@lichtblick/suite-base/services/LichtblickApi/LichtblickApiExtensions";
import { LichtblickApiLayouts } from "@lichtblick/suite-base/services/LichtblickApi/LichtblickApiLayouts";
import { ILichtblickApi } from "@lichtblick/suite-base/services/LichtblickApi/types/ILichtblickApi";

export default class LichtblickApi implements ILichtblickApi {
  #baseUrl: string = "http://localhost:3000";

  public readonly extensions: LichtblickApiExtensions;
  public readonly layouts: LichtblickApiLayouts;

  public constructor(namespace: string) {
    this.extensions = new LichtblickApiExtensions(this.#baseUrl, namespace);
    this.layouts = new LichtblickApiLayouts(this.#baseUrl, namespace);
  }
}
