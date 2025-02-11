// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export interface IExtensionLichtblickApi {
  list(): Promise<ExtensionInfo[]>;
  get(id: string): Promise<string>;
  put(data: ExtensionInfo): Promise<ExtensionInfo>;
  // install(data: Uint8Array): Promise<ExtensionInfo>;
  // uninstall(id: string): Promise<void>;
}
