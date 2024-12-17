// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PropsWithChildren, useMemo } from "react";

import {
  AppParameters,
  AppParametersContext,
} from "@lichtblick/suite-base/context/AppParametersContext";

type Props = PropsWithChildren<{
  appParameters?: AppParameters;
}>;

export default function AppParametersProvider({
  children,
  appParameters = {},
}: Props): React.JSX.Element {
  const parameters = useMemo(() => appParameters, [appParameters]);
  return (
    <AppParametersContext.Provider value={parameters}>{children}</AppParametersContext.Provider>
  );
}
