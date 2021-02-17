//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import Bag, { parseMessageDefinition } from "rosbag";

import { Connection } from "@foxglove-studio/app/dataProviders/types";
// @ts-expect-error flow import has 'any' type
import { Topic } from "@foxglove-studio/app/players/types";
import { RosDatatypes } from "@foxglove-studio/app/types/RosDatatypes";
import { objectValues } from "@foxglove-studio/app/util";

// TODO(JP): Move all this stuff into rosbag.

type DatatypeDescription = {
  messageDefinition: string;
  type: string;
};

// Extract one big list of datatypes from the individual connections.
export function bagConnectionsToDatatypes(
  connections: ReadonlyArray<DatatypeDescription>,
): RosDatatypes {
  const datatypes: Record<string, any> = {};
  connections.forEach((connection) => {
    const connectionTypes = parseMessageDefinition(connection.messageDefinition);
    connectionTypes.forEach(({ name, definitions }, index) => {
      // The first definition usually doesn't have an explicit name,
      // so we get the name from the connection.
      if (index === 0) {
        datatypes[connection.type] = { fields: definitions };
      } else if (name) {
        datatypes[name] = { fields: definitions };
      }
    });
  });
  return datatypes;
}

// Extract one big list of topics from the individual connections.
export function bagConnectionsToTopics(
  connections: ReadonlyArray<Connection>,
  chunkInfos: typeof Bag.prototype.chunkInfos,
): Topic[] {
  const numMessagesByConnectionIndex: number[] = new Array(connections.length).fill(0);
  chunkInfos.forEach((info) => {
    info.connections.forEach(({ conn, count }) => {
      numMessagesByConnectionIndex[conn] += count;
    });
  });
  // Use an object to deduplicate topics.
  const topics: {
    [key: string]: Topic;
  } = {};
  connections.forEach((connection, index) => {
    const existingTopic = topics[connection.topic];
    if (existingTopic && existingTopic.datatype !== connection.type) {
      console.warn("duplicate topic with differing datatype", existingTopic, connection);
      return;
    }
    topics[connection.topic] = {
      name: connection.topic,
      datatype: connection.type,
      numMessages: numMessagesByConnectionIndex[index],
    };
  });
  return objectValues(topics);
}
