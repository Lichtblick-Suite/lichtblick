// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { TopicAliasFunction, Immutable as Im, MessageEvent } from "@lichtblick/suite";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import {
  MessageBlock,
  PlayerProblem,
  PlayerState,
  Progress,
  SubscribePayload,
  Topic,
  TopicStats,
} from "@lichtblick/suite-base/players/types";
import * as _ from "lodash-es";
import memoizeWeak from "memoize-weak";

type TopicAliasMap = Map<string, string[]>;
type MessageBlocks = readonly (undefined | MessageBlock)[];
const EmptyAliasMap: Im<TopicAliasMap> = new Map();

export type TopicAliasFunctions = Array<{ extensionId: string; aliasFunction: TopicAliasFunction }>;

export type AliasingInputs = {
  aliasFunctions: TopicAliasFunctions;
  topics: undefined | Topic[];
  variables: GlobalVariables;
};

function aliasBlocks(blocks: MessageBlocks, mapping: Im<TopicAliasMap>): MessageBlocks {
  if (mapping === EmptyAliasMap) {
    return blocks;
  }

  return blocks.map((block) => {
    if (block == undefined) {
      return undefined;
    }

    return {
      ...block,
      messagesByTopic: _.transform(
        block.messagesByTopic,
        (acc, messages, topic) => {
          const mappings = mapping.get(topic);
          if (mappings) {
            for (const mappedTopic of mappings) {
              acc[mappedTopic] = messages.map((msg) => ({
                ...msg,
                topic: mappedTopic,
              }));
            }
          }
          acc[topic] = messages;
        },
        {} as Record<string, MessageEvent[]>,
      ),
    };
  });
}

function aliasMessages(
  messages: Im<MessageEvent[]>,
  mapping: Im<TopicAliasMap>,
): Im<MessageEvent[]> {
  if (mapping === EmptyAliasMap) {
    return messages;
  }

  const mappedMessages: MessageEvent[] = [];

  for (const msg of messages) {
    mappedMessages.push(msg);
    const mappings = mapping.get(msg.topic);
    if (mappings) {
      for (const topic of mappings) {
        mappedMessages.push({ ...msg, topic });
      }
    }
  }

  return mappedMessages;
}

function aliasPublishedTopics(
  topics: Map<string, Set<string>>,
  mapping: Im<TopicAliasMap>,
): Map<string, Set<string>> {
  if (mapping === EmptyAliasMap) {
    return topics;
  }

  const mappedTopics = new Map<string, Set<string>>();
  for (const [key, values] of topics) {
    const mappedValues = [...values].flatMap((value) => mapping.get(value) ?? value);
    mappedTopics.set(key, new Set([...values, ...mappedValues]));
  }
  return mappedTopics;
}

function aliasSubscribedTopics(
  topics: Map<string, Set<string>>,
  mapping: Im<TopicAliasMap>,
  subcriptions: Im<SubscribePayload[]>,
): Map<string, Set<string>> {
  if (mapping === EmptyAliasMap) {
    return topics;
  }

  const subscriptionsByTopic = _.groupBy(subcriptions, (sub) => sub.topic);
  const mappedTopics = new Map<string, Set<string>>();
  for (const [id, values] of topics) {
    const mappedValues = [...values].flatMap((value) => {
      // If we have a subscription to the unmapped topic, include that, otherwise include
      // the mapped topics.
      const mapped = mapping.get(value);
      if (subscriptionsByTopic[value]) {
        return [value, ...(mapped ?? [])];
      } else if (mapped) {
        return mapped;
      } else {
        return value;
      }
    });
    mappedTopics.set(id, new Set(mappedValues));
  }
  return mappedTopics;
}

function aliasProgress(progress: Progress, mapping: Im<TopicAliasMap>): Progress {
  if (mapping === EmptyAliasMap || progress.messageCache == undefined) {
    return progress;
  }
  const newProgress: Progress = {
    ...progress,
    messageCache: {
      ...progress.messageCache,
      blocks: memos.aliasBlocks(progress.messageCache.blocks, mapping),
    },
  };
  return newProgress;
}

function aliasTopics(topics: Topic[], mapping: Im<TopicAliasMap>): Topic[] {
  if (mapping === EmptyAliasMap) {
    return topics;
  }

  return topics.flatMap((topic) => {
    const mappings = mapping.get(topic.name);
    if (mappings) {
      return [
        topic,
        ...mappings.map((name) => ({
          ...topic,
          name,
          aliasedFromName: topic.name,
        })),
      ];
    } else {
      return topic;
    }
  });
}

function aliasTopicStats(
  stats: Map<string, TopicStats>,
  mapping: Im<TopicAliasMap>,
): Map<string, TopicStats> {
  if (mapping === EmptyAliasMap) {
    return stats;
  }

  const mappedStats = new Map<string, TopicStats>();

  for (const [topic, stat] of stats) {
    mappedStats.set(topic, stat);
    const mappings = mapping.get(topic);
    if (mappings) {
      for (const mappedTopic of mappings) {
        mappedStats.set(mappedTopic, stat);
      }
    }
  }

  return mappedStats;
}

// Merges multiple aliases into a single unified alias map. Note that a single topic name
// can alias to more than one renamed topic if multiple extensions provide an alias for it.
// Also returns any problems caused by disallowed aliases.
function mergeAliases(
  maps: Im<{ extensionId: string; aliases: ReturnType<TopicAliasFunction> }[]>,
  inputs: Im<AliasingInputs>,
): {
  aliasMap: TopicAliasMap;
  problems: undefined | PlayerProblem[];
} {
  const inverseMapping = new Map<string, string>();
  const problems: PlayerProblem[] = [];
  const merged: TopicAliasMap = new Map();
  const topics = inputs.topics ?? [];
  for (const { extensionId, aliases } of maps) {
    for (const { name, sourceTopicName } of aliases) {
      const existingMapping = inverseMapping.get(name);
      if (topics.some((topic) => topic.name === name)) {
        problems.push({
          severity: "error",
          message: `Disallowed topic alias`,
          tip: `Extension ${extensionId} aliased topic ${name} is already present in the data source.`,
        });
      } else if (existingMapping != undefined && existingMapping !== sourceTopicName) {
        problems.push({
          severity: "error",
          message: `Disallowed topic alias`,
          tip: `Extension ${extensionId} requested duplicate alias from topic ${sourceTopicName} to topic ${name}.`,
        });
      } else {
        inverseMapping.set(name, sourceTopicName);
        const mergedValues = _.uniq(merged.get(sourceTopicName) ?? []).concat(name);
        merged.set(sourceTopicName, mergedValues);
      }
    }
  }
  return { aliasMap: merged, problems: problems.length > 0 ? problems : undefined };
}

// Applies our topic mappers to the input topics to generate an active set of name =>
// renamed topic mappings.
function buildAliases(inputs: Im<AliasingInputs>): {
  aliasMap: Im<TopicAliasMap>;
  problems: undefined | PlayerProblem[];
} {
  const mappings = inputs.aliasFunctions.map((mapper) => ({
    extensionId: mapper.extensionId,
    aliases: mapper.aliasFunction({
      topics: inputs.topics ?? [],
      globalVariables: inputs.variables,
    }),
  }));
  const anyMappings = mappings.some((map) => [...map.aliases].length > 0);
  return anyMappings
    ? mergeAliases(mappings, inputs)
    : { aliasMap: EmptyAliasMap, problems: undefined };
}

// Memoize our mapping functions to avoid redundant work and also to preserve downstream
// referential transparency for React components.
const memos = {
  buildAliases: memoizeWeak(buildAliases),
  aliasBlocks: memoizeWeak(aliasBlocks),
  aliasMessages: memoizeWeak(aliasMessages),
  aliasProgress: memoizeWeak(aliasProgress),
  aliasPublishedTopics: memoizeWeak(aliasPublishedTopics),
  aliasSubscribedTopics: memoizeWeak(aliasSubscribedTopics),
  aliasTopics: memoizeWeak(aliasTopics),
  aliasTopicStats: memoizeWeak(aliasTopicStats),
};

/**
 * Aliases topics in a player state to a new player state with all topic name aliases
 * applied.
 *
 * @param inputs the inputs to the alias function
 * @param playerState the player state containing topics to alias
 * @returns a player state with all aliased topic names replaced with their aliased value.
 */
export function aliasPlayerState(
  inputs: Im<AliasingInputs>,
  subscriptions: Im<SubscribePayload[]>,
  playerState: PlayerState,
): PlayerState {
  const newState = {
    ...playerState,
    activeData: playerState.activeData ? { ...playerState.activeData } : undefined,
  };

  const { aliasMap: mapping, problems } = memos.buildAliases(inputs);

  if (newState.activeData) {
    newState.activeData.topics = memos.aliasTopics(newState.activeData.topics, mapping);
    newState.activeData.messages = memos.aliasMessages(newState.activeData.messages, mapping);
    if (newState.activeData.publishedTopics) {
      newState.activeData.publishedTopics = memos.aliasPublishedTopics(
        newState.activeData.publishedTopics,
        mapping,
      );
    }
    if (newState.activeData.subscribedTopics) {
      newState.activeData.subscribedTopics = memos.aliasSubscribedTopics(
        newState.activeData.subscribedTopics,
        mapping,
        subscriptions,
      );
    }

    newState.activeData.topicStats = memos.aliasTopicStats(newState.activeData.topicStats, mapping);
  }

  if (newState.progress.messageCache) {
    newState.progress = memos.aliasProgress(newState.progress, mapping);
  }

  if (problems != undefined) {
    newState.problems = (newState.problems ?? []).concat(problems);
  }

  return newState;
}
