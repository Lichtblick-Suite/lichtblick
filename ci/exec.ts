// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { group } from "@actions/core";
import { exec } from "@actions/exec";

export default async function (program: string, args: string[]): Promise<void> {
  await group(`$ ${program} ${args.join(" ")}`, async () => {
    await exec(program, args);
  });
}
