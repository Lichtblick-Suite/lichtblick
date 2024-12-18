// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { Immutable } from "@lichtblick/suite";
import { AppParametersEnum } from "@lichtblick/suite-base/AppParameters";

export type AppParameters = Readonly<Record<AppParametersEnum | (string & {}), string>>;

export type AppParametersContext = Immutable<AppParameters>;

export const AppParametersContext = createContext<undefined | AppParametersContext>(undefined);

export function useAppParameters(): AppParameters {
  const context = useContext(AppParametersContext);
  if (context == undefined) {
    throw new Error("A AppParameters provider is required to useAppParameters");
  }
  return context;
}
