// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "@lichtblick/comlink";
import { IterableSourceInitializeArgs } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { WorkerIterableSourceWorker } from "@lichtblick/suite-base/players/IterablePlayer/WorkerIterableSourceWorker";
import { MultiIterableSource } from "@lichtblick/suite-base/players/IterablePlayer/shared/MultiIterableSource";

import { McapIterableSource } from "./McapIterableSource";

export function initialize(args: IterableSourceInitializeArgs): WorkerIterableSourceWorker {
  if (args.file) {
    const source = new McapIterableSource({ type: "file", file: args.file });
    const wrapped = new WorkerIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.files) {
    const source = new MultiIterableSource(
      { type: "files", files: args.files },
      McapIterableSource,
    );
    const wrapped = new WorkerIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.urls?.length === 1) {
    const singleUrl = args.urls[0]!;
    const source = new McapIterableSource({ type: "url", url: singleUrl });
    const wrapped = new WorkerIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.urls && args.urls.length > 1) {
    const source = new MultiIterableSource({ type: "urls", urls: args.urls }, McapIterableSource);
    const wrapped = new WorkerIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  }

  throw new Error("file or url required");
}

Comlink.expose(initialize);
