// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { compare } from "@lichtblick/rostime";
import { Topic } from "@lichtblick/suite";
import { mergeAsyncIterators } from "@lichtblick/suite-base/players/IterablePlayer/Mcap/mergeAsyncIterators";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

import {
  IIterableSource,
  IteratorResult,
  Initalization,
  MessageIteratorArgs,
  GetBackfillMessagesArgs,
} from "../IIterableSource";

type MultiSource = { type: "files"; files: Blob[] } | { type: "urls"; urls: string[] };

type IterableSourceConstructor<T extends IIterableSource, P> = new (args: P) => T;

export class MultiIterableSource<T extends IIterableSource, P> implements IIterableSource {
  #SourceConstructor: IterableSourceConstructor<T, P>;
  #dataSource: MultiSource;
  #sourceImpl: IIterableSource[] = [];

  public constructor(dataSource: MultiSource, SourceConstructor: IterableSourceConstructor<T, P>) {
    this.#dataSource = dataSource;
    this.#SourceConstructor = SourceConstructor;
  }

  async #loadMultipleSources(): Promise<Initalization[]> {
    const { type } = this.#dataSource;

    const sources: IIterableSource[] =
      type === "files"
        ? this.#dataSource.files.map(
            (file) => new this.#SourceConstructor({ type: "file", file } as P),
          )
        : this.#dataSource.urls.map(
            (url) => new this.#SourceConstructor({ type: "url", url } as P),
          );

    this.#sourceImpl = [...this.#sourceImpl, ...sources];

    const initializations: Initalization[] = await Promise.all(
      sources.map(async (source) => await source.initialize()),
    );

    return initializations;
  }

  public async initialize(): Promise<Initalization> {
    console.time("GOLD_loadFiles");
    const initializations: Initalization[] = await this.#loadMultipleSources();
    console.timeEnd("GOLD_loadFiles");

    console.time("GOLD_init");
    // INITIATE MERGED INITIALIZATION OBJECT
    const initialization: Initalization = {
      start: { sec: Number.MAX_SAFE_INTEGER, nsec: Number.MAX_SAFE_INTEGER },
      end: { sec: Number.MIN_SAFE_INTEGER, nsec: Number.MIN_SAFE_INTEGER },
      topics: [],
      topicStats: new Map(),
      datatypes: new Map<string, OptionalMessageDefinition>(),
      profile: "",
      name: "",
      metadata: [],
      publishersByTopic: new Map(),
      problems: [],
    };

    const uniqueTopics = new Map<string, Topic>();

    // IMPROVE MERGING INITIALIZATION OBJECTS
    // measure processing time between current implementation and new one.
    for (const init of initializations) {
      if (compare(init.start, initialization.start) < 0) {
        initialization.start = init.start;
      }
      if (compare(init.end, initialization.end) > 0) {
        initialization.end = init.end;
      }

      /**
       * Validate
       */
      init.topics.forEach((topic) => uniqueTopics.set(topic.name, topic as Topic));

      for (const [topic, stats] of init.topicStats) {
        if (!initialization.topicStats.has(topic)) {
          initialization.topicStats.set(topic, { numMessages: 0 });
        }
        initialization.topicStats.get(topic)!.numMessages += stats.numMessages;
      }

      /**
       * In the future will be necessary validate the schemas(datatypes) once is
       * expected load multiple mcaps from different mcap origins.
       */
      initialization.datatypes = new Map<string, OptionalMessageDefinition>([
        ...initialization.datatypes,
        ...init.datatypes,
      ]);
      initialization.profile = initialization.profile ?? init.profile;
      initialization.name = initialization.name ?? init.name;
      initialization.metadata = [...(initialization.metadata ?? []), ...(init.metadata ?? [])];
      initialization.publishersByTopic = new Map<string, Set<string>>([
        ...initialization.publishersByTopic,
        ...init.publishersByTopic,
      ]);
      initialization.problems = [...initialization.problems, ...init.problems];
    }

    initialization.topics = Array.from(uniqueTopics.values());
    this.#sourceImpl.sort((a, b) => compare(a.getStart!(), b.getStart!()));

    console.timeEnd("GOLD_init");

    // console.log("GOLD initialization", initialization);
    return initialization;
  }

  /**
   * Improve performance using promises to handle multiple iterators
   */
  /**
   * Each source already processes messages very quickly, there is no reason to parallelize,
   * as the bottleneck is in the latency of the sources and not in the iteration code.
   */
  public async *messageIterator(
    opt: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    const startTime = performance.now();
    // for (const source of this.#sourceImpl) {
    //   for await (const message of source.messageIterator(opt)) {
    //     yield message;
    //   }
    // }
    const iterators = this.#sourceImpl.map((source) => source.messageIterator(opt));
    yield* mergeAsyncIterators(iterators);
    const endTime = performance.now();
    console.log("GOLD_messageIterator completed", endTime - startTime);
  }

  // BATCH
  // public async *messageIterator2(
  //   opt: MessageIteratorArgs,
  // ): AsyncIterableIterator<Readonly<IteratorResult>> {
  //   console.log("GOLD_messageIterator");
  //   const startTime = performance.now();
  //   for (const source of this.#sourceImpl) {
  //     const batchSize = 6; // Adjust based on your use case
  //     let batch: IteratorResult[] = [];

  //     for await (const message of source.messageIterator(opt)) {
  //       batch.push(message);
  //       if (batch.length >= batchSize) {
  //         yield* batch;
  //         batch = [];
  //       }
  //     }

  //     // Yield any remaining messages in the last batch
  //     if (batch.length > 0) {
  //       yield* batch;
  //     }
  //   }
  //   const endTime = performance.now();
  //   console.log("GOLD_messageIterator2 completed", endTime - startTime);
  // }

  // STREAM
  // public async *messageIterator3(
  //   opt: MessageIteratorArgs,
  // ): AsyncIterableIterator<Readonly<IteratorResult>> {
  //   const startTime = performance.now();
  //   for (const source of this.#sourceImpl) {
  //     const stream = Readable.from(source.messageIterator(opt));
  //     for await (const message of stream) {
  //       yield message;
  //     }
  //   }
  //   const endTime = performance.now();
  //   console.log("GOLD_messageIterator3 completed", endTime - startTime);
  // }

  public async getBackfillMessages(args: GetBackfillMessagesArgs): Promise<MessageEvent[]> {
    const backfillMessages = await Promise.all(
      this.#sourceImpl.map(async (source) => await source.getBackfillMessages(args)),
    );

    return backfillMessages.flat();
  }
}
