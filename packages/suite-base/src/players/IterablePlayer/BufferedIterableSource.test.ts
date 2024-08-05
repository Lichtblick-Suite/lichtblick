// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { mockTopicSelection } from "@lichtblick/suite-base/test/mocks/mockTopicSelection";
import * as _ from "lodash-es";

import { BufferedIterableSource } from "./BufferedIterableSource";
import {
  GetBackfillMessagesArgs,
  IIterableSource,
  Initalization,
  IteratorResult,
  MessageIteratorArgs,
} from "./IIterableSource";

function waiter(count: number) {
  let resolver: () => void;

  let notificationSignal = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  return {
    wait: async () => {
      for (let i = 0; i < count; ++i) {
        await notificationSignal;
        // eslint-disable-next-line no-loop-func
        notificationSignal = new Promise<void>((resolve) => {
          resolver = resolve;
        });
      }
    },
    notify: () => {
      resolver();
    },
  };
}

class TestSource implements IIterableSource {
  public async initialize(): Promise<Initalization> {
    return {
      start: { sec: 0, nsec: 0 },
      end: { sec: 10, nsec: 0 },
      topics: [],
      topicStats: new Map(),
      profile: undefined,
      problems: [],
      datatypes: new Map(),
      publishersByTopic: new Map(),
    };
  }

  public async *messageIterator(
    _args: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {}

  public async getBackfillMessages(_args: GetBackfillMessagesArgs): Promise<MessageEvent[]> {
    return [];
  }
}

describe("BufferedIterableSource", () => {
  it("should construct and initialize", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0 }]);
  });

  it("should produce messages that the source produces", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();

    source.messageIterator = async function* messageIterator(
      _args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      for (let i = 0; i < 8; ++i) {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    // confirm messages are what we expect
    for (let i = 0; i < 8; ++i) {
      const iterResult = messageIterator.next();
      await expect(iterResult).resolves.toEqual({
        done: false,
        value: {
          type: "message-event",
          msgEvent: {
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            topic: "a",
            schemaName: "foo",
          },
        },
      });
    }

    // The message iterator should be done since we have no more data to read from the source
    const iterResult = messageIterator.next();
    await expect(iterResult).resolves.toEqual({
      done: true,
    });

    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 1 }]);
  });

  it("should produce messages after buffering is complete", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();

    let count = 0;
    const signal = waiter(1);

    source.messageIterator = async function* messageIterator(
      _args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      count += 1;

      for (let i = 0; i < 8; ++i) {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
      signal.notify();
    };

    {
      const messageIterator = bufferedSource.messageIterator({
        topics: mockTopicSelection("a"),
      });

      // confirm messages are what we expect
      for (let i = 0; i < 8; ++i) {
        const iterResult = messageIterator.next();
        await expect(iterResult).resolves.toEqual({
          done: false,
          value: {
            type: "message-event",
            msgEvent: {
              receiveTime: { sec: i, nsec: 0 },
              message: undefined,
              sizeInBytes: 0,
              topic: "a",
              schemaName: "foo",
            },
          },
        });
      }

      // The message iterator should be done since we have no more data to read from the source
      const iterResult = messageIterator.next();
      await expect(iterResult).resolves.toEqual({
        done: true,
      });
    }

    expect(count).toEqual(1);
  });

  it("should indicate loaded ranges are done even when last message is before end", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();

    const signal = waiter(1);

    source.messageIterator = async function* messageIterator(
      _args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      for (let i = 0; i < 8; ++i) {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
      signal.notify();
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    await signal.wait();

    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 1 }]);

    // confirm messages are what we expect
    for (let i = 0; i < 8; ++i) {
      const iterResult = messageIterator.next();
      await expect(iterResult).resolves.toEqual({
        done: false,
        value: {
          type: "message-event",
          msgEvent: {
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            topic: "a",
            schemaName: "foo",
          },
        },
      });
    }

    // The message iterator should be done since we have no more data to read from the source
    const iterResult = messageIterator.next();
    await expect(iterResult).resolves.toEqual({
      done: true,
    });
  });

  it("should indicate loading ranges when partially buffered", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();

    const partialBuffer = waiter(6);
    const doneYield = waiter(1);

    source.messageIterator = async function* messageIterator(
      _args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      for (let i = 0; i < 8; ++i) {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
        partialBuffer.notify();
      }
      doneYield.notify();
    };

    bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    await partialBuffer.wait();

    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.4999999999 }]);

    // When the underlying source has finished loading, the _end_ is reached even if the last message is not at the end time
    await doneYield.wait();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 1 }]);
  });

  it("should yield correct messages when starting a new iterator before the the cached items", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source);

    await bufferedSource.initialize();

    {
      const doneYield = waiter(1);

      source.messageIterator = async function* messageIterator(
        _args: MessageIteratorArgs,
      ): AsyncIterableIterator<Readonly<IteratorResult>> {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: 5, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
        doneYield.notify();
      };

      const messageIterator = bufferedSource.messageIterator({
        topics: mockTopicSelection("a"),
        start: { sec: 5, nsec: 0 },
      });

      await doneYield.wait();
      expect(bufferedSource.loadedRanges()).toEqual([{ start: 0.5, end: 1 }]);
      await messageIterator.return?.();
      await bufferedSource.stopProducer();
    }

    // A new message iterator at the start time should properly a new message then the other messages
    {
      const doneYield = waiter(1);

      source.messageIterator = async function* messageIterator(
        _args: MessageIteratorArgs,
      ): AsyncIterableIterator<Readonly<IteratorResult>> {
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: 1, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
        doneYield.notify();
      };

      const messageIterator = bufferedSource.messageIterator({
        topics: mockTopicSelection("a"),
        start: { sec: 0, nsec: 0 },
      });

      await doneYield.wait();

      expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 1 }]);

      {
        {
          const iterResult = messageIterator.next();
          await expect(iterResult).resolves.toEqual({
            done: false,
            value: {
              type: "message-event",
              msgEvent: {
                receiveTime: { sec: 1, nsec: 0 },
                message: undefined,
                sizeInBytes: 0,
                topic: "a",
                schemaName: "foo",
              },
            },
          });
        }

        {
          const iterResult = messageIterator.next();
          await expect(iterResult).resolves.toEqual({
            done: false,
            value: {
              type: "message-event",
              msgEvent: {
                receiveTime: { sec: 5, nsec: 0 },
                message: undefined,
                sizeInBytes: 0,
                topic: "a",
                schemaName: "foo",
              },
            },
          });
        }
      }

      {
        const iterResult = messageIterator.next();
        await expect(iterResult).resolves.toEqual({
          done: true,
        });
      }
    }
  });

  it("should wait to buffer more messages until reading moves forward", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source, {
      readAheadDuration: { sec: 1, nsec: 0 },
      minReadAheadDuration: { sec: 0, nsec: 0 },
    });

    await bufferedSource.initialize();

    let signal = waiter(1);

    const debounceNotify = _.debounce(() => {
      signal.notify();
    }, 500);

    let messageIteratorCount = 0;
    source.messageIterator = async function* messageIterator(
      args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      expect(args).toEqual({
        topics: mockTopicSelection("a"),
        start: { sec: 0, nsec: 0 },
        end: { sec: 10, nsec: 0 },
        consumptionType: "partial",
      });
      messageIteratorCount += 1;

      for (let i = 0; i < 8; ++i) {
        debounceNotify();
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    // Reading the first message buffers some data
    await messageIterator.next();

    // Wait for the buffered iterable source to stop reading messages
    await signal.wait();

    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.1999999999 }]);

    // Reading the second message buffers more data
    signal = waiter(1);
    await messageIterator.next();
    await signal.wait();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.2999999999 }]);

    // We should have called the messageIterator method only once
    expect(messageIteratorCount).toEqual(1);
  });

  it("should buffer minimum duration ahead before messages can be read", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source, {
      readAheadDuration: { sec: 3, nsec: 0 },
      minReadAheadDuration: { sec: 2, nsec: 0 },
    });

    await bufferedSource.initialize();

    const signal = waiter(1);

    const debounceNotify = _.debounce(() => {
      signal.notify();
    }, 500);

    let messageIteratorCount = 0;
    source.messageIterator = async function* messageIterator(
      args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      expect(args).toEqual({
        topics: mockTopicSelection("a"),
        start: { sec: 0, nsec: 0 },
        end: { sec: 10, nsec: 0 },
        consumptionType: "partial",
      });
      messageIteratorCount += 1;

      for (let i = 0; i < 8; ++i) {
        debounceNotify();
        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    // Reading the first message should buffer a minimum amount
    await messageIterator.next();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.2999999999 }]);
    // Reading the next message should not increase the buffer
    await messageIterator.next();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.2999999999 }]);
    // Next message should increase the buffer again
    await messageIterator.next();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.3999999999 }]);
    // Let the buffer read to the end
    await signal.wait();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.5999999999 }]);

    // We should have called the messageIterator method only once
    expect(messageIteratorCount).toEqual(1);
  });

  it("should adjust buffer position when reading while buffering", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source, {
      readAheadDuration: { sec: 1, nsec: 0 },
    });

    await bufferedSource.initialize();

    let count = 0;
    const signal = waiter(1);

    source.messageIterator = async function* messageIterator(
      _args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      for (let i = 0; i < 8; ++i) {
        count += 1;
        if (count === 4) {
          signal.notify();
        }

        yield {
          type: "message-event",
          msgEvent: {
            topic: "a",
            receiveTime: { sec: i, nsec: 0 },
            message: undefined,
            sizeInBytes: 0,
            schemaName: "foo",
          },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    {
      // read the first message { sec: 0, nsec: 0 }
      const iterResult = messageIterator.next();
      void iterResult;
    }

    {
      // read message { sec: 1, nsec: 0 }, which should set the read head to { sec: 2, nsec: 0 }
      const iterResult = messageIterator.next();
      void iterResult;
    }

    await signal.wait();
    expect(count).toEqual(4);
  });

  it("should support stamp iterator results and wait to buffer more messages until reading moves forward", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source, {
      readAheadDuration: { sec: 1, nsec: 0 },
    });

    await bufferedSource.initialize();

    let signal = waiter(1);

    const debounceNotify = _.debounce(() => {
      signal.notify();
    }, 500);

    let messageIteratorCount = 0;
    source.messageIterator = async function* messageIterator(
      args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      expect(args).toEqual({
        topics: mockTopicSelection("a"),
        start: { sec: 0, nsec: 0 },
        end: { sec: 10, nsec: 0 },
        consumptionType: "partial",
      });
      messageIteratorCount += 1;

      for (let i = 0; i < 8; ++i) {
        debounceNotify();
        yield {
          type: "stamp",
          stamp: { sec: i, nsec: 0 },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    // Reading the first message buffers some data
    await messageIterator.next();

    // Wait for the buffered iterable source to stop reading messages
    await signal.wait();

    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.0999999999 }]);

    // Reading the second message buffers more data
    signal = waiter(1);
    await messageIterator.next();
    await signal.wait();
    expect(bufferedSource.loadedRanges()).toEqual([{ start: 0, end: 0.1999999999 }]);

    // We should have called the messageIterator method only once
    expect(messageIteratorCount).toEqual(1);
  });

  it("should exit producer when waiting for readhead to move past stamp", async () => {
    const source = new TestSource();
    const bufferedSource = new BufferedIterableSource(source, {
      readAheadDuration: { sec: 1, nsec: 0 },
    });

    await bufferedSource.initialize();

    const signal = waiter(1);

    const debounceNotify = _.debounce(() => {
      signal.notify();
    }, 500);

    let messageIteratorCount = 0;
    source.messageIterator = async function* messageIterator(
      args: MessageIteratorArgs,
    ): AsyncIterableIterator<Readonly<IteratorResult>> {
      expect(args).toEqual({
        topics: mockTopicSelection("a"),
        start: { sec: 0, nsec: 0 },
        end: { sec: 10, nsec: 0 },
        consumptionType: "partial",
      });
      messageIteratorCount += 1;

      for (let i = 0; i < 8; ++i) {
        debounceNotify();
        yield {
          type: "stamp",
          stamp: { sec: i, nsec: 0 },
        };
      }
    };

    const messageIterator = bufferedSource.messageIterator({
      topics: mockTopicSelection("a"),
    });

    // Reading the first message buffers some data
    await messageIterator.next();

    // Wait for the buffered iterable source to stop reading messages
    await signal.wait();
    expect(messageIteratorCount).toEqual(1);

    // Exit the message iterator which will request a stop to the producer thread for the buffered source
    await messageIterator.return?.();
    expect(messageIteratorCount).toEqual(1);
  });
});
