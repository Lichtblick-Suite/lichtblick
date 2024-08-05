// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { signal } from "@lichtblick/den/async";
import NoopMetricsCollector from "@lichtblick/suite-base/players/NoopMetricsCollector";
import RosbridgePlayer from "@lichtblick/suite-base/players/RosbridgePlayer";

import { Time } from "@foxglove/rostime";

const headerMessage = ({
  seq,
  stamp: { sec, nsec },
  frame_id,
}: {
  seq: number;
  stamp: Time;
  frame_id: string;
}) => {
  const bytes = Buffer.alloc(16 + frame_id.length);
  bytes.writeUInt32LE(seq, 0);
  bytes.writeUInt32LE(sec, 4);
  bytes.writeUInt32LE(nsec, 8);
  bytes.writeUInt32LE(frame_id.length, 12);
  bytes.write(frame_id, 16);
  return { bytes };
};

const textMessage = ({ text }: { text: string }) => {
  const bytes = Buffer.alloc(4 + text.length);
  bytes.writeUInt32LE(text.length, 0);
  bytes.write(text, 4);
  return { bytes };
};

let workerInstance: MockRosClient;
class MockRosClient {
  public constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    workerInstance = this;
  }

  #topics: string[] = [];
  #types: string[] = [];
  #typedefs_full_text: string[] = [];
  #connectCallback?: () => void;
  #messages: any[] = [];

  public setup({
    topics = [],
    types = [],
    typedefs = [],
    messages = [],
  }: {
    topics?: string[];
    types?: string[];
    typedefs?: string[];
    messages?: any[];
  }) {
    this.#topics = topics;
    this.#types = types;
    this.#typedefs_full_text = typedefs;
    this.#messages = messages;

    this.#connectCallback?.();
  }

  public on(op: string, callback: () => void) {
    if (op === "connection") {
      this.#connectCallback = callback;
    }
  }

  public close() {
    // no-op
  }

  public getTopicsAndRawTypes(callback: (...args: unknown[]) => void) {
    callback({
      topics: this.#topics,
      types: this.#types,
      typedefs_full_text: this.#typedefs_full_text,
    });
  }

  public getMessagesByTopicName(topicName: string): { message: unknown }[] {
    return this.#messages.filter(({ topic }) => topic === topicName);
  }

  public getNodes(callback: (nodes: string[]) => void, _errCb: (error: Error) => void) {
    callback([]);
  }

  public getNodeDetails(
    _node: string,
    callback: (subscriptions: string[], publications: string[], services: string[]) => void,
    _errCb: (error: Error) => void,
  ) {
    callback([], [], []);
  }
}

class MockRosTopic {
  #name: string = "";

  public constructor({ name }: { name: string }) {
    this.#name = name;
  }

  public subscribe(callback: (arg: unknown) => void) {
    workerInstance.getMessagesByTopicName(this.#name).forEach(({ message }) => {
      callback(message);
    });
  }
}

jest.mock("@foxglove/roslibjs", () => {
  return {
    __esModule: true,
    default: {
      Ros: function Ros() {
        return new MockRosClient();
      },
      Topic: function Topic(arg: { name: string }) {
        return new MockRosTopic(arg);
      },
    },
  };
});

describe("RosbridgePlayer", () => {
  let player: RosbridgePlayer;

  beforeEach(() => {
    player = new RosbridgePlayer({
      url: "ws://some-url",
      metricsCollector: new NoopMetricsCollector(),
      sourceId: "rosbridge-websocket",
    });
  });

  afterEach(() => {
    player.close();
  });

  it("subscribes to topics without errors", async () => {
    workerInstance.setup({
      topics: ["/topic/A"],
      types: ["/std_msgs/Header", "rosgraph_msgs/Log"],
      typedefs: [
        `std_msgs/Header header

      ================================================================================
      MSG: std_msgs/Header
      uint32 seq
      time stamp
      string frame_id`,
      ],
    });

    const sig = signal();
    player.setSubscriptions([{ topic: "/topic/A" }]);
    player.setListener(async ({ activeData }) => {
      const { topics } = activeData ?? {};
      if (!topics) {
        return;
      }

      expect(topics).toStrictEqual<typeof topics>([
        { name: "/topic/A", schemaName: "/std_msgs/Header" },
      ]);
      sig.resolve();
    });

    await sig;
  });

  describe("parsedMessages", () => {
    beforeEach(() => {
      workerInstance.setup({
        topics: ["/topic/A", "/topic/B"],
        types: ["/std_msgs/Header", "text", "rosgraph_msgs/Log"],
        typedefs: [
          `std_msgs/Header header

            ================================================================================
            MSG: std_msgs/Header
            uint32 seq
            time stamp
            string frame_id`,
          `string text`,
        ],
        messages: [
          {
            topic: "/topic/A",
            receiveTime: { sec: 100, nsec: 0 },
            message: headerMessage({
              seq: 7643,
              stamp: { sec: 1234, nsec: 5678 },
              frame_id: "someFrameId",
            }),
          },
          {
            topic: "/topic/B",
            receiveTime: { sec: 100, nsec: 0 },
            message: textMessage({ text: "some text" }),
          },
        ],
      });
    });

    it("returns parsedMessages with complex type", async () => {
      player.setSubscriptions([{ topic: "/topic/A" }]);

      const sig = signal();
      player.setListener(async ({ activeData }) => {
        const { messages } = activeData ?? {};
        if (!messages) {
          return;
        }

        expect(messages.length).toBe(1);
        expect(messages[0]?.message).toMatchObject({
          header: {
            seq: 7643,
            stamp: { sec: 1234, nsec: 5678 },
            frame_id: "someFrameId",
          },
        });

        sig.resolve();
      });
      await sig;
    });

    it("returns parsedMessages with basic types", async () => {
      player.setSubscriptions([{ topic: "/topic/B" }]);

      const sig = signal();
      player.setListener(async ({ activeData }) => {
        const { messages } = activeData ?? {};
        if (!messages) {
          return;
        }

        expect(messages.length).toBe(1);
        expect(messages[0]?.message).toMatchObject({
          text: "some text",
        });

        sig.resolve();
      });
      await sig;
    });
  });
});
