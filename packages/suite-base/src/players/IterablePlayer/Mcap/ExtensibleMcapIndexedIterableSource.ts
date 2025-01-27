// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { McapIndexedReader } from "@mcap/core";

import { parseChannel } from "@lichtblick/mcap-support";
import { fromNanoSec } from "@lichtblick/rostime";
import { Metadata, Topic } from "@lichtblick/suite";
import { Initalization } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { McapIndexedIterableSource } from "@lichtblick/suite-base/players/IterablePlayer/Mcap/McapIndexedIterableSource";
import { TopicStats, PlayerProblem } from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

export class ExtensibleMcapIndexedIterableSource extends McapIndexedIterableSource {
  #readers: McapIndexedReader[];

  public constructor(initialReaders: McapIndexedReader[]) {
    super(initialReaders[0]!); // Inicializa a classe base com o primeiro leitor
    this.#readers = [...initialReaders];
  }

  /**
   * Adiciona um novo reader dinamicamente.
   * @param reader Novo McapIndexedReader a ser adicionado.
   */
  public addReader(reader: McapIndexedReader): void {
    this.#readers.push(reader);
  }

  /**
   * Inicializa todos os readers e combina os resultados.
   */
  public override async initialize(): Promise<Initalization> {
    let startTime: bigint | undefined;
    let endTime: bigint | undefined;
    const datatypes: RosDatatypes = new Map();
    const metadata: Metadata[] = [];
    const problems: PlayerProblem[] = [];
    const publishersByTopic = new Map<string, Set<string>>();
    const topics = new Map<string, Topic>();
    const topicStats = new Map<string, TopicStats>();

    for (const reader of this.#readers) {
      for (const chunk of reader.chunkIndexes) {
        if (startTime == undefined || chunk.messageStartTime < startTime) {
          startTime = chunk.messageStartTime;
        }
        if (endTime == undefined || chunk.messageEndTime > endTime) {
          endTime = chunk.messageEndTime;
        }
      }

      for (const channel of reader.channelsById.values()) {
        const schema = reader.schemasById.get(channel.schemaId);
        if (channel.schemaId !== 0 && !schema) {
          problems.push({
            severity: "error",
            message: `Missing schema info for schema id ${channel.schemaId} (channel ${channel.id}, topic ${channel.topic})`,
          });
          continue;
        }

        let parsedChannel;
        try {
          parsedChannel = parseChannel({ messageEncoding: channel.messageEncoding, schema });
        } catch (error) {
          problems.push({
            severity: "error",
            message: `Error in topic ${channel.topic} (channel ${channel.id}): ${(error as Error).message}`,
            error,
          });
          continue;
        }

        if (!topics.has(channel.topic)) {
          topics.set(channel.topic, {
            name: channel.topic,
            schemaName: schema?.name,
          } as Topic);
        }

        const numMessages = reader.statistics?.channelMessageCounts.get(channel.id);
        if (numMessages != undefined) {
          topicStats.set(channel.topic, { numMessages: Number(numMessages) });
        }

        const publisherId = channel.metadata.get("callerid") ?? String(channel.id);
        if (!publishersByTopic.has(channel.topic)) {
          publishersByTopic.set(channel.topic, new Set());
        }
        publishersByTopic.get(channel.topic)!.add(publisherId);

        for (const [name, datatype] of parsedChannel.datatypes) {
          datatypes.set(name, datatype);
        }
      }

      const metadataGenerator = reader.readMetadata();
      for await (const metadataEntry of metadataGenerator) {
        metadata.push({
          name: metadataEntry.name,
          metadata: Object.fromEntries(metadataEntry.metadata),
        });
      }
    }

    return {
      start: fromNanoSec(startTime ?? 0n),
      end: fromNanoSec(endTime ?? 0n),
      topics: Array.from(topics.values()),
      datatypes,
      profile: this.#readers[0]?.header?.profile,
      problems,
      metadata,
      publishersByTopic,
      topicStats,
    };
  }

  // /**
  //  * Retorna um iterador de mensagens combinado para todos os readers.
  //  */
  // public override async *messageIterator(
  //   args: MessageIteratorArgs,
  // ): AsyncIterableIterator<Readonly<IteratorResult<Readonly<MessageEvent>, void>>> {
  //   // Ajusta os tópicos para o formato esperado (readonly string[])
  //   const topicNames = Array.from(args.topics.keys());
  //   const readerArgs = { ...args, topics: topicNames };

  //   // Cria iteradores para todos os leitores
  //   const iterators = this.#readers.map((reader) => reader.readMessages(readerArgs));

  //   // Combina os iteradores e retorna as mensagens
  //   for await (const message of mergeAsyncIterators(iterators)) {
  //     yield message;
  //   }
  // }

  // /**
  //  * Recupera mensagens de backfill combinadas para todos os readers.
  //  */
  // public override async getBackfillMessages(
  //   args: GetBackfillMessagesArgs,
  // ): Promise<MessageEvent[]> {
  //   const messages = await Promise.all(
  //     this.#readers.map((reader) => reader.getBackfillMessages(args)),
  //   );
  //   return messages.flat().sort((a, b) => compare(a.receiveTime, b.receiveTime));
  // }
}
