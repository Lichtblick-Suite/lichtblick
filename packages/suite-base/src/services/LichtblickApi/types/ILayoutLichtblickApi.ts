// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Layout } from "@lichtblick/suite-base/services/ILayoutStorage";

export interface ILayoutLichtblickApi {
  list(): Promise<Layout[]>;
  get(id: string): Promise<string>;
  put(data: Uint8Array): Promise<Layout>;
  delete(id: string): Promise<void>;
}
