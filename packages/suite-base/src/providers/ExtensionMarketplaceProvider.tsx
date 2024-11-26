// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";

import { useShallowMemo } from "@lichtblick/hooks";
import ExtensionMarketplaceContext, {
  ExtensionMarketplaceDetail,
} from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";

const MARKETPLACE_URL =
  "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json";

export default function ExtensionMarketplaceProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const getAvailableExtensions = useCallback(async (): Promise<ExtensionMarketplaceDetail[]> => {
    const res = await fetch(MARKETPLACE_URL);
    return (await res.json()) as ExtensionMarketplaceDetail[];
  }, []);
  const getMarkdown = useCallback(async (url: string): Promise<string> => {
    const res = await fetch(url);
    return await res.text();
  }, []);
  const marketplace = useShallowMemo({
    getAvailableExtensions,
    getMarkdown,
  });
  return (
    <ExtensionMarketplaceContext.Provider value={marketplace}>
      {children}
    </ExtensionMarketplaceContext.Provider>
  );
}
