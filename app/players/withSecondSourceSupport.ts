// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { NodeDefinition } from "@foxglove-studio/app/players/nodes";
import { SECOND_SOURCE_PREFIX } from "@foxglove-studio/app/util/globalConstants";
import { joinTopics, addTopicPrefix } from "@foxglove-studio/app/util/topicUtils";

export function withSecondSourceSupport(nodeDef: NodeDefinition<any>): NodeDefinition<any> {
  return {
    ...nodeDef,
    inputs: addTopicPrefix(nodeDef.inputs, SECOND_SOURCE_PREFIX),
    output: {
      ...nodeDef.output,
      name: joinTopics(SECOND_SOURCE_PREFIX, nodeDef.output.name),
    },
    callback: ({ message, state }) => {
      const messageWithoutSecondPrefix = {
        ...message,
        topic: message.topic.replace(SECOND_SOURCE_PREFIX, ""),
      };
      const result = nodeDef.callback({ message: messageWithoutSecondPrefix, state });
      return {
        state: result.state,
        messages: result.messages.map((_message) => {
          return {
            ..._message,
            topic: joinTopics(SECOND_SOURCE_PREFIX, _message.topic),
          };
        }),
      };
    },
  };
}
