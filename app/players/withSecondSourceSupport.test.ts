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
import { withSecondSourceSupport } from "@foxglove-studio/app/players/withSecondSourceSupport";
import { SECOND_SOURCE_PREFIX } from "@foxglove-studio/app/util/globalConstants";
import { addTopicPrefix, joinTopics } from "@foxglove-studio/app/util/topicUtils";

describe("withSecondSourceSupport", () => {
  it("returns a nodeDefinition that works with SECOND_SOURCE_PREFIX'd topics", () => {
    const message = {
      topic: "/webviz/abc",
      message: {},
      receiveTime: { sec: 0, nsec: 0 },
    };
    const nodeDefinition: NodeDefinition<any> = {
      callback: () => ({
        messages: [message],
        state: {},
      }),
      defaultState: {},
      inputs: ["/foo", "/bar"],
      output: { name: "/baz", datatype: "datatype" },
      datatypes: {},
      format: "parsedMessages",
    };

    const secondSourceNodeDefinition = withSecondSourceSupport(nodeDefinition);
    expect(secondSourceNodeDefinition).toEqual(
      expect.objectContaining({
        callback: expect.any(Function),
        defaultState: {},
        inputs: addTopicPrefix(nodeDefinition.inputs, SECOND_SOURCE_PREFIX),
        output: { name: joinTopics(SECOND_SOURCE_PREFIX, "/baz"), datatype: "datatype" },
        datatypes: {},
      }),
    );
    expect(
      secondSourceNodeDefinition.callback({
        message: {
          topic: joinTopics(SECOND_SOURCE_PREFIX, "/webviz/abc"),
          message: {},
          receiveTime: { sec: 0, nsec: 0 },
        },
        state: {},
      }),
    ).toEqual(
      expect.objectContaining({
        messages: [
          {
            topic: joinTopics(SECOND_SOURCE_PREFIX, message.topic),
            message: {},
            receiveTime: { sec: 0, nsec: 0 },
          },
        ],
        state: {},
      }),
    );
  });
});
