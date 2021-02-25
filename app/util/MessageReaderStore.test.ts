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

import { MessageReader } from "rosbag";

import MessageReaderStore from "./MessageReaderStore";

describe("MessageReaderStore", () => {
  it("returns message reader for connection", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
  });

  it("returns the same reader for the same md5", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/topic", "foo", "bar");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).toBe(reader2);
  });

  it("returns a new reader if the md5 changes", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/topic", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/topic", "bar", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
  });

  it("returns different reader for different type", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/foo", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/bar", "foo", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
  });

  it("purges old readers", () => {
    const store = new MessageReaderStore();
    const reader = store.get("/standard_msg/foo", "foo", "");
    expect(reader).toBeInstanceOf(MessageReader);
    const reader2 = store.get("/standard_msg/foo", "bar", "");
    expect(reader2).toBeInstanceOf(MessageReader);
    expect(reader).not.toBe(reader2);
    expect(Object.keys(store.storage)).toHaveLength(1);
  });
});
