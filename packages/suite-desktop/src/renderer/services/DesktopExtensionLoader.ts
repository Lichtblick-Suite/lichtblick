// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import { ExtensionInfo, ExtensionLoader, ExtensionNamespace } from "@lichtblick/suite-base";

import { Desktop } from "../../common/types";

const log = Logger.getLogger(__filename);

export class DesktopExtensionLoader implements ExtensionLoader {
  #bridge?: Desktop;
  public readonly namespace: ExtensionNamespace = "local";

  public constructor(bridge: Desktop) {
    this.#bridge = bridge;
  }

  public async getExtensions(): Promise<ExtensionInfo[]> {
    const extensionList = (await this.#bridge?.getExtensions()) ?? [];
    log.debug(`Loaded ${extensionList.length} extension(s)`);

    const extensions = extensionList.map((item): ExtensionInfo => {
      const pkgInfo = item.packageJson as ExtensionInfo;
      return {
        id: item.id,
        name: pkgInfo.displayName,
        namespace: this.namespace,
        // Qualified name is display name for backwards compatibility with existing layouts.
        qualifiedName: pkgInfo.displayName,
        displayName: pkgInfo.displayName,
        description: pkgInfo.description,
        publisher: pkgInfo.publisher,
        homepage: pkgInfo.homepage,
        license: pkgInfo.license,
        version: pkgInfo.version,
        keywords: pkgInfo.keywords,
      };
    });

    return extensions;
  }

  public async loadExtension(id: string): Promise<string> {
    return (await this.#bridge?.loadExtension(id)) ?? "";
  }

  public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
    if (this.#bridge == undefined) {
      throw new Error(`Cannot install extension without a desktopBridge`);
    }
    const detail = await this.#bridge.installExtension(foxeFileData);

    const pkgInfo = detail.packageJson as ExtensionInfo;

    return {
      id: detail.id,
      name: pkgInfo.displayName,
      namespace: this.namespace,
      // Qualified name is display name for backwards compatibility with existing layouts.
      qualifiedName: pkgInfo.displayName,
      displayName: pkgInfo.displayName,
      description: pkgInfo.description,
      publisher: pkgInfo.publisher,
      homepage: pkgInfo.homepage,
      license: pkgInfo.license,
      version: pkgInfo.version,
      keywords: pkgInfo.keywords,
    };
  }

  public async uninstallExtension(id: string): Promise<void> {
    await this.#bridge?.uninstallExtension(id);
  }
}
