// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

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

import { Parser } from "nearley";

import { parseMessagePath } from "./parseMessagePath";

// Nearley parser returns nulls
// eslint-disable-next-line no-restricted-syntax
const MISSING = null;

describe("parseRosPath", () => {
  it("parses valid strings", () => {
    expect(parseMessagePath("/some0/nice_topic.with[99].stuff[0]")).toEqual({
      topicName: "/some0/nice_topic",
      topicNameRepr: "/some0/nice_topic",
      messagePath: [
        { type: "name", name: "with", repr: "with" },
        { type: "slice", start: 99, end: 99 },
        { type: "name", name: "stuff", repr: "stuff" },
        { type: "slice", start: 0, end: 0 },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/some0/nice_topic.with[99].stuff[0].@derivative")).toEqual({
      topicName: "/some0/nice_topic",
      topicNameRepr: "/some0/nice_topic",
      messagePath: [
        { type: "name", name: "with", repr: "with" },
        { type: "slice", start: 99, end: 99 },
        { type: "name", name: "stuff", repr: "stuff" },
        { type: "slice", start: 0, end: 0 },
      ],
      modifier: "derivative",
    });
    expect(parseMessagePath("some0/nice_topic.with[99].stuff[0]")).toEqual({
      topicName: "some0/nice_topic",
      topicNameRepr: "some0/nice_topic",
      messagePath: [
        { type: "name", name: "with", repr: "with" },
        { type: "slice", start: 99, end: 99 },
        { type: "name", name: "stuff", repr: "stuff" },
        { type: "slice", start: 0, end: 0 },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("some_nice_topic")).toEqual({
      topicName: "some_nice_topic",
      topicNameRepr: "some_nice_topic",
      messagePath: [],
      modifier: MISSING,
    });
  });

  it("parses quoted topic and field names with escapes", () => {
    expect(parseMessagePath(String.raw`"/foo/bar".baz`)).toEqual({
      topicName: "/foo/bar",
      topicNameRepr: String.raw`"/foo/bar"`,
      messagePath: [{ type: "name", name: "baz", repr: "baz" }],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`"\"/foo/bar\"".baz`)).toEqual({
      topicName: `"/foo/bar"`,
      topicNameRepr: String.raw`"\"/foo/bar\""`,
      messagePath: [{ type: "name", name: "baz", repr: "baz" }],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`"\"".baz`)).toEqual({
      topicName: `"`,
      topicNameRepr: String.raw`"\""`,
      messagePath: [{ type: "name", name: "baz", repr: "baz" }],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`"\\".baz`)).toEqual({
      topicName: "\\",
      topicNameRepr: String.raw`"\\"`,
      messagePath: [{ type: "name", name: "baz", repr: "baz" }],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`"\\a".baz`)).toEqual({
      topicName: "\\a",
      topicNameRepr: String.raw`"\\a"`,
      messagePath: [{ type: "name", name: "baz", repr: "baz" }],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`/foo."/foo/bar".baz`)).toEqual({
      topicName: "/foo",
      topicNameRepr: "/foo",
      messagePath: [
        { type: "name", name: "/foo/bar", repr: String.raw`"/foo/bar"` },
        { type: "name", name: "baz", repr: "baz" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`/foo."\"/foo/bar\"".baz`)).toEqual({
      topicName: "/foo",
      topicNameRepr: "/foo",
      messagePath: [
        { type: "name", name: `"/foo/bar"`, repr: String.raw`"\"/foo/bar\""` },
        { type: "name", name: "baz", repr: "baz" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`/foo."\"".baz`)).toEqual({
      topicName: "/foo",
      topicNameRepr: "/foo",
      messagePath: [
        { type: "name", name: `"`, repr: String.raw`"\""` },
        { type: "name", name: "baz", repr: "baz" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`/foo."\\".baz`)).toEqual({
      topicName: "/foo",
      topicNameRepr: "/foo",
      messagePath: [
        { type: "name", name: "\\", repr: String.raw`"\\"` },
        { type: "name", name: "baz", repr: "baz" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`/foo."\\a".baz`)).toEqual({
      topicName: "/foo",
      topicNameRepr: "/foo",
      messagePath: [
        { type: "name", name: "\\a", repr: String.raw`"\\a"` },
        { type: "name", name: "baz", repr: "baz" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath(String.raw`""".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`"\a".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`"\".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`"x.baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`/foo.""".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`/foo."\a".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`/foo."\".baz`)).toBeUndefined();
    expect(parseMessagePath(String.raw`/foo."x.baz`)).toBeUndefined();
  });

  it("parses slices", () => {
    expect(parseMessagePath("/topic.foo[0].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 0, end: 0 },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[1:3].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 1, end: 3 },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[1:].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 1, end: Infinity },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[:10].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 0, end: 10 },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[:].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 0, end: Infinity },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[$a].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "slice",
          start: { variableName: "a", startLoc: "/topic.foo[".length },
          end: { variableName: "a", startLoc: "/topic.foo[".length },
        },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[$a:$b].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "slice",
          start: { variableName: "a", startLoc: "/topic.foo[".length },
          end: { variableName: "b", startLoc: "/topic.foo[$a:".length },
        },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[$a:].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "slice",
          start: { variableName: "a", startLoc: "/topic.foo[".length },
          end: Infinity,
        },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[$a:5].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: { variableName: "a", startLoc: "/topic.foo[".length }, end: 5 },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[:$b].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 0, end: { variableName: "b", startLoc: "/topic.foo[:".length } },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo[2:$b].bar")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        { type: "slice", start: 2, end: { variableName: "b", startLoc: "/topic.foo[2:".length } },
        { type: "name", name: "bar", repr: "bar" },
      ],
      modifier: MISSING,
    });
  });

  it("parses filters", () => {
    expect(
      parseMessagePath(
        "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==-1}.d{bar==false}.e[:]{bar.baz==true}",
      ),
    ).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: ["bar"],
          value: "baz",
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{bar==".length,
          repr: "bar=='baz'",
          operator: "==",
        },
        { type: "name", name: "a", repr: "a" },
        {
          type: "filter",
          path: ["bar"],
          value: "baz",
          nameLoc: "/topic.foo{bar=='baz'}.a{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==".length,
          repr: 'bar=="baz"',
          operator: "==",
        },
        { type: "name", name: "b", repr: "b" },
        {
          type: "filter",
          path: ["bar"],
          value: 3n,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==".length,
          repr: "bar==3",
          operator: "==",
        },
        { type: "name", name: "c", repr: "c" },
        {
          type: "filter",
          path: ["bar"],
          value: -1n,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==".length,
          repr: "bar==-1",
          operator: "==",
        },
        { type: "name", name: "d", repr: "d" },
        {
          type: "filter",
          path: ["bar"],
          value: false,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==-1}.d{".length,
          valueLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==-1}.d{bar==".length,
          repr: "bar==false",
          operator: "==",
        },
        { type: "name", name: "e", repr: "e" },
        { type: "slice", start: 0, end: Infinity },
        {
          type: "filter",
          path: ["bar", "baz"],
          value: true,
          nameLoc: "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==-1}.d{bar==false}.e[:]{"
            .length,
          valueLoc:
            "/topic.foo{bar=='baz'}.a{bar==\"baz\"}.b{bar==3}.c{bar==-1}.d{bar==false}.e[:]{bar.baz=="
              .length,
          repr: "bar.baz==true",
          operator: "==",
        },
      ],
      modifier: MISSING,
    });
  });

  it("parses filters on top level topic", () => {
    expect(parseMessagePath("/topic{foo=='bar'}{baz==2}.a[3].b{x=='y'}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        {
          type: "filter",
          path: ["foo"],
          value: "bar",
          nameLoc: "/topic{".length,
          valueLoc: "/topic{foo==".length,
          repr: "foo=='bar'",
          operator: "==",
        },
        {
          type: "filter",
          path: ["baz"],
          value: 2n,
          nameLoc: "/topic{foo=='bar'}{".length,
          valueLoc: "/topic{foo=='bar'}{baz==".length,
          repr: "baz==2",
          operator: "==",
        },
        { type: "name", name: "a", repr: "a" },
        { type: "slice", start: 3, end: 3 },
        { type: "name", name: "b", repr: "b" },
        {
          type: "filter",
          path: ["x"],
          value: "y",
          nameLoc: "/topic{foo=='bar'}{baz==2}.a[3].b{".length,
          valueLoc: "/topic{foo=='bar'}{baz==2}.a[3].b{x==".length,
          repr: "x=='y'",
          operator: "==",
        },
      ],
      modifier: MISSING,
    });
  });

  it("parses filters with global variables", () => {
    expect(parseMessagePath("/topic.foo{bar==$}.a{bar==$my_var_1}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: ["bar"],
          value: { variableName: "", startLoc: "/topic.foo{bar==".length },
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{bar==".length,
          repr: "bar==$",
          operator: "==",
        },
        { type: "name", name: "a", repr: "a" },
        {
          type: "filter",
          path: ["bar"],
          value: { variableName: "my_var_1", startLoc: "/topic.foo{bar==$}.a{bar==".length },
          nameLoc: "/topic.foo{bar==$}.a{".length,
          valueLoc: "/topic.foo{bar==$}.a{bar==".length,
          repr: "bar==$my_var_1",
          operator: "==",
        },
      ],
      modifier: MISSING,
    });
  });

  it("parses unfinished strings", () => {
    expect(parseMessagePath("/")).toEqual({
      topicName: "/",
      topicNameRepr: "/",
      messagePath: [],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [{ type: "name", name: "", repr: "" }],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.hi.")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "hi", repr: "hi" },
        { type: "name", name: "", repr: "" },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.hi.@")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [{ type: "name", name: "hi", repr: "hi" }],
      modifier: "",
    });
    expect(parseMessagePath("/topic.foo{}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: [],
          value: undefined,
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{".length,
          repr: "",
        },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo{bar}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: ["bar"],
          value: undefined,
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{".length,
          repr: "bar",
        },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo{==1}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: [],
          value: 1n,
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{==".length,
          repr: "==1",
          operator: "==",
        },
      ],
      modifier: MISSING,
    });
    expect(parseMessagePath("/topic.foo{==-3}")).toEqual({
      topicName: "/topic",
      topicNameRepr: "/topic",
      messagePath: [
        { type: "name", name: "foo", repr: "foo" },
        {
          type: "filter",
          path: [],
          value: -3n,
          nameLoc: "/topic.foo{".length,
          valueLoc: "/topic.foo{==".length,
          repr: "==-3",
          operator: "==",
        },
      ],
      modifier: MISSING,
    });
  });

  it("parses simple valid strings", () => {
    expect(parseMessagePath("blah")).toBeDefined();
    expect(parseMessagePath("100")).toBeDefined();
    expect(parseMessagePath("blah.blah")).toBeDefined();
  });

  it("returns undefined for invalid strings", () => {
    expect(parseMessagePath("[100]")).toBeUndefined();
    expect(parseMessagePath("[-100]")).toBeUndefined();
    expect(parseMessagePath("/topic.no.2d.arrays[0][1]")).toBeUndefined();
    expect(parseMessagePath("/topic.foo[].bar")).toBeUndefined();
    expect(parseMessagePath("/topic.foo[bar]")).toBeUndefined();
    expect(parseMessagePath("/topic.foo{bar==}")).toBeUndefined();
    expect(parseMessagePath("/topic.foo{bar==baz}")).toBeUndefined();
  });

  it("uses the cached value instead of parse the path again", () => {
    jest.mock("nearley");
    const parserFeedSpy = jest.spyOn(Parser.prototype, "feed");

    const path = "/some/topic";

    const firstResult = parseMessagePath(path);
    const secondResult = parseMessagePath(path);
    const thirdResult = parseMessagePath(path);

    expect(secondResult).toEqual(firstResult);
    expect(thirdResult).toEqual(firstResult);

    // Verify that the Parser constructor was only called once
    expect(parserFeedSpy).toHaveBeenCalledTimes(1);

    jest.unmock("nearley");
  });
});
