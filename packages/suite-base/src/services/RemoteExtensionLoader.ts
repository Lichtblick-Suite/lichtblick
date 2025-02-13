// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import JSZip from "jszip";

import Log from "@lichtblick/log";
import { ExtensionLoader } from "@lichtblick/suite-base/services/ExtensionLoader";
import LichtblickApi from "@lichtblick/suite-base/services/LichtblickApi/LichtblickApi";
import { ExtensionInfo, ExtensionNamespace } from "@lichtblick/suite-base/types/Extensions";

const log = Log.getLogger(__filename);

function parsePackageName(name: string): { publisher?: string; name: string } {
  const res = /^@([^/]+)\/(.+)/.exec(name);
  if (res == undefined) {
    return { name };
  }
  return { publisher: res[1], name: res[2]! };
}

function qualifiedName(
  namespace: ExtensionNamespace,
  publisher: string,
  info: ExtensionInfo,
): string {
  switch (namespace) {
    case "local":
      // For local namespace we follow the legacy naming convention of using displayName
      // in order to stay compatible with existing layouts.
      return info.displayName;
    case "org":
      // For private registry we use namespace and package name.
      return [namespace, publisher, info.name].join(":");
  }
}

function validatePackageInfo(info: Partial<ExtensionInfo>): ExtensionInfo {
  if (info.name == undefined || info.name.length === 0) {
    throw new Error("Invalid extension: missing name");
  }
  const { publisher: parsedPublisher, name } = parsePackageName(info.name);
  const publisher = info.publisher ?? parsedPublisher;
  if (publisher == undefined || publisher.length === 0) {
    throw new Error("Invalid extension: missing publisher");
  }

  return { ...info, publisher, name: name.toLowerCase() } as ExtensionInfo;
}

export class RemoteExtensionLoader implements ExtensionLoader {
  public readonly namespace: ExtensionNamespace;
  #remote: LichtblickApi;
  public slug: string;

  public constructor(namespace: ExtensionNamespace, slug: string) {
    this.namespace = namespace;
    this.slug = slug;
    this.#remote = new LichtblickApi(slug);
  }

  public async getExtensions(): Promise<ExtensionInfo[]> {
    log.debug("Listing extensions");
    return await this.#remote.extensions.list();
  }

  public async loadExtension(id: string): Promise<string> {
    log.debug("Loading extension", id);
    const extension = await this.#remote.extensions.get(id);

    if (extension == undefined) {
      throw new Error(`Extension ${id} not found`);
    }

    const content = await this.#remote.extensions.loadContent(extension.fileId!);
    if (content == undefined) {
      throw new Error("Extension is corrupted or does not exist in the file system.");
    }

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(content);
    const srcText = await zipContent.file("dist/extension.js")?.async("string");

    if (srcText == undefined) {
      throw new Error("Extension is corrupted");
    }

    return srcText;
  }

  // public async compressFile(file: File, foxeFileData: Uint8Array): Promise<Blob> {
  //   const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
  //     level: 9, // 0 - 9
  //   });

  //   await zipWriter.add(file.name, new Blob([foxeFileData]), { compression: "DEFLATE" });
  //   return await zipWriter.close();
  // }

  public async installExtension(foxeFileData: Uint8Array, file: File): Promise<ExtensionInfo> {
    log.debug("Installing extension");

    const zip = new JSZip();
    const content = await zip.loadAsync(foxeFileData);

    const pkgInfoText = await content.file("package.json")?.async("string");
    if (pkgInfoText == undefined) {
      throw new Error("Invalid extension: missing package.json");
    }

    const rawInfo = validatePackageInfo(JSON.parse(pkgInfoText) as Partial<ExtensionInfo>);
    const normalizedPublisher = rawInfo.publisher.replace(/[^A-Za-z0-9_\s]+/g, "");

    const info: ExtensionInfo = {
      ...rawInfo,
      id: `${normalizedPublisher}.${rawInfo.name}`,
      namespace: this.namespace,
      qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
    };

    await this.#remote.extensions.createOrUpdate(
      {
        info,
        slug: this.slug,
      },
      file,
    );

    return info;
  }

  public async uninstallExtension(id: string): Promise<void> {
    log.debug("Uninstalling extension", id);

    await this.#remote.extensions.remove(id);
  }
}
