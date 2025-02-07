// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { MessagePathFilter, OperatorType } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { filterMatches } from "./filterMatches";

describe("filterMatches", () => {
  function setup(
    overrides: Partial<MessagePathFilter> = {},
    operator: OperatorType = "==",
  ): Immutable<MessagePathFilter> {
    return {
      path: ["a"],
      value: undefined,
      operator,
      type: "filter",
      nameLoc: BasicBuilder.number(),
      valueLoc: BasicBuilder.number(),
      repr: "",
      ...overrides,
    };
  }

  it("returns false for undefined filter value", () => {
    const filter = setup();
    expect(filterMatches(filter, { a: 1 })).toBe(false);
  });

  it("returns false for non-matching value", () => {
    const filter = setup({ value: 2 });
    expect(filterMatches(filter, { a: 1 })).toBe(false);
  });

  it("returns true for matching value", () => {
    const filter = setup({ value: 1 });
    expect(filterMatches(filter, { a: 1 })).toBe(true);
  });

  it("returns false for non-matching nested value", () => {
    const filter = setup({ path: ["a", "b"], value: 2 });
    expect(filterMatches(filter, { a: { b: 1 } })).toBe(false);
  });

  it("returns true for matching nested value", () => {
    const filter = setup({ path: ["a", "b"], value: 1 });
    expect(filterMatches(filter, { a: { b: 1 } })).toBe(true);
  });

  it("returns false for undefined nested value", () => {
    const filter = setup({ path: ["a", "b"], value: 1 });
    expect(filterMatches(filter, { a: {} })).toBe(false);
  });

  it("returns false for invalid operator", () => {
    const filter = setup({ value: 1, operator: "invalid" as any });
    expect(filterMatches(filter, { a: 1 })).toBe(false);
  });

  it("returns false for non-matching value with <", () => {
    const filter = setup({ value: 1 }, "<");
    expect(filterMatches(filter, { a: 2 })).toBe(false);
  });

  it("returns true for matching value with <", () => {
    const filter = setup({ value: 2 }, "<");
    expect(filterMatches(filter, { a: 1 })).toBe(true);
  });

  it("returns false for non-matching value with >", () => {
    const filter = setup({ value: 2 }, ">");
    expect(filterMatches(filter, { a: 1 })).toBe(false);
  });

  it("returns true for matching value with >", () => {
    const filter = setup({ value: 1 }, ">");
    expect(filterMatches(filter, { a: 2 })).toBe(true);
  });

  it("returns false for matching value with !=", () => {
    const filter = setup({ value: 1 }, "!=");
    expect(filterMatches(filter, { a: 1 })).toBe(false);
  });

  it("returns true for non-matching value with !=", () => {
    const filter = setup({ value: 1 }, "!=");
    expect(filterMatches(filter, { a: 2 })).toBe(true);
  });
});
