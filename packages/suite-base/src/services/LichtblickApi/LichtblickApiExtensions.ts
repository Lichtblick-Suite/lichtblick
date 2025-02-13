// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StoredExtension } from "@lichtblick/suite-base/services/IExtensionStorage";
import { IExtensionLichtblickApi } from "@lichtblick/suite-base/services/LichtblickApi/types/IExtensionLichtblickApi";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export class LichtblickApiExtensions implements IExtensionLichtblickApi {
  public readonly slug: string;
  #baseUrl: string;

  public constructor(baseUrl: string, slug: string) {
    this.#baseUrl = `${baseUrl}/extensions`;
    this.slug = slug;
  }

  public async list(): Promise<ExtensionInfo[]> {
    try {
      const response = await fetch(`${this.#baseUrl}/${this.slug}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch extensions: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public async get(id: string): Promise<StoredExtension | undefined> {
    const response = await fetch(`${this.#baseUrl}/${this.slug}/${id}`);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch extension ${id}: ${response.statusText}`);
    }
    return await response.json();
  }

  public async createOrUpdate(
    { info, slug }: Pick<StoredExtension, "info" | "slug">,
    file: File,
  ): Promise<StoredExtension> {
    const extensionStr = JSON.stringify({
      info,
      slug,
    });
    const formData = new FormData();
    formData.append("file", file);
    if (extensionStr != undefined) {
      formData.append("extension", extensionStr);
    }

    const response = await fetch(this.#baseUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to save extension: ${response.statusText}`);
    }

    return await response.json();
  }

  public async remove(id: string): Promise<boolean> {
    const response = await fetch(`${this.#baseUrl}/${id}`, { method: "DELETE" });
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Failed to delete layout ${id}: ${response.statusText}`);
    }
    return true;
  }

  public async loadContent(fileId: string): Promise<Uint8Array | undefined> {
    try {
      const response = await fetch(`${this.#baseUrl}/file/download/${fileId}`);
      if (!response.ok) {
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error(`Error loading content of the extension file:`, error);
      throw new Error("Failed to fetch extension content");
    }
  }
}
