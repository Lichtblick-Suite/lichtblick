// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import {
  RemoteLayout,
  IRemoteLayoutStorage,
  SaveNewLayout,
  UpdateLayout,
} from "@lichtblick/suite-base/services/IRemoteLayoutStorage";

export class LichtblickApiLayouts implements IRemoteLayoutStorage {
  public readonly namespace: string;
  #baseUrl: string;

  public constructor(baseUrl: string, namespace: string) {
    this.#baseUrl = `${baseUrl}/layouts`;
    this.namespace = namespace;
  }

  public async getLayouts(): Promise<readonly RemoteLayout[]> {
    try {
      const response = await fetch(`${this.#baseUrl}/${this.namespace}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch layouts: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public async getLayout(id: LayoutID): Promise<RemoteLayout | undefined> {
    const response = await fetch(`${this.#baseUrl}/${id}`);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch layout ${id}: ${response.statusText}`);
    }
    return await response.json();
  }

  public async saveNewLayout(params: SaveNewLayout): Promise<RemoteLayout> {
    const response = await fetch(`${this.#baseUrl}/${this.namespace}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save layout: ${response.statusText}`);
    }
    return await response.json();
  }

  public async updateLayout(
    params: UpdateLayout,
  ): Promise<{ status: "success"; newLayout: RemoteLayout } | { status: "conflict" }> {
    const response = await fetch(`${this.#baseUrl}/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (response.status === 409) {
      return { status: "conflict" };
    }
    if (!response.ok) {
      throw new Error(`Failed to update layout ${params.id}: ${response.statusText}`);
    }

    return await response.json();
  }

  public async deleteLayout(id: LayoutID): Promise<boolean> {
    const response = await fetch(`${this.#baseUrl}/${id}`, { method: "DELETE" });
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Failed to delete layout ${id}: ${response.statusText}`);
    }
    return true;
  }
}
