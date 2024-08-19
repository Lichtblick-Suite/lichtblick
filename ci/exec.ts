// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { exec as execAction, ExecOptions } from "@actions/exec";

export async function execOutput(
  program: string,
  args?: string[],
  options?: ExecOptions,
): Promise<{ status: number; stdout: string }> {
  let stdout = "";
  const status = await execAction(program, args, {
    ...options,
    silent: true,
    listeners: {
      stdout: (data) => {
        stdout += data.toString();
      },
    },
  });

  return { status, stdout };
}
