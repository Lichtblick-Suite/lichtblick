// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { compare } from "@lichtblick/rostime";
import {
  InitLoadedTimes,
  IterableSourceConstructor,
  MultiSource,
} from "@lichtblick/suite-base/players/IterablePlayer/shared/types";
import { mergeAsyncIterators } from "@lichtblick/suite-base/players/IterablePlayer/shared/utils/mergeAsyncIterators";
import {
  accumulateMap,
  mergeMetadata,
  mergeTopicStats,
  setEndTime,
  setStartTime,
} from "@lichtblick/suite-base/players/IterablePlayer/shared/utils/mergeInitialization";
import {
  validateAndAddNewTopics,
  validateAndAddNewDatatypes,
  validateOverlap,
} from "@lichtblick/suite-base/players/IterablePlayer/shared/utils/validateInitialization";
import { MessageEvent, TopicStats } from "@lichtblick/suite-base/players/types";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

import {
  IIterableSource,
  IteratorResult,
  Initalization,
  MessageIteratorArgs,
  GetBackfillMessagesArgs,
} from "../IIterableSource";

export class MultiIterableSource<T extends IIterableSource, P> implements IIterableSource {
  private SourceConstructor: IterableSourceConstructor<T, P>;
  private dataSource: MultiSource;
  private sourceImpl: IIterableSource[] = [];

  public constructor(dataSource: MultiSource, SourceConstructor: IterableSourceConstructor<T, P>) {
    this.dataSource = dataSource;
    this.SourceConstructor = SourceConstructor;
  }

  private async loadMultipleSources(): Promise<Initalization[]> {
    const { type } = this.dataSource;

    const sources: IIterableSource[] =
      type === "files"
        ? this.dataSource.files.map(
            (file) => new this.SourceConstructor({ type: "file", file } as P),
          )
        : this.dataSource.urls.map((url) => new this.SourceConstructor({ type: "url", url } as P));

    this.sourceImpl = [...this.sourceImpl, ...sources];

    const initializations: Initalization[] = await Promise.all(
      sources.map(async (source) => await source.initialize()),
    );

    return initializations;
  }

  public async initialize(): Promise<Initalization> {
    const initializations: Initalization[] = await this.loadMultipleSources();

    const resultInit: Initalization = this.mergeInitializations(initializations);

    this.sourceImpl.sort((a, b) => compare(a.getStart!()!, b.getStart!()!));

    return resultInit;
  }

  public async *messageIterator(
    opt: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    const iterators = this.sourceImpl.map((source) => source.messageIterator(opt));
    yield* mergeAsyncIterators(iterators);
  }

  public async getBackfillMessages(args: GetBackfillMessagesArgs): Promise<MessageEvent[]> {
    const backfillMessages = await Promise.all(
      this.sourceImpl.map(async (source) => await source.getBackfillMessages(args)),
    );

    return backfillMessages.flat();
  }

  private mergeInitializations(initializations: Initalization[]): Initalization {
    const resultInit: Initalization = {
      start: { sec: Number.MAX_SAFE_INTEGER, nsec: Number.MAX_SAFE_INTEGER },
      end: { sec: Number.MIN_SAFE_INTEGER, nsec: Number.MIN_SAFE_INTEGER },
      datatypes: new Map<string, OptionalMessageDefinition>(),
      metadata: [],
      name: "",
      problems: [],
      profile: "",
      publishersByTopic: new Map<string, Set<string>>(),
      topics: [],
      topicStats: new Map<string, TopicStats>(),
    };

    const loadedTimes: InitLoadedTimes = [];

    initializations[0]!.topics.push({ name: "teste", schemaName: "testeA" });
    initializations[1]!.topics.push({ name: "teste", schemaName: "testeB" });

    initializations[0]!.datatypes.set("Test", {
      definitions: [{ name: "field1", type: "string" }],
    });
    initializations[1]!.datatypes.set("Test", { definitions: [{ name: "field1", type: "int64" }] });

    for (const init of initializations) {
      // Validate and merge time ranges
      resultInit.start = setStartTime(resultInit.start, init.start);
      resultInit.end = setEndTime(resultInit.end, init.end);
      validateOverlap(loadedTimes, init, resultInit);
      loadedTimes.push({ start: init.start, end: init.end });

      // These validations validate and merge data, in order to avoid multiple loops
      validateAndAddNewDatatypes(resultInit, init);
      validateAndAddNewTopics(resultInit, init);

      // Merge rest of the data
      resultInit.name ??= init.name;
      resultInit.profile ??= init.profile;
      resultInit.publishersByTopic = accumulateMap(
        resultInit.publishersByTopic,
        init.publishersByTopic,
      );
      resultInit.topicStats = mergeTopicStats(resultInit.topicStats, init.topicStats);
      resultInit.metadata = mergeMetadata(resultInit.metadata, init.metadata);
      resultInit.problems.push(...init.problems);
    }

    return resultInit;
  }
}
