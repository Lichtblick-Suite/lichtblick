// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import React, { PropsWithChildren, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { StoreApi, createStore } from "zustand";

import Logger from "@lichtblick/log";
import {
  ExtensionContext,
  ExtensionModule,
  PanelSettings,
  RegisterMessageConverterArgs,
  TopicAliasFunction,
} from "@lichtblick/suite";
import {
  ContributionPoints,
  ExtensionCatalog,
  ExtensionCatalogContext,
  InstallExtensionsResult,
  MessageConverter,
  RegisteredPanel,
} from "@lichtblick/suite-base/context/ExtensionCatalogContext";
import { ExtensionLoader } from "@lichtblick/suite-base/services/ExtensionLoader";
import { ExtensionInfo, ExtensionNamespace } from "@lichtblick/suite-base/types/Extensions";

const log = Logger.getLogger(__filename);

const REFRESH_EXTENSIONS_BATCH = 3;
const INSTALL_EXTENSIONS_BATCH = 3;

function mountExtension(
  extension: ExtensionInfo,
  unwrappedExtensionSource: string,
): ContributionPoints {
  // registered panels stored by their fully qualified id
  // the fully qualified id is the extension name + panel name
  const panels: Record<string, RegisteredPanel> = {};

  const messageConverters: RegisterMessageConverterArgs<unknown>[] = [];

  const panelSettings: Record<string, Record<string, PanelSettings<unknown>>> = {};

  const topicAliasFunctions: ContributionPoints["topicAliasFunctions"] = [];

  log.debug(`Mounting extension ${extension.qualifiedName}`);

  const module = { exports: {} };
  const require = (name: string) => {
    return { react: React, "react-dom": ReactDOM }[name];
  };

  const extensionMode =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";

  const ctx: ExtensionContext = {
    mode: extensionMode,

    registerPanel: (params) => {
      log.debug(`Extension ${extension.qualifiedName} registering panel: ${params.name}`);

      const fullId = `${extension.qualifiedName}.${params.name}`;
      if (panels[fullId]) {
        log.warn(`Panel ${fullId} is already registered`);
        return;
      }

      panels[fullId] = {
        extensionId: extension.id,
        extensionName: extension.qualifiedName,
        extensionNamespace: extension.namespace,
        registration: params,
      };
    },

    registerMessageConverter: <Src,>(args: RegisterMessageConverterArgs<Src>) => {
      log.debug(
        `Extension ${extension.qualifiedName} registering message converter from: ${args.fromSchemaName} to: ${args.toSchemaName}`,
      );
      messageConverters.push({
        ...args,
        extensionNamespace: extension.namespace,
        extensionId: extension.id,
      } as MessageConverter);

      const converterSettings = _.mapValues(args.panelSettings, (settings) => ({
        [args.fromSchemaName]: settings,
      }));

      _.merge(panelSettings, converterSettings);
    },

    registerTopicAliases: (aliasFunction: TopicAliasFunction) => {
      topicAliasFunctions.push({ aliasFunction, extensionId: extension.id });
    },
  };

  try {
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
    const fn = new Function("module", "require", unwrappedExtensionSource);

    // load the extension module exports
    fn(module, require, {});
    const wrappedExtensionModule = module.exports as ExtensionModule;

    wrappedExtensionModule.activate(ctx);
  } catch (err: unknown) {
    log.error(err);
  }

  return {
    panels,
    messageConverters,
    topicAliasFunctions,
    panelSettings,
  };
}
function createExtensionRegistryStore(
  loaders: readonly ExtensionLoader[],
  mockMessageConverters: readonly RegisterMessageConverterArgs<unknown>[] | undefined,
): StoreApi<ExtensionCatalog> {
  return createStore((set, get) => {
    const isExtensionInstalled = (extensionId: string) => {
      return get().loadedExtensions.has(extensionId);
    };

    const markExtensionAsInstalled = (extensionId: string) => {
      const updatedExtensions = new Set(get().loadedExtensions);
      updatedExtensions.add(extensionId);
      set({ loadedExtensions: updatedExtensions });
    };

    const unMarkExtensionAsInstalled = (extensionId: string) => {
      const updatedExtensions = new Set(get().loadedExtensions);
      updatedExtensions.delete(extensionId);
      set({ loadedExtensions: updatedExtensions });
    };

    const downloadExtension = async (url: string) => {
      const res = await fetch(url);
      return new Uint8Array(await res.arrayBuffer());
    };

    const installExtensions = async (namespace: ExtensionNamespace, data: Uint8Array[]) => {
      const namespaceLoader = loaders.find((loader) => loader.namespace === namespace);
      if (namespaceLoader == undefined) {
        throw new Error(`No extension loader found for namespace ${namespace}`);
      }

      const batchPromises = async (batch: Uint8Array[]): Promise<InstallExtensionsResult[]> => {
        return await Promise.all(
          batch.map(async (extensionData: Uint8Array) => {
            try {
              const info = await namespaceLoader.installExtension(extensionData);
              const unwrappedExtensionSource = await namespaceLoader.loadExtension(info.id);
              const contributionPoints = mountExtension(info, unwrappedExtensionSource);

              get().mergeState(info, contributionPoints);
              get().markExtensionAsInstalled(info.id);
              return { success: true, info };
            } catch (error) {
              return { success: false, error };
            }
          }),
        );
      };

      const results: InstallExtensionsResult[] = [];
      for (let i = 0; i < data.length; i += INSTALL_EXTENSIONS_BATCH) {
        const chunk = data.slice(i, i + INSTALL_EXTENSIONS_BATCH);
        const result = await batchPromises(chunk);
        results.push(...result);
      }
      return results;
    };

    const mergeState = (
      info: ExtensionInfo,
      { messageConverters, panelSettings, panels, topicAliasFunctions }: ContributionPoints,
    ) => {
      set((state) => ({
        installedExtensions: _.uniqBy([...(state.installedExtensions ?? []), info], "id"),
        installedPanels: { ...state.installedPanels, ...panels },
        installedMessageConverters: _.uniqBy(
          [...state.installedMessageConverters!, ...messageConverters],
          "extensionId",
        ),
        installedTopicAliasFunctions: _.uniqBy(
          [...state.installedTopicAliasFunctions!, ...topicAliasFunctions],
          "extensionId",
        ),
        panelSettings: { ...state.panelSettings, ...panelSettings },
      }));
    };

    const refreshAllExtensions = async () => {
      log.debug("Refreshing all extensions");
      if (loaders.length === 0) {
        return;
      }

      const start = performance.now();
      const installedExtensions: ExtensionInfo[] = [];
      const { messageConverters, panels, panelSettings, topicAliasFunctions }: ContributionPoints =
        {
          messageConverters: [],
          panels: {},
          panelSettings: {},
          topicAliasFunctions: [],
        };

      const loadInBatch = async (extensionsBatch: ExtensionInfo[], loader: ExtensionLoader) => {
        await Promise.all(
          extensionsBatch.map(async (extension) => {
            try {
              installedExtensions.push(extension);

              const unwrappedExtensionSource = await loader.loadExtension(extension.id);
              const contributionPoints = mountExtension(extension, unwrappedExtensionSource);

              _.assign(panels, contributionPoints.panels);
              _.merge(panelSettings, contributionPoints.panelSettings);
              messageConverters.push(...contributionPoints.messageConverters);
              topicAliasFunctions.push(...contributionPoints.topicAliasFunctions);

              get().markExtensionAsInstalled(extension.id);
            } catch (err: unknown) {
              log.error(`Error loading extension ${extension.id}`, err);
            }
          }),
        );
      };

      const processLoader = async (loader: ExtensionLoader) => {
        try {
          const extensions = await loader.getExtensions();
          const chunks = _.chunk(extensions, REFRESH_EXTENSIONS_BATCH);
          for (const chunk of chunks) {
            await loadInBatch(chunk, loader);
          }
        } catch (err: unknown) {
          log.error("Error loading extension list", err);
        }
      };
      await Promise.all(loaders.map(processLoader));

      log.info(
        `Loaded ${installedExtensions.length} extensions in ${(performance.now() - start).toFixed(1)}ms`,
      );

      set({
        installedExtensions,
        installedPanels: panels,
        installedMessageConverters: messageConverters,
        installedTopicAliasFunctions: topicAliasFunctions,
        panelSettings,
      });
    };

    const uninstallExtension = async (namespace: ExtensionNamespace, id: string) => {
      const namespaceLoader = loaders.find((loader) => loader.namespace === namespace);
      if (namespaceLoader == undefined) {
        throw new Error("No extension loader found for namespace " + namespace);
      }

      const extension = await namespaceLoader.getExtension(id);
      if (!extension) {
        return;
      }

      await namespaceLoader.uninstallExtension(extension.id);

      set((state) => {
        const {
          installedExtensions,
          installedPanels,
          installedMessageConverters,
          installedTopicAliasFunctions,
        } = state;

        // eslint-disable-next-line @typescript-eslint/no-shadow
        const filteredExtensions = installedExtensions!.filter(({ id }) => id !== extension.id);
        const filteredPanels = _.pickBy(
          installedPanels,
          ({ extensionId }) => extensionId !== extension.id,
        );
        const filteredMessageConverters = installedMessageConverters!.filter(
          ({ extensionId }) => extensionId !== extension.id,
        );
        const filteredTopicAliasFunctions = installedTopicAliasFunctions!.filter(
          ({ extensionId }) => extensionId !== extension.id,
        );

        return {
          installedExtensions: filteredExtensions,
          installedPanels: filteredPanels,
          installedMessageConverters: filteredMessageConverters,
          installedTopicAliasFunctions: filteredTopicAliasFunctions,
        };
      });

      get().unMarkExtensionAsInstalled(id);
    };

    return {
      downloadExtension,
      installExtensions,
      isExtensionInstalled,
      markExtensionAsInstalled,
      mergeState,
      refreshAllExtensions,
      uninstallExtension,
      unMarkExtensionAsInstalled,
      installedExtensions: loaders.length === 0 ? [] : undefined,
      installedMessageConverters: mockMessageConverters ?? [],
      installedPanels: {},
      installedTopicAliasFunctions: [],
      loadedExtensions: new Set<string>(),
      panelSettings: _.merge(
        {},
        ...(mockMessageConverters ?? []).map(({ fromSchemaName, panelSettings }) =>
          _.mapValues(panelSettings, (settings) => ({ [fromSchemaName]: settings })),
        ),
      ),
    };
  });
}

export default function ExtensionCatalogProvider({
  children,
  loaders,
  mockMessageConverters,
}: PropsWithChildren<{
  loaders: readonly ExtensionLoader[];
  mockMessageConverters?: readonly RegisterMessageConverterArgs<unknown>[];
}>): React.JSX.Element {
  const [store] = useState(createExtensionRegistryStore(loaders, mockMessageConverters));

  // Request an initial refresh on first mount
  const refreshAllExtensions = store.getState().refreshAllExtensions;
  useEffect(() => {
    refreshAllExtensions().catch((err: unknown) => {
      log.error(err);
    });
  }, [refreshAllExtensions]);

  return (
    <ExtensionCatalogContext.Provider value={store}>{children}</ExtensionCatalogContext.Provider>
  );
}
