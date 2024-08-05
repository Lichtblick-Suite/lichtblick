/** @jest-environment jsdom */
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

import { MessagePipelineProvider } from "@lichtblick/suite-base/components/MessagePipeline";
import FakePlayer from "@lichtblick/suite-base/components/MessagePipeline/FakePlayer";
import MockMessagePipelineProvider from "@lichtblick/suite-base/components/MessagePipeline/MockMessagePipelineProvider";
import AppConfigurationContext from "@lichtblick/suite-base/context/AppConfigurationContext";
import {
  Player,
  PlayerStateActiveData,
  Topic,
  MessageEvent,
} from "@lichtblick/suite-base/players/types";
import MockCurrentLayoutProvider from "@lichtblick/suite-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";
import { makeMockAppConfiguration } from "@lichtblick/suite-base/util/makeMockAppConfiguration";
import { renderHook, act } from "@testing-library/react";
import { PropsWithChildren, useState } from "react";

import * as PanelAPI from ".";

// MockMessagePipeline initial restore call arguments from initial, then backfill seek after getting subscriptions for initial messages
const initialRestoreCallArguments = [[undefined], [undefined]];

describe("useMessageReducer", () => {
  it("calls restore to initialize without messages", async () => {
    const addMessage = jest.fn();
    const restore = jest.fn().mockReturnValue(1);
    const { result } = renderHook(
      () =>
        PanelAPI.useMessageReducer({
          topics: ["/foo"],
          restore,
          addMessage,
        }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([]);
    expect(result.current).toEqual(1);
  });

  it("requires exactly one 'add' callback", () => {
    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn();
    const addMessages = jest.fn();
    expect(() =>
      renderHook(() => PanelAPI.useMessageReducer({ topics: ["/foo"], restore })),
    ).toThrow(
      new Error("useMessageReducer must be provided with exactly one of addMessage or addMessages"),
    );
    expect(() =>
      renderHook(() =>
        PanelAPI.useMessageReducer({ topics: ["/foo"], restore, addMessage, addMessages }),
      ),
    ).toThrow(
      new Error("useMessageReducer must be provided with exactly one of addMessage or addMessages"),
    );
    (console.error as jest.Mock).mockClear();
  });

  it("calls restore to initialize and addMessage for initial messages", async () => {
    const message: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);
    const { result } = renderHook(
      () =>
        PanelAPI.useMessageReducer({
          topics: ["/foo"],
          restore,
          addMessage,
        }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={[message]}>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, message]]);
    expect(result.current).toEqual(2);
  });

  it("calls restore to initialize and addMessages for initial messages", async () => {
    const message: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessages = jest
      .fn()
      .mockImplementation((_, msgs) => msgs[msgs.length - 1].message.value);
    const { result } = renderHook(
      () =>
        PanelAPI.useMessageReducer({
          topics: ["/foo"],
          restore,
          addMessages,
        }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={[message]}>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessages.mock.calls).toEqual([[1, [message]]]);
    expect(result.current).toEqual(2);
  });

  it("calls addMessage for messages added later", async () => {
    const messageFoo: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };
    const messageBar: MessageEvent = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
      schemaName: "bar",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);

    let messages: (typeof messageFoo)[] = [];
    const { result, rerender } = renderHook(
      ({ topics }) =>
        PanelAPI.useMessageReducer({
          topics,
          restore,
          addMessage,
        }),
      {
        initialProps: { topics: ["/foo"] },
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={messages}>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    messages = [messageFoo];
    rerender({ topics: ["/foo"] }); // subscriptions unchanged

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, messageFoo]]);
    expect(result.current).toEqual(2);

    // Subscribe to a new topic, then receive a message on that topic
    rerender({ topics: ["/foo", "/bar"] });

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, messageFoo]]);
    expect(result.current).toEqual(2);

    messages = [messageBar];
    rerender({ topics: ["/foo", "/bar"] });

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([
      [1, messageFoo],
      [2, messageBar],
    ]);
    expect(result.current).toEqual(3);
  });

  it("calls addMessages for messages added later", async () => {
    const message1: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };
    const message2: MessageEvent = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 3 },
      schemaName: "bar",
      sizeInBytes: 0,
    };
    const message3: MessageEvent = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 4 },
      schemaName: "bar",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessages = jest
      .fn()
      .mockImplementation((_, msgs) => msgs[msgs.length - 1].message.value);

    let messages: (typeof message1)[] = [];
    const { result, rerender } = renderHook(
      ({ topics }) =>
        PanelAPI.useMessageReducer({
          topics,
          restore,
          addMessages,
        }),
      {
        initialProps: { topics: ["/foo"] },
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={messages}>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    messages = [message1];
    rerender({ topics: ["/foo"] });

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessages.mock.calls).toEqual([[1, [message1]]]);
    expect(result.current).toEqual(2);

    // Subscribe to a new topic, then receive a message on that topic
    rerender({ topics: ["/foo", "/bar"] });

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessages.mock.calls).toEqual([[1, [message1]]]);
    expect(result.current).toEqual(2);

    messages = [message2, message3];
    rerender({ topics: ["/foo", "/bar"] });

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessages.mock.calls).toEqual([
      [1, [message1]],
      [2, [message2, message3]],
    ]);
    expect(result.current).toEqual(4);
  });

  it("does not filter out non-existing topics", () => {
    // Initial mount. Note that we haven't received any topics yet.
    const setSubscriptions = jest.fn();

    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);

    const { rerender, unmount } = renderHook(
      ({ topics }) =>
        PanelAPI.useMessageReducer({
          topics,
          restore,
          addMessage,
        }),
      {
        initialProps: { topics: ["/foo"] },
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider setSubscriptions={setSubscriptions}>
            {children}
          </MockMessagePipelineProvider>
        ),
      },
    );

    // Updating to change topics.
    rerender({ topics: ["/foo", "/bar"] });

    // And unsubscribes properly, too.
    act(() => {
      unmount();
    });
    expect(setSubscriptions.mock.calls).toEqual([
      [expect.any(String), [{ topic: "/foo", preloadType: "partial", requestor: undefined }]],
      [
        expect.any(String),
        [
          { topic: "/foo", preloadType: "partial", requestor: undefined },
          { topic: "/bar", preloadType: "partial", requestor: undefined },
        ],
      ],
      [expect.any(String), []],
    ]);
  });

  it("clears everything on seek", () => {
    const message1: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);

    let messages: (typeof message1)[] = [];
    let activeData: Partial<PlayerStateActiveData> = {};
    const { result, rerender } = renderHook(
      () => PanelAPI.useMessageReducer({ topics: ["/foo"], restore, addMessage }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={messages} activeData={activeData}>
            {children}
          </MockMessagePipelineProvider>
        ),
      },
    );

    messages = [message1];
    rerender();

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, message1]]);
    expect(result.current).toEqual(2);

    messages = [];
    activeData = { lastSeekTime: 1 };
    rerender();

    expect(restore.mock.calls).toEqual([...initialRestoreCallArguments, [undefined]]);
    expect(addMessage.mock.calls).toEqual([[1, message1]]);
    expect(result.current).toEqual(1);
  });

  function makeWrapper(player: Player) {
    function Wrapper({ children }: PropsWithChildren) {
      const [config] = useState(() => makeMockAppConfiguration());
      return (
        <AppConfigurationContext.Provider value={config}>
          <MockCurrentLayoutProvider>
            <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
          </MockCurrentLayoutProvider>
        </AppConfigurationContext.Provider>
      );
    }
    return Wrapper;
  }

  it("calls add message for messages from newly subscribed topic, given that topic has emitted messages previously", async () => {
    const restore = jest.fn();
    const addMessage = jest.fn();

    restore.mockReturnValue(0);
    addMessage.mockImplementation((_, msg) => msg.message.value);

    const messageFoo: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 1 },
      schemaName: "foo",
      sizeInBytes: 0,
    };
    const messageBar: MessageEvent = {
      topic: "/bar",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "bar",
      sizeInBytes: 0,
    };

    const player = new FakePlayer();
    const { result, rerender } = renderHook(
      ({ topics }: { topics: string[] }) => {
        return PanelAPI.useMessageReducer<number>({ topics, restore, addMessage });
      },
      {
        wrapper: makeWrapper(player),
        initialProps: { topics: [] as string[] },
      },
    );

    expect(restore.mock.calls).toEqual([[undefined]]);
    expect(addMessage.mock.calls).toEqual([]);
    expect(result.current).toEqual(0);

    rerender({ topics: ["/bar"] });

    // Subscribing does not invoke restore or add message
    expect(restore.mock.calls).toEqual([[undefined]]);
    expect(addMessage.mock.calls).toEqual([]);
    expect(result.current).toEqual(0);

    let promise: Promise<void>;
    act(
      () =>
        void (promise = player.emit({
          activeData: {
            messages: [messageFoo, messageBar], // foo message being emitted here
            currentTime: { sec: 0, nsec: 0 },
            startTime: { sec: 0, nsec: 0 },
            endTime: { sec: 1, nsec: 0 },
            isPlaying: true,
            speed: 0.2,
            lastSeekTime: 1234,
            topics: [
              { name: "/foo", schemaName: "foo" },
              { name: "/bar", schemaName: "foo" },
            ],
            topicStats: new Map(),
            datatypes: new Map(
              Object.entries({ foo: { definitions: [] }, bar: { definitions: [] } }),
            ),
            totalBytesReceived: 1234,
          },
        })),
    );
    await act(async () => {
      await promise;
    });

    // restore call with undefined, then add message called with our subscribed message
    expect(restore.mock.calls).toEqual([[undefined], [undefined]]);
    expect(addMessage.mock.calls).toEqual([[0, messageBar]]);
    expect(result.current).toEqual(2);

    rerender({ topics: ["/bar", "/foo"] });

    expect(restore.mock.calls).toEqual([[undefined], [undefined]]);
    expect(addMessage.mock.calls).toEqual([
      [0, messageBar],
      [2, messageFoo],
    ]);
    // foo message after subscribing to that topic
    expect(result.current).toEqual(1);
  });

  it("doesn't re-render when player topics or other playerState changes", async () => {
    const message: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);

    const messages = [message];
    let topics: Topic[] = [];
    let capabilities: string[] = [];
    const { result, rerender } = renderHook(
      () => PanelAPI.useMessageReducer({ topics: ["/foo"], restore, addMessage }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider
            messages={messages}
            topics={topics}
            capabilities={capabilities}
          >
            {children}
          </MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, message]]);
    expect(result.current).toEqual(2);

    topics = [{ name: "/bar", schemaName: "Bar" }];
    rerender();
    capabilities = ["some_capability"];
    rerender();

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(addMessage.mock.calls).toEqual([[1, message]]);
    expect(result.current).toEqual(2);
  });

  it("doesn't re-render when activeData is empty", async () => {
    const restore = jest.fn().mockReturnValue(1);
    const addMessage = jest.fn().mockImplementation((_, msg) => msg.message.value);

    let capabilities: string[] | undefined = undefined;
    const { result, rerender } = renderHook(
      () => PanelAPI.useMessageReducer({ topics: ["/foo"], restore, addMessage }),
      {
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider noActiveData capabilities={capabilities}>
            {children}
          </MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual([[undefined]]);
    expect(addMessage.mock.calls).toEqual([]);
    expect(result.current).toEqual(1);

    capabilities = ["some_capability"];
    rerender();

    expect(restore.mock.calls).toEqual([[undefined]]);
    expect(addMessage.mock.calls).toEqual([]);
    expect(result.current).toEqual(1);
  });

  it("restore called when addMessages changes", async () => {
    const message1: MessageEvent = {
      topic: "/foo",
      receiveTime: { sec: 0, nsec: 0 },
      message: { value: 2 },
      schemaName: "foo",
      sizeInBytes: 0,
    };

    const restore = jest.fn().mockReturnValue(1);
    const initialAddMessages = jest
      .fn()
      .mockImplementation((_, msgs) => msgs[msgs.length - 1].message.value);

    const messages = [message1];
    const { result, rerender } = renderHook(
      ({ addMessages }) => PanelAPI.useMessageReducer({ topics: ["/foo"], restore, addMessages }),
      {
        initialProps: { addMessages: initialAddMessages },
        wrapper: ({ children }) => (
          <MockMessagePipelineProvider messages={messages}>{children}</MockMessagePipelineProvider>
        ),
      },
    );

    expect(restore.mock.calls).toEqual(initialRestoreCallArguments);
    expect(result.current).toEqual(2);
    rerender({ addMessages: jest.fn() });
    expect(restore.mock.calls).toEqual([...initialRestoreCallArguments, [2]]);
  });
});
