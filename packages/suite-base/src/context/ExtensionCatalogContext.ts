// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext } from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import {
  ExtensionPanelRegistration,
  Immutable,
  PanelSettings,
  RegisterMessageConverterArgs,
} from "@lichtblick/suite";
import { ExtensionSettings } from "@lichtblick/suite-base/components/PanelSettings/types";
import { TopicAliasFunctions } from "@lichtblick/suite-base/players/TopicAliasingPlayer/TopicAliasingPlayer";
import { ExtensionInfo, ExtensionNamespace } from "@lichtblick/suite-base/types/Extensions";

export type RegisteredPanel = {
  extensionId: string;
  extensionName: string;
  extensionNamespace?: ExtensionNamespace;
  registration: ExtensionPanelRegistration;
};

export type InstallExtensionsResult = {
  success: boolean;
  info?: ExtensionInfo;
  error?: unknown;
};

export type ExtensionCatalog = Immutable<{
  downloadExtension: (url: string) => Promise<Uint8Array>;
  installExtensions: (
    namespace: ExtensionNamespace,
    data: Uint8Array[],
  ) => Promise<InstallExtensionsResult[]>;
  isExtensionInstalled: (extensionId: string) => boolean;
  markExtensionAsInstalled: (extensionId: string) => void;
  mergeState: (info: ExtensionInfo, contributionPoints: ContributionPoints) => void;
  refreshAllExtensions: () => Promise<void>;
  uninstallExtension: (namespace: ExtensionNamespace, id: string) => Promise<void>;
  unMarkExtensionAsInstalled: (extensionId: string) => void;

  loadedExtensions: Set<string>;
  installedExtensions: undefined | ExtensionInfo[];
  installedPanels: undefined | Record<string, RegisteredPanel>;
  installedMessageConverters: undefined | Omit<MessageConverter, "panelSettings">[];
  installedTopicAliasFunctions: undefined | TopicAliasFunctions;
  panelSettings: undefined | ExtensionSettings;
}>;

export type MessageConverter = RegisterMessageConverterArgs<unknown> & {
  extensionNamespace?: ExtensionNamespace;
  extensionId?: string;
};

export type ContributionPoints = {
  panels: Record<string, RegisteredPanel>;
  messageConverters: MessageConverter[];
  topicAliasFunctions: TopicAliasFunctions;
  panelSettings: ExtensionSettings;
};

export const ExtensionCatalogContext = createContext<undefined | StoreApi<ExtensionCatalog>>(
  undefined,
);

export function useExtensionCatalog<T>(selector: (registry: ExtensionCatalog) => T): T {
  const context = useGuaranteedContext(ExtensionCatalogContext);
  return useStore(context, selector);
}

export function getExtensionPanelSettings(
  reg: ExtensionCatalog,
): Record<string, Record<string, PanelSettings<unknown>>> {
  return reg.panelSettings ?? {};
}
