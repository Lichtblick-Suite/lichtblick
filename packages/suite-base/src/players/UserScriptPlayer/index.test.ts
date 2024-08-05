/** @jest-environment jsdom */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { signal } from "@lichtblick/den/async";
import FakePlayer from "@lichtblick/suite-base/components/MessagePipeline/FakePlayer";
import MockUserScriptPlayerWorker from "@lichtblick/suite-base/players/UserScriptPlayer/MockUserScriptPlayerWorker";
import {
  AdvertiseOptions,
  MessageEvent,
  PlayerState,
  PlayerStateActiveData,
  Topic,
} from "@lichtblick/suite-base/players/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { UserScript } from "@lichtblick/suite-base/types/panels";
import { basicDatatypes } from "@lichtblick/suite-base/util/basicDatatypes";
import delay from "@lichtblick/suite-base/util/delay";
import { DEFAULT_STUDIO_SCRIPT_PREFIX } from "@lichtblick/suite-base/util/globalConstants";

import UserScriptPlayer from ".";
import exampleDatatypes from "./transformerWorker/fixtures/example-datatypes";
import { DiagnosticSeverity, ErrorCodes, Sources } from "./types";

const nodeId = "nodeId";

const nodeUserCode = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
  const stamp = Math.random(); // stamp used to distinguish different instances of a script.
  let lastStamp, lastReceiveTime;
  export default (message: { message: { payload: string } }): { custom_np_field: string, value: string, stamp: number } => {
    return { custom_np_field: "abc", value: message.message.payload, stamp  };
  };
`;

const nodeUserCodeWithCompileError = `
  export const inputs = ["/np_input"];
  export const output = "some_output";
  export default
`;

const nodeUserCodeWithGlobalVars = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
  let lastStamp, lastReceiveTime;
  type GlobalVariables = { globalValue: string };
  export default (message: { message: { payload: string } }, globalVars: GlobalVariables): { custom_np_field: string, value: string } => {
    return { custom_np_field: globalVars.globalValue, value: globalVars.globalValue };
  };
`;

const nodeUserCodeWithLogAndError = `
  export const inputs = ["/np_input"];
  export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
  export default (message: { message: { payload: string } }): { success: boolean } => {
    if (message.message.payload === "bar") {
      log('Running. Will fail.');
      throw new Error("Error!");
    }
    log('Running. Will succeed.');
    return { success: true };
  };
`;

const defaultUserScriptActions = {
  setUserScriptDiagnostics: jest.fn(),
  addUserScriptLogs: jest.fn(),
  setUserScriptRosLib: jest.fn(),
  setUserScriptTypesLib: jest.fn(),
};

const basicPlayerState: PlayerStateActiveData = {
  startTime: { sec: 0, nsec: 0 },
  endTime: { sec: 1, nsec: 0 },
  isPlaying: true,
  speed: 0.2,
  lastSeekTime: 0,
  totalBytesReceived: 1234,
  messages: [],
  currentTime: { sec: 0, nsec: 0 },
  topics: [],
  topicStats: new Map(),
  datatypes: new Map(),
};

const upstreamFirst = {
  topic: "/np_input",
  receiveTime: { sec: 0, nsec: 1 },
  message: {
    payload: "bar",
  },
  schemaName: "foo",
  sizeInBytes: 0,
};

const upstreamSecond = {
  topic: "/np_input",
  receiveTime: { sec: 0, nsec: 100 },
  message: {
    payload: "baz",
  },
  schemaName: "foo",
  sizeInBytes: 0,
};

const setListenerHelper = (player: UserScriptPlayer, numPromises: number = 1) => {
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  const signals = [...new Array(numPromises)].map(() =>
    signal<{
      topicNames: string[];
      messages: readonly MessageEvent[];
      progress?: PlayerState["progress"];
      topics: Topic[] | undefined;
      datatypes: RosDatatypes | undefined;
    }>(),
  );
  let numEmits = 0;
  player.setListener(async (playerState) => {
    const topicNames = [];
    if (playerState.activeData) {
      topicNames.push(...playerState.activeData.topics.map((topic) => topic.name));
    }
    const messages = playerState.activeData?.messages ?? [];
    signals[numEmits]?.resolve({
      topicNames,
      messages,
      progress: playerState.progress,
      topics: playerState.activeData?.topics,
      datatypes: playerState.activeData?.datatypes,
    });
    numEmits += 1;
  });

  return signals;
};

// @ts-expect-error MockUserScriptPlayerWorker is not a fully valid SharedWorker but is enough for our needs
UserScriptPlayer.CreateRuntimeWorker = () => {
  return new MockUserScriptPlayerWorker();
};

// @ts-expect-error MockUserScriptPlayerWorker is not a fully valid SharedWorker but is enough for our needs
UserScriptPlayer.CreateTransformWorker = () => {
  return new MockUserScriptPlayerWorker();
};

describe("UserScriptPlayer", () => {
  describe("default player behavior", () => {
    it("subscribes to underlying topics when node topics are subscribed", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      userScriptPlayer.setListener(async () => {
        // no-op
      });
      userScriptPlayer.setSubscriptions([{ topic: "/studio/test" }, { topic: "/input/baz" }]);
      await Promise.resolve(); // wait for subscriptions to take effect
      expect(fakePlayer.subscriptions).toEqual([
        { topic: "/studio/test" },
        { topic: "/input/baz" },
      ]);
    });

    it("delegates play and pause calls to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "startPlayback");
      jest.spyOn(fakePlayer, "pausePlayback");
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      const messages = [];
      userScriptPlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.startPlayback).not.toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
      userScriptPlayer.startPlayback();
      expect(fakePlayer.startPlayback).toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).not.toHaveBeenCalled();
      userScriptPlayer.pausePlayback();
      expect(fakePlayer.startPlayback).toHaveBeenCalled();
      expect(fakePlayer.pausePlayback).toHaveBeenCalled();
    });

    it("delegates setPlaybackSpeed to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "setPlaybackSpeed");
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      const messages = [];
      userScriptPlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.setPlaybackSpeed).not.toHaveBeenCalled();
      userScriptPlayer.setPlaybackSpeed(0.4);
      expect(fakePlayer.setPlaybackSpeed).toHaveBeenCalledWith(0.4);
    });

    it("delegates seekPlayback to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "seekPlayback");
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      const messages = [];
      userScriptPlayer.setListener(async (playerState) => {
        messages.push(playerState);
      });
      expect(fakePlayer.seekPlayback).not.toHaveBeenCalled();
      userScriptPlayer.seekPlayback({ sec: 2, nsec: 2 });
      expect(fakePlayer.seekPlayback).toHaveBeenCalledWith({ sec: 2, nsec: 2 });
    });

    it("delegates publishing to underlying player", () => {
      const fakePlayer = new FakePlayer();
      jest.spyOn(fakePlayer, "setPublishers");
      jest.spyOn(fakePlayer, "publish");
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      expect(fakePlayer.setPublishers).not.toHaveBeenCalled();
      expect(fakePlayer.publish).not.toHaveBeenCalled();
      const publishers: AdvertiseOptions[] = [{ topic: "/foo", schemaName: "foo" }];
      userScriptPlayer.setPublishers(publishers);
      expect(fakePlayer.setPublishers).toHaveBeenLastCalledWith(publishers);
      expect(fakePlayer.publish).not.toHaveBeenCalled();
      const publishPayload = { topic: "/foo", msg: {} };
      userScriptPlayer.publish(publishPayload);
      expect(fakePlayer.publish).toHaveBeenCalledWith(publishPayload);
    });
  });

  describe("user node behavior", () => {
    it("exposes user node topics when available", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });

      void userScriptPlayer.setUserScripts({
        nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const [done] = setListenerHelper(userScriptPlayer);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [],
          currentTime: { sec: 0, nsec: 0 },
          topics: [{ name: "/np_input", schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const { topicNames, messages } = (await done)!;

      expect(mockSetNodeDiagnostics.mock.calls).toEqual([[nodeId, []]]);
      expect(messages.length).toEqual(0);
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);
    });

    it("updates when topics change", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });

      const [done1, done2, done3] = setListenerHelper(userScriptPlayer, 3);

      const activeData = {
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [],
        datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
      };
      await fakePlayer.emit({ activeData });

      await userScriptPlayer.setUserScripts({
        nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });
      await done1;

      await fakePlayer.emit({
        activeData: {
          ...activeData,
          topics: [{ name: "/np_input", schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }],
        },
      });

      let { topicNames, messages } = await done2!;

      expect(messages.length).toEqual(0);
      expect(topicNames).toEqual([`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);

      ({ topicNames, messages } = await done3!);
      expect(messages.length).toEqual(0);
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);

      expect(mockSetNodeDiagnostics.mock.calls).toEqual([
        [
          nodeId,
          [
            {
              code: ErrorCodes.InputTopicsChecker.NO_TOPIC_AVAIL,
              message: `Input "/np_input" is not yet available`,
              severity: DiagnosticSeverity.Error,
              source: Sources.InputTopicsChecker,
            },
          ],
        ],
        [nodeId, []],
      ]);
    });

    it("memoizes topics and datatypes (even after seeking / reinitializing nodes)", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });

      const [done1, done2, done3] = setListenerHelper(userScriptPlayer, 3);

      await userScriptPlayer.setUserScripts({
        nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const activeData: PlayerStateActiveData = {
        ...basicPlayerState,
        messages: [],
        currentTime: { sec: 0, nsec: 0 },
        topics: [{ name: "/np_input", schemaName: "/np_input_datatype" }],
        datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
      };

      await fakePlayer.emit({ activeData });
      const { topics: firstTopics, datatypes: firstDatatypes } = (await done1)!;
      expect(firstTopics).toEqual<typeof firstTopics>([
        { name: "/np_input", schemaName: "/np_input_datatype" },
        { name: "/studio_script/1", schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` },
      ]);
      expect(firstDatatypes).toEqual(
        new Map([
          ["foo", { definitions: [] }],
          [
            `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
            {
              definitions: [
                {
                  name: "custom_np_field",
                  type: "string",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                },
                {
                  name: "value",
                  type: "string",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                },
                {
                  name: "stamp",
                  type: "float64",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                },
              ],
            },
          ],
          ...basicDatatypes,
        ]),
      );

      // Seek should keep topics memoized.
      await fakePlayer.emit({ activeData: { ...activeData, lastSeekTime: 123 } });
      const { topics: secondTopics, datatypes: secondDatatypes } = (await done2)!;
      expect(secondTopics).toBe(firstTopics);
      expect(secondDatatypes).toBe(firstDatatypes);

      // Changing topics/datatypes should not memoize.
      await fakePlayer.emit({ activeData: { ...activeData, topics: [], datatypes: new Map() } });
      const { topics: thirdTopics, datatypes: thirdDatatypes } = (await done3)!;
      expect(thirdTopics).not.toBe(firstTopics);
      expect(thirdDatatypes).not.toBe(firstDatatypes);
    });

    it("outputs updated messages on next when user script is changed with no new messages as part of active state", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: jest.fn(),
        addUserScriptLogs: mockAddUserNodeLogs,
      });

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      const nodeUserCodeBefore = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;
      await userScriptPlayer.setUserScripts({
        nodeId: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCodeBefore,
        },
      });

      const messagesArray = [upstreamFirst];

      const [done, nextDone] = setListenerHelper(userScriptPlayer, 2);

      const topics: Topic[] = [
        { name: "/np_input", schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` },
      ];
      const datatypes = new Map(Object.entries({ foo: { definitions: [] } }));

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: messagesArray,
          currentTime: { sec: 0, nsec: 0 },
          topics,
          datatypes,
        },
      });

      (await done)!;

      const nodeUserCodeAfter = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "COMPLETELY_DIFFERENT", value: message.message.payload };
        };
      `;
      await userScriptPlayer.setUserScripts({
        nodeId: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCodeAfter,
        },
      });

      // Pretend the player emits again (playing) but not our user script input messages
      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [],
          currentTime: { sec: 0, nsec: 0 },
          topics,
          datatypes,
        },
      });

      const { messages: newMessages }: any = await nextDone;

      // We should still receive updated output messages even though there were no new input messages
      expect(newMessages).toEqual([
        {
          message: {
            custom_np_field: "COMPLETELY_DIFFERENT",
            value: "bar",
          },
          receiveTime: {
            nsec: 1,
            sec: 0,
          },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
          topic: "/studio_script/1",
        },
      ]);
    });

    it("outputs updated messages on when user script is changed and player is paused", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: jest.fn(),
        addUserScriptLogs: mockAddUserNodeLogs,
      });

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      const nodeUserCodeBefore = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;
      await userScriptPlayer.setUserScripts({
        nodeId: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCodeBefore,
        },
      });

      const messagesArray = [upstreamFirst];

      const [done, nextDone] = setListenerHelper(userScriptPlayer, 2);

      const topics: Topic[] = [
        { name: "/np_input", schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` },
      ];
      const datatypes = new Map(Object.entries({ foo: { definitions: [] } }));

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          isPlaying: false,
          messages: messagesArray,
          currentTime: { sec: 0, nsec: 0 },
          topics,
          datatypes,
        },
      });

      (await done)!;

      const nodeUserCodeAfter = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } => {
          return { custom_np_field: "COMPLETELY_DIFFERENT", value: message.message.payload };
        };
      `;
      await userScriptPlayer.setUserScripts({
        nodeId: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCodeAfter,
        },
      });

      const { messages: newMessages }: any = await nextDone;

      // The internal re-processing from updating the user script should only contain the new script
      // output and not upstream messages
      expect(newMessages).toEqual([
        {
          message: {
            custom_np_field: "COMPLETELY_DIFFERENT",
            value: "bar",
          },
          receiveTime: {
            nsec: 1,
            sec: 0,
          },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
          topic: "/studio_script/1",
        },
      ]);
    });

    it("subscribes to underlying topics when nodeInfo is added", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const done = setListenerHelper(userScriptPlayer)[0]!;

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [],
          currentTime: { sec: 0, nsec: 0 },
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const { topicNames } = await done;
      void userScriptPlayer.setUserScripts({
        nodeId: { name: "someNodeName", sourceCode: nodeUserCode },
      });
      userScriptPlayer.setSubscriptions(topicNames.map((topic) => ({ topic })));
      await delay(10); // wait for subscriptions to take effect
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input" }]);
    });

    it("does not subscribe to all fields when user node is unused", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      const topicNames = ["/np_input"];
      void userScriptPlayer.setUserScripts({
        nodeId: { name: "someNodeName", sourceCode: nodeUserCode },
      });
      userScriptPlayer.setSubscriptions(topicNames.map((topic) => ({ topic, fields: ["a"] })));
      await delay(10); // wait for subscriptions to take effect

      // A direct subscription to a topic should maintain the requested fields.
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input", fields: ["a"] }]);
    });

    it("requests full subscriptions for input topics", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      // Bootstrap the node.
      const done = setListenerHelper(userScriptPlayer)[0]!;
      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [],
          currentTime: { sec: 0, nsec: 0 },
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });
      await done;
      void userScriptPlayer.setUserScripts({
        nodeId: { name: "someNodeName", sourceCode: nodeUserCode },
      });

      // Subscribe to a slice of the output topic and a slice of the input topic.
      userScriptPlayer.setSubscriptions([
        { topic: "/np_input", fields: ["a"] },
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, fields: ["a"], preloadType: "partial" },
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, fields: ["a"], preloadType: "full" },
      ]);

      // Wait for subscriptions to take effect.
      await delay(10);

      // The underlying player subscription should not be sliced since we don't know which fields of
      // the message the script will use.
      expect(fakePlayer.subscriptions).toEqual([
        { topic: "/np_input", preloadType: "full" },
        { topic: "/np_input" },
      ]);
    });

    it("subscribes to underlying topics even when user script has a compilation error", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done] = setListenerHelper(userScriptPlayer);

      void userScriptPlayer.setUserScripts({
        nodeId: { name: "someNodeName", sourceCode: nodeUserCodeWithCompileError },
      });
      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [],
          currentTime: { sec: 0, nsec: 0 },
          topics: [],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });
      await done;

      userScriptPlayer.setSubscriptions([{ topic: "some_output" }]);
      await Promise.resolve(); // wait for subscriptions to take effect
      expect(fakePlayer.subscriptions).toEqual([{ topic: "/np_input", preloadType: "partial" }]);
    });

    it("does not produce messages from UserNodes if not subscribed to", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done] = setListenerHelper(userScriptPlayer);

      void userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const { messages, topicNames } = (await done)!;
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);
      expect(messages).toEqual([upstreamFirst]);
    });

    it("produces messages from user input node code with messages produced from underlying player", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done] = setListenerHelper(userScriptPlayer);

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const { messages } = (await done)!;

      expect(messages).toEqual([
        upstreamFirst,
        {
          topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          receiveTime: upstreamFirst.receiveTime,
          message: { custom_np_field: "abc", value: "bar", stamp: expect.any(Number) },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
        },
      ]);
    });

    it("produces blocks for full subscriptions", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
      const spy = jest.spyOn(UserScriptPlayer, "CreateRuntimeWorker");

      const [done] = setListenerHelper(userScriptPlayer);

      userScriptPlayer.setSubscriptions([
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, preloadType: "full" },
      ]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
        progress: {
          fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
          messageCache: {
            blocks: [
              { messagesByTopic: { [upstreamFirst.topic]: [upstreamFirst] }, sizeInBytes: 1 },
            ],
            startTime: upstreamFirst.receiveTime,
          },
        },
      });

      const { messages, progress } = (await done)!;

      expect(messages).toEqual([
        upstreamFirst,
        {
          topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          receiveTime: upstreamFirst.receiveTime,
          message: { custom_np_field: "abc", value: "bar", stamp: expect.any(Number) },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
        },
      ]);

      expect(progress).toEqual({
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          startTime: { sec: 0, nsec: 1 },
          blocks: [
            {
              messagesByTopic: {
                "/np_input": [upstreamFirst],
                [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: [
                  {
                    topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
                    receiveTime: {
                      sec: 0,
                      nsec: 1,
                    },
                    message: {
                      custom_np_field: "abc",
                      value: "bar",
                      stamp: expect.any(Number),
                    },
                    schemaName: "/studio_script/1",
                    sizeInBytes: 0,
                  },
                ],
              },
              sizeInBytes: 1,
            },
          ],
        },
      });

      // CreateRuntimeWorker should have been called once for the message processing
      // worker and once for the block processing worker,
      expect(spy).toHaveBeenCalledTimes(2);

      // The block and message workers should have different stamps.
      const messageWorkerStamp = (messages[1] as MessageEvent<{ stamp: number }>).message.stamp;
      const blockWorkerStamp = (
        progress?.messageCache?.blocks[0]?.messagesByTopic[
          `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`
        ]?.[0] as MessageEvent<{ stamp: number }>
      ).message.stamp;

      expect(messageWorkerStamp).not.toEqual(blockWorkerStamp);
    });

    it("does not duplicate output messages in blocks after multiple readings", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done1, done2] = setListenerHelper(userScriptPlayer, 2);

      userScriptPlayer.setSubscriptions([
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, preloadType: "full" },
      ]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
        progress: {
          fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
          messageCache: {
            blocks: [
              { messagesByTopic: { [upstreamFirst.topic]: [upstreamFirst] }, sizeInBytes: 1 },
              undefined,
            ],
            startTime: upstreamFirst.receiveTime,
          },
        },
      });

      const { progress: prevProgress } = (await done1)!;

      // Current behavior dictates that it could be passed previous blocks that have already received user script output messages
      prevProgress!.messageCache!.blocks = [
        prevProgress!.messageCache!.blocks[0],
        { messagesByTopic: { [upstreamFirst.topic]: [upstreamFirst] }, sizeInBytes: 1 },
      ];

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
        progress: prevProgress,
      });

      const { progress } = (await done2)!;

      expect(progress).toEqual({
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          startTime: { sec: 0, nsec: 1 },
          blocks: [
            {
              messagesByTopic: {
                "/np_input": [upstreamFirst],
                [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: [
                  {
                    topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
                    receiveTime: {
                      sec: 0,
                      nsec: 1,
                    },
                    message: {
                      custom_np_field: "abc",
                      value: "bar",
                      stamp: expect.any(Number),
                    },
                    schemaName: "/studio_script/1",
                    sizeInBytes: 0,
                  },
                ],
              },
              sizeInBytes: 1,
            },
            {
              messagesByTopic: {
                "/np_input": [upstreamFirst],
                [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: [
                  {
                    topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
                    receiveTime: {
                      sec: 0,
                      nsec: 1,
                    },
                    message: {
                      custom_np_field: "abc",
                      value: "bar",
                      stamp: expect.any(Number),
                    },
                    schemaName: "/studio_script/1",
                    sizeInBytes: 0,
                  },
                ],
              },
              sizeInBytes: 1,
            },
          ],
        },
      });
    });

    it("does not add to logs when there is no 'log' invocation in the user code", async () => {
      const fakePlayer = new FakePlayer();
      const mockAddUserNodeLogs = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: jest.fn(),
        addUserScriptLogs: mockAddUserNodeLogs,
      });

      const [done] = setListenerHelper(userScriptPlayer);

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      await done;
      expect(mockAddUserNodeLogs).not.toHaveBeenCalled();
    });

    it("adds to logs even when there is a runtime error", async () => {
      const fakePlayer = new FakePlayer();
      const addUserNodeLogs = jest.fn();
      const setUserNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        addUserScriptLogs: addUserNodeLogs,
        setUserScriptDiagnostics: setUserNodeDiagnostics,
      });
      const datatypes: RosDatatypes = new Map(
        Object.entries({ foo: { definitions: [{ name: "payload", type: "string" }] } }),
      );
      const topics: Topic[] = [{ name: "/np_input", schemaName: "std_msgs/Header" }];

      const [done1, done2] = setListenerHelper(userScriptPlayer, 2);
      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCodeWithLogAndError,
        },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics,
          datatypes,
        },
      });
      await done1;

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamSecond],
          currentTime: upstreamSecond.receiveTime,
          topics,
          datatypes,
        },
      });
      await done2;

      expect(addUserNodeLogs.mock.calls).toEqual([
        [nodeId, [{ source: "processMessage", value: "Running. Will fail." }]],
        [nodeId, [{ source: "processMessage", value: "Running. Will succeed." }]],
      ]);
      // Errors are not immediately cleared by successful calls -- they stick around for the user
      // to read.
      expect(setUserNodeDiagnostics).toHaveBeenLastCalledWith(nodeId, [
        {
          code: ErrorCodes.RUNTIME,
          message: "Error: Error!",
          severity: DiagnosticSeverity.Error,
          source: Sources.Runtime,
        },
      ]);
    });

    it("skips publishing messages if a node does not produce a message", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done, nextDone] = setListenerHelper(userScriptPlayer, 2);

      const unionTypeReturn = `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        let lastStamp, lastReceiveTime;
        export default (message: { message: { payload: string } }): { custom_np_field: string, value: string } | undefined => {
          if (message.message.payload === "bar") {
            return;
          }
          return { custom_np_field: "abc", value: message.message.payload };
        };
      `;

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      await userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: unionTypeReturn },
      });

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const result = (await done)!;
      expect(result.messages).toEqual([upstreamFirst]);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamSecond],
          currentTime: upstreamSecond.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });

      const nextResult: any = await nextDone;
      expect(nextResult.messages).toEqual([
        upstreamSecond,
        {
          topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          receiveTime: upstreamSecond.receiveTime,
          message: { custom_np_field: "abc", value: "baz" },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
        },
      ]);
    });

    it("should error if multiple nodes output to the same topic", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });
      const [done] = setListenerHelper(userScriptPlayer);

      void userScriptPlayer.setUserScripts({
        [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCode,
        },
        [`${DEFAULT_STUDIO_SCRIPT_PREFIX}2`]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}2`,
          sourceCode: nodeUserCode,
        },
      });
      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { messages, topics } = (await done)!;

      expect(messages).toHaveLength(2);
      expect(topics).toEqual<typeof topics>([
        { name: "/np_input", schemaName: "std_msgs/Header" },
        {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
        },
      ]);
      expect(mockSetNodeDiagnostics).toHaveBeenCalledWith(`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, []);
      expect(mockSetNodeDiagnostics).toHaveBeenCalledWith(`${DEFAULT_STUDIO_SCRIPT_PREFIX}2`, [
        {
          source: Sources.OutputTopicChecker,
          severity: DiagnosticSeverity.Error,
          message: `Output "${DEFAULT_STUDIO_SCRIPT_PREFIX}1" must be unique`,
          code: ErrorCodes.OutputTopicChecker.NOT_UNIQUE,
        },
      ]);
    });

    it("should error if a user node outputs to an existing input topic", async () => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });
      const [done] = setListenerHelper(userScriptPlayer);

      void userScriptPlayer.setUserScripts({
        [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCode,
        },
      });
      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [
            { name: "/np_input", schemaName: "std_msgs/Header" },
            { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, schemaName: "Something" },
          ],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { messages, topics } = (await done)!;

      expect(messages).toHaveLength(1);
      expect(topics).toEqual<typeof topics>([
        { name: "/np_input", schemaName: "std_msgs/Header" },
        { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, schemaName: "Something" },
      ]);
      expect(mockSetNodeDiagnostics).toHaveBeenCalledWith(`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, [
        {
          source: Sources.OutputTopicChecker,
          severity: DiagnosticSeverity.Error,
          message: `Output topic "${DEFAULT_STUDIO_SCRIPT_PREFIX}1" is already present in the data source`,
          code: ErrorCodes.OutputTopicChecker.EXISTING_TOPIC,
        },
      ]);
    });

    it("should handle multiple user nodes", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const [done] = setListenerHelper(userScriptPlayer);

      void userScriptPlayer.setUserScripts({
        [`${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          sourceCode: nodeUserCode,
        },
      });

      const nodeUserCode2 = nodeUserCode.replace(
        `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
        `${DEFAULT_STUDIO_SCRIPT_PREFIX}2`,
      );
      void userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
        [`${nodeId}2`]: {
          name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}2`,
          sourceCode: nodeUserCode2,
        },
      });

      userScriptPlayer.setSubscriptions([
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` },
        { topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}2` },
      ]);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { messages } = (await done)!;

      expect(messages).toEqual([
        upstreamFirst,
        {
          topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
          receiveTime: upstreamFirst.receiveTime,
          message: { custom_np_field: "abc", value: "bar", stamp: expect.any(Number) },
          schemaName: "/studio_script/1",
          sizeInBytes: 0,
        },
        {
          topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}2`,
          receiveTime: upstreamFirst.receiveTime,
          message: { custom_np_field: "abc", value: "bar", stamp: expect.any(Number) },
          schemaName: "/studio_script/2",
          sizeInBytes: 0,
        },
      ]);
    });

    it("resets user node state on seek", async () => {
      const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;

      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      void userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode },
      });

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);

      const [firstDone, secondDone] = setListenerHelper(userScriptPlayer, 2);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      await firstDone;

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamSecond],
          currentTime: upstreamSecond.receiveTime,
          lastSeekTime: 1,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { messages }: any = await secondDone;

      expect(messages[messages.length - 1].message).toEqual({
        innerState: 1,
      });
    });
    it.each([
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
              throw new Error("error path");
            }
            return { num: 42 };
          };`,
        error: "Error: error path",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
          export default (messages: any): { num: number } => {
            if (messages.message) {
             const badPropertyAccess = messages.message.message.message;
            }
            return { num: 42 };
          };`,
        error: expect.stringMatching(/^TypeError:/),
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
          const x: any = {};
          const y = x.bad.bad;
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: expect.stringMatching(/^TypeError:/),
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
          throw "";
          export default (messages: any): { num: number } => {
            return { num: 42 };
          };`,
        error: "Unknown error encountered registering this node.",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        export default (messages: any): { num: number } => {
          throw ""
          return { num: 42 };
        };`,
        error: "Unknown error encountered running this node.",
      },
      {
        code: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
          export default (messages: any): { num: number } => {
          if (messages.message) {
            throw new Error("");
          }
            return { num: 42 };
          };`,
        error: "Error",
      },
      {
        code: `
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        if (inputs.length) {
          throw new Error("");
        }
        export default (messages: any): { num: number } => {
          return { num: 42 };
        };`,
        error: "Error",
      },
    ])("records runtime errors in the diagnostics handler", async ({ code, error }) => {
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });

      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
      void userScriptPlayer.setUserScripts({
        nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: code },
      });

      const [done] = setListenerHelper(userScriptPlayer);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { topicNames, messages } = (await done)!;
      expect(mockSetNodeDiagnostics).toHaveBeenLastCalledWith(nodeId, [
        {
          source: Sources.Runtime,
          severity: DiagnosticSeverity.Error,
          message: error,
          code: ErrorCodes.RUNTIME,
        },
      ]);
      // Sanity check to ensure none of the user node messages made it through if there was an error.
      expect(messages.map(({ topic }: any) => topic)).not.toContain(
        `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
      );
      expect(topicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);
    });

    it("properly clears user node registrations", async () => {
      const fakePlayer = new FakePlayer();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      void userScriptPlayer.setUserScripts({
        [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
      });

      const [firstDone, secondDone, thirdDone] = setListenerHelper(userScriptPlayer, 3);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });

      const { topicNames: firstTopicNames }: any = await firstDone;
      expect(firstTopicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);

      await userScriptPlayer.setUserScripts({});
      const { topicNames: secondTopicNames }: any = await secondDone;
      expect(secondTopicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);

      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(
            Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
          ),
        },
      });
      const { topicNames: thirdTopicNames }: any = await thirdDone;
      expect(thirdTopicNames).toEqual(["/np_input"]);
    });

    it("properly sets diagnostics when there is an error", async () => {
      const code = `
        export const inputs = ["/np_input_does_not_exist"];
        export const output = "/bad_prefix";
        export default (messages: any): any => {};
      `;
      const fakePlayer = new FakePlayer();
      const mockSetNodeDiagnostics = jest.fn();
      const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
        ...defaultUserScriptActions,
        setUserScriptDiagnostics: mockSetNodeDiagnostics,
      });

      void userScriptPlayer.setUserScripts({
        nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: code },
      });

      const [done] = setListenerHelper(userScriptPlayer);
      await fakePlayer.emit({ activeData: basicPlayerState });
      await done;
      expect(mockSetNodeDiagnostics).toHaveBeenLastCalledWith(nodeId, [
        {
          severity: DiagnosticSeverity.Error,
          message: expect.any(String),
          source: Sources.InputTopicsChecker,
          code: ErrorCodes.InputTopicsChecker.NO_TOPIC_AVAIL,
        },
      ]);
    });

    describe("user logging", () => {
      it("records logs in the logs handler", async () => {
        const code = `
        import { Time } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        const publisher = (message: { message: any }): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        log(50, "ABC", null, undefined, 5 + 5);
        log({ "abc": 2, "def": false, });
        const add = (a: number, b: number): number => a + b;
        log("SUM: " + add(1, 2));

        export default publisher;
      `;

        const logs = [
          [
            { source: "registerScript", value: 50 },
            { source: "registerScript", value: "ABC" },
            { source: "registerScript", value: null }, // eslint-disable-line no-restricted-syntax
            { source: "registerScript", value: undefined },
            { source: "registerScript", value: 10 },
            { source: "registerScript", value: { abc: 2, def: false } },
            { source: "registerScript", value: "SUM: 3" },
          ],
          [
            { source: "processMessage", value: "inside publisher" },
            { source: "processMessage", value: { payload: "bar" } },
          ],
        ];

        const fakePlayer = new FakePlayer();
        const mockAddNodeLogs = jest.fn();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
          ...defaultUserScriptActions,
          addUserScriptLogs: mockAddNodeLogs,
        });
        const [done] = setListenerHelper(userScriptPlayer);

        userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
        void userScriptPlayer.setUserScripts({
          [nodeId]: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}nodeName`, sourceCode: code },
        });

        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            messages: [upstreamFirst],
            currentTime: upstreamFirst.receiveTime,
            topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
            datatypes: new Map(
              Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
            ),
          },
        });

        const { topicNames } = (await done)!;
        expect(mockAddNodeLogs).toHaveBeenCalled();
        expect(mockAddNodeLogs.mock.calls).toEqual(logs.map((log) => [nodeId, log]));
        expect(topicNames).toEqual(["/np_input", `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`]);
      });

      it("does not record logs if there is an error", async () => {
        const code = `
        import { Time, Message } from "ros";
        type InputTopicMsg = {header: {stamp: Time}};
        type Marker = {};
        type MarkerArray = { markers: Marker[] }

        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
        const publisher = (message: Message<InputTopicMsg>): MarkerArray => {
          log("inside publisher", message.message);
          return { markers: [] };
        };

        print("HELLO");

        export default publisher;
      `;

        const fakePlayer = new FakePlayer();
        const mockAddNodeLogs = jest.fn();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, {
          ...defaultUserScriptActions,
          addUserScriptLogs: mockAddNodeLogs,
        });
        const [done] = setListenerHelper(userScriptPlayer);

        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            messages: [upstreamFirst],
            currentTime: upstreamFirst.receiveTime,
            topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
            datatypes: new Map(
              Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
            ),
          },
        });

        userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
        void userScriptPlayer.setUserScripts({ nodeId: { name: "nodeName", sourceCode: code } });

        const { topicNames } = (await done)!;
        expect(mockAddNodeLogs.mock.calls).toEqual([]);
        expect(topicNames).toEqual(["/np_input"]);
      });
    });

    describe("datatypes", () => {
      it("updates the extracted datatype on a user code change", async () => {
        const sourceCode = `
        let innerState = 0;
        export const inputs = ["/np_input"];
        export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}innerState";
        export default (): { innerState: number } => {
          innerState += 1;
          return { innerState };
        };
      `;

        const fakePlayer = new FakePlayer();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
        const firstName = `${DEFAULT_STUDIO_SCRIPT_PREFIX}innerState`;

        void userScriptPlayer.setUserScripts({
          [nodeId]: { name: firstName, sourceCode },
        });
        userScriptPlayer.setSubscriptions([{ topic: firstName }]);

        // Update the name of the node.
        const secondName = `${DEFAULT_STUDIO_SCRIPT_PREFIX}state`;
        const secondSourceCode = sourceCode.replace(/innerState/g, "state");

        void userScriptPlayer.setUserScripts({
          [nodeId]: {
            name: secondName,
            sourceCode: secondSourceCode,
          },
        });
        userScriptPlayer.setSubscriptions([{ topic: secondName }]);

        const [done] = setListenerHelper(userScriptPlayer);

        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            messages: [upstreamFirst],
            currentTime: upstreamFirst.receiveTime,
            topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
            datatypes: new Map(
              Object.entries({ foo: { definitions: [] }, "std_msgs/Header": { definitions: [] } }),
            ),
          },
        });

        const { topics } = (await done)!;
        expect(topics).toEqual<typeof topics>([
          { name: "/np_input", schemaName: "std_msgs/Header" },
          {
            name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}state`,
            schemaName: `${DEFAULT_STUDIO_SCRIPT_PREFIX}state`,
          },
        ]);
      });
      it("uses dynamically generated type definitions", async () => {
        const sourceCode = `
          import { Input, Messages } from 'ros';
          let innerState = 0;
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}state";
          export default (message: Input<"/np_input">): Messages.std_msgs__Header => {
            return message.message;
          };
        `;

        const fakePlayer = new FakePlayer();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
        const firstName = `${DEFAULT_STUDIO_SCRIPT_PREFIX}state`;

        void userScriptPlayer.setUserScripts({
          [nodeId]: { name: firstName, sourceCode },
        });
        userScriptPlayer.setSubscriptions([{ topic: firstName }]);

        const [done] = setListenerHelper(userScriptPlayer);

        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            messages: [upstreamFirst],
            currentTime: upstreamFirst.receiveTime,
            topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
            datatypes: exampleDatatypes,
          },
        });

        const { topics } = (await done)!;
        expect(topics).toEqual<typeof topics>([
          { name: "/np_input", schemaName: "std_msgs/Header" },
          { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}state`, schemaName: "std_msgs/Header" },
        ]);
      });
      it("does not override dynamically generated datatypes with built-in datatypes", async () => {
        const fakePlayer = new FakePlayer();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
        void userScriptPlayer.setUserScripts({
          nodeId: { name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`, sourceCode: nodeUserCode },
        });

        const [done] = setListenerHelper(userScriptPlayer);
        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            // Emit datatypes which includes the built-in type `std_msgs/Header`.
            datatypes: new Map(
              Object.entries({
                "std_msgs/Header": {
                  definitions: [
                    { type: "string", name: "some_field", isArray: false, isComplex: false },
                  ],
                },
              }),
            ),
          },
        });

        // We expect that the player's emitted `std_msgs/Header` datatype was not overriden by the
        // built-in type.
        const { datatypes } = (await done)!;
        expect(datatypes?.get("std_msgs/Header")).toEqual({
          definitions: [{ type: "string", name: "some_field", isArray: false, isComplex: false }],
        });
      });
    });

    describe("global variable behavior", () => {
      it("passes global variables to nodes", async () => {
        const fakePlayer = new FakePlayer();
        const userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);
        const [done, done2] = setListenerHelper(userScriptPlayer, 2);

        userScriptPlayer.setGlobalVariables({ globalValue: "aaa" });
        userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1` }]);
        await userScriptPlayer.setUserScripts({
          [nodeId]: {
            name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
            sourceCode: nodeUserCodeWithGlobalVars,
          },
        });

        const activeData: PlayerStateActiveData = {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        };
        await fakePlayer.emit({ activeData });

        const { messages } = (await done)!;
        expect(messages).toEqual([
          upstreamFirst,
          {
            topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
            receiveTime: upstreamFirst.receiveTime,
            message: { custom_np_field: "aaa", value: "aaa" },
            schemaName: "/studio_script/1",
            sizeInBytes: 0,
          },
        ]);

        userScriptPlayer.setGlobalVariables({ globalValue: "bbb" });
        await fakePlayer.emit({ activeData });

        const { messages: messages2 } = (await done2)!;
        expect(messages2).toEqual([
          upstreamFirst,
          {
            topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}1`,
            receiveTime: upstreamFirst.receiveTime,
            message: { custom_np_field: "bbb", value: "bbb" },
            schemaName: "/studio_script/1",
            sizeInBytes: 0,
          },
        ]);
      });
    });
  });

  describe("node registration caching", () => {
    let fakePlayer: FakePlayer;
    let userScriptPlayer: UserScriptPlayer;
    let emit: any;
    let expectFromSource: any;
    let callCount: any;

    beforeEach(() => {
      const messageSpy = jest.spyOn(MockUserScriptPlayerWorker.prototype, "messageSpy");
      callCount = (action: any) => {
        return messageSpy.mock.calls.filter(([a]) => a === action).length;
      };

      fakePlayer = new FakePlayer();
      userScriptPlayer = new UserScriptPlayer(fakePlayer, defaultUserScriptActions);

      const topics: Topic[] = [{ name: "/np_input", schemaName: "std_msgs/Header" }];
      const datatypes = new Map(Object.entries({ foo: { definitions: [] } }));

      emit = async () => {
        await fakePlayer.emit({
          activeData: {
            ...basicPlayerState,
            messages: [upstreamFirst],
            currentTime: upstreamFirst.receiveTime,
            topics,
            datatypes,
          },
        });
      };

      expectFromSource = (messages: any, sourceIndex: number) => {
        expect(messages).toEqual([
          upstreamFirst,
          {
            topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}0`,
            receiveTime: upstreamFirst.receiveTime,
            message: { key: sourceIndex },
            schemaName: "/studio_script/0",
            sizeInBytes: 0,
          },
        ]);
      };
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    const [userNode0, userNode1, userNode2] = new Array(3).fill(0).map((_, i) => {
      return {
        name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}0`,
        sourceCode: `
          export const inputs = ["/np_input"];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}0";
          export default (): { key: number } => {
            return { key: ${i} };
          };
        `,
      };
    }) as [UserScript, UserScript, UserScript];

    it("creates node registrations when userNodes change", async () => {
      const donePromises = setListenerHelper(userScriptPlayer, 5);
      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}0` }]);

      // New node 0, needs registration
      await userScriptPlayer.setUserScripts({ nodeId0: userNode0 });
      emit();
      const { messages: messages0 } = (await donePromises[0])!;
      expectFromSource(messages0, 0);
      expect(callCount("transform")).toBe(1);
      expect(callCount("processMessage")).toBe(1);

      // New node 1, needs registration
      await userScriptPlayer.setUserScripts({ nodeId1: userNode1 });
      emit();
      const { messages: messages1 } = (await donePromises[1])!;
      expectFromSource(messages1, 1);
      expect(callCount("transform")).toBe(2);

      // Should use cached registration from 0
      await userScriptPlayer.setUserScripts({ nodeId0: userNode0 });
      emit();
      const { messages: messages2 } = (await donePromises[2])!;
      expectFromSource(messages2, 0);
      expect(callCount("transform")).toBe(2); // Still 2

      // Should use cached registration from 1
      await userScriptPlayer.setUserScripts({ nodeId0: userNode0 });
      emit();
      const { messages: messages3 } = (await donePromises[3])!;
      expectFromSource(messages3, 0);
      expect(callCount("transform")).toBe(2); // Still 2

      await userScriptPlayer.setUserScripts({ nodeId2: userNode2 });
      emit();
      const { messages: messages4 } = (await donePromises[4])!;
      expectFromSource(messages4, 2);
      expect(callCount("transform")).toBe(3);

      // We'll still call registerScript and processMessage for every emit()
      expect(callCount("registerScript")).toBe(5);
      expect(callCount("processMessage")).toBe(5);
    });

    it("re-transforms the code when topics change", async () => {
      const donePromises = setListenerHelper(userScriptPlayer, 5);
      userScriptPlayer.setSubscriptions([{ topic: `${DEFAULT_STUDIO_SCRIPT_PREFIX}0` }]);

      // New node 0, needs registration
      await userScriptPlayer.setUserScripts({ nodeId0: userNode0 });
      await emit();
      const { messages: messages0 } = (await donePromises[0])!;
      expectFromSource(messages0, 0);
      expect(callCount("transform")).toBe(1);
      expect(callCount("processMessage")).toBe(1);

      // No change to topics, no new transform
      await emit();
      expect(callCount("transform")).toBe(1);

      // Emit with new topics
      await fakePlayer.emit({
        activeData: {
          ...basicPlayerState,
          messages: [upstreamFirst],
          currentTime: upstreamFirst.receiveTime,
          topics: [{ name: "/np_input", schemaName: "std_msgs/Header" }],
          datatypes: new Map(Object.entries({ foo: { definitions: [] } })),
        },
      });
      expect(callCount("transform")).toBe(2);
    });
  });
});
