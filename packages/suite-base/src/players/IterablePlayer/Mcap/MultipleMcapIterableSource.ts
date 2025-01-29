// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { compare } from "@lichtblick/rostime";
import { Topic } from "@lichtblick/suite";
import { McapIterableSource } from "@lichtblick/suite-base/players/IterablePlayer/Mcap/McapIterableSource";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

import {
  IIterableSource,
  IteratorResult,
  Initalization,
  MessageIteratorArgs,
  GetBackfillMessagesArgs,
} from "../IIterableSource";

type MultipleDataSource = { type: "files"; files: Blob[] } | { type: "url"; urls: string[] };

export class MultipleMcapIterableSource implements IIterableSource {
  #dataSource: MultipleDataSource;
  #sourceImpl: IIterableSource[] = [];

  public constructor(dataSource: MultipleDataSource) {
    this.#dataSource = dataSource;
  }

  public async initialize(): Promise<Initalization> {
    const dataSource = this.#dataSource;

    // SELECT OBJECT DEPENDING IF IT IS FILES OR URLS
    const initializations =
      dataSource.type === "files"
        ? await Promise.all(
            dataSource.files.map(async (file) => {
              const localSourceImpl = new McapIterableSource({ type: "file", file });
              this.#sourceImpl.push(localSourceImpl);
              return await localSourceImpl.initialize();
            }),
          )
        : await Promise.all(
            dataSource.urls.map(async (url) => {
              const localSourceImpl = new McapIterableSource({ type: "url", url });
              this.#sourceImpl.push(localSourceImpl);
              return await localSourceImpl.initialize();
            }),
          );

    // INITIATE MERGED INITIALIZATION OBJECT
    const mergedInitialization: Initalization = {
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

    const uniqueTopics: (arr: Topic[]) => Topic[] = (arr) =>
      Array.from(new Map<string, Topic>(arr.map((topic) => [topic.name, topic])).values());

    // console.log("GOLD initializations", initializations);

    // IMPROVE MERGING INITIALIZATION OBJECTS
    // measure processing time between current implementation and new one.
    for (const initialization of initializations) {
      mergedInitialization.start =
        compare(initialization.start, mergedInitialization.start) < 0
          ? initialization.start
          : mergedInitialization.start;
      mergedInitialization.end =
        compare(initialization.end, mergedInitialization.end) > 0
          ? initialization.end
          : mergedInitialization.end;

      // @ts-expect-error - 'Topic' interface not correct?
      mergedInitialization.topics = uniqueTopics([
        ...mergedInitialization.topics,
        ...initialization.topics,
      ]);
      /**
       * It's missing improve the topicStats processing.
       * The messages number(topicStats[x].value.numMessages) should be recalculated.
       */
      mergedInitialization.topicStats = new Map([
        ...mergedInitialization.topicStats,
        ...initialization.topicStats,
      ]);
      /**
       * In the future will be necessary validate the schemas(datatypes) once is
       * expected load multiple mcaps from different mcap origins.
       */
      mergedInitialization.datatypes = new Map([
        ...mergedInitialization.datatypes,
        ...initialization.datatypes,
      ]);
      mergedInitialization.profile = initialization.profile;
      mergedInitialization.name = initialization.name;
      mergedInitialization.metadata = [
        ...(mergedInitialization.metadata ?? []),
        ...(initialization.metadata ?? []),
      ];
      mergedInitialization.publishersByTopic = new Map([
        ...mergedInitialization.publishersByTopic,
        ...initialization.publishersByTopic,
      ]);
      mergedInitialization.problems = [
        ...mergedInitialization.problems,
        ...initialization.problems,
      ];
    }

    // Sort the sources by start time -> IT NEEDS TO HAPPEN
    this.#sourceImpl.sort((a, b) => compare(a.getStart!(), b.getStart!()));

    // console.log("GOLD mergedInitialization", mergedInitialization);
    return mergedInitialization;
  }

  public async *messageIterator(
    opt: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    for (const source of this.#sourceImpl) {
      for await (const message of source.messageIterator(opt)) {
        yield message;
      }
    }

    /**
     * Improve performance using promises to handle multiple iterators
     */
    // const iterators = this.#sourceImpl.map((source) => source.messageIterator(opt));
    // yield* mergeAsyncIterators(iterators);
  }

  public async getBackfillMessages(args: GetBackfillMessagesArgs): Promise<MessageEvent[]> {
    const backfillMessages = await Promise.all(
      this.#sourceImpl.map(async (source) => await source.getBackfillMessages(args)),
    );

    return backfillMessages.flat();
  }
}
