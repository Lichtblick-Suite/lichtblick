// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { IExtensionLichtblickApi } from "@lichtblick/suite-base/services/LichtblickApi/types/IExtensionLichtblickApi";
import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export class LichtblickApiExtensions implements IExtensionLichtblickApi {
  #baseUrl: string;

  public constructor(baseUrl: string) {
    this.#baseUrl = `${baseUrl}/extensions`;
  }

  public async list(): Promise<ExtensionInfo[]> {
    const response = await fetch(this.#baseUrl);
    return await response.json();
  }

  public async get(id: string): Promise<string> {
    const response = await fetch(`${this.#baseUrl}/${id}`);
    return await response.text();
  }

  public async put(data: ExtensionInfo): Promise<ExtensionInfo> {
    const response = await fetch(`${this.#baseUrl}/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  }
}
