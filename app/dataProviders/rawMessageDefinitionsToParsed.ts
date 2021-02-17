//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { fromPairs, uniq } from "lodash";

import { MessageDefinitions, ParsedMessageDefinitions } from "./types";
// @ts-expect-error flow imports have any type
import { Topic, ParsedMessageDefinitionsByTopic } from "@foxglove-studio/app/players/types";
import { RosDatatypes } from "@foxglove-studio/app/types/RosDatatypes";
import parseMessageDefinitionsCache from "@foxglove-studio/app/util/parseMessageDefinitionsCache";

// Extract one big list of datatypes from the individual connections.
function parsedMessageDefinitionsToDatatypes(
  parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic,
  topics: Topic[],
): RosDatatypes {
  const topLevelDatatypeNames: string[] = uniq(topics.map(({ datatype }) => datatype));
  // many topics can have the same datatype, but that shouldn't matter here - we just want any topic.
  const topicNameByDatatypeName: {
    [key: string]: string;
  } = fromPairs(topics.map(({ name, datatype }) => [datatype, name]));
  const datatypes: RosDatatypes = {};
  topLevelDatatypeNames.forEach((datatypeName) => {
    const topicName = topicNameByDatatypeName[datatypeName];
    const parsedMessageDefinition = parsedMessageDefinitionsByTopic[topicName];
    // @ts-expect-error when we have types for ParsedMessageDefinitionsByTopic this will resolve
    parsedMessageDefinition.forEach(({ name, definitions }, index) => {
      // The first definition usually doesn't have an explicit name,
      // so we get the name from the datatype.
      if (index === 0) {
        datatypes[datatypeName] = { fields: definitions };
      } else if (name) {
        datatypes[name] = { fields: definitions };
      }
    });
  });
  return datatypes;
}

export default function rawMessageDefinitionsToParsed(
  messageDefinitions: MessageDefinitions,
  topics: Topic[],
): ParsedMessageDefinitions {
  if (messageDefinitions.type === "parsed") {
    return messageDefinitions;
  }
  const parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic = {};
  for (const topic of Object.keys(messageDefinitions.messageDefinitionsByTopic)) {
    const messageDefinition = messageDefinitions.messageDefinitionsByTopic[topic];
    const md5 = messageDefinitions.messageDefinitionMd5SumByTopic?.[topic];
    parsedMessageDefinitionsByTopic[topic] = parseMessageDefinitionsCache.parseMessageDefinition(
      messageDefinition,
      md5,
    );
  }
  return {
    type: "parsed",
    messageDefinitionsByTopic: messageDefinitions.messageDefinitionsByTopic,
    datatypes: parsedMessageDefinitionsToDatatypes(parsedMessageDefinitionsByTopic, topics),
    parsedMessageDefinitionsByTopic,
  };
}
