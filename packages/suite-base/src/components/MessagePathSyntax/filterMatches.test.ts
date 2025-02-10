// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { MessagePathFilter, OperatorType } from "@lichtblick/message-path";
import { Immutable } from "@lichtblick/suite";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { filterMatches } from "./filterMatches";

describe("filterMatches", () => {
  function setup(
    overrides: Partial<MessagePathFilter> = {},
    operator: OperatorType,
  ): Immutable<MessagePathFilter> {
    return {
      path: ["a"],
      value: BasicBuilder.number(),
      operator,
      type: "filter",
      nameLoc: BasicBuilder.number(),
      valueLoc: BasicBuilder.number(),
      repr: "",
      ...overrides,
    };
  }

  describe("value matching", () => {
    it("returns false for undefined filter value", () => {
      const filter = setup({ value: undefined }, "==");
      expect(filterMatches(filter, { a: BasicBuilder.number() })).toBe(false);
    });

    it("returns false for non-matching value", () => {
      const value = BasicBuilder.number();
      const secondValue = BasicBuilder.number();
      const filter = setup({ value }, "==");
      expect(filterMatches(filter, { a: secondValue })).toBe(false);
    });

    it("returns true for matching value", () => {
      const value = BasicBuilder.number();
      const filter = setup({ value }, "==");
      expect(filterMatches(filter, { a: value })).toBe(true);
    });

    it("returns false for undefined currentValue in path", () => {
      const filter = setup({ path: ["a", "b"], value: BasicBuilder.number() }, "==");
      expect(filterMatches(filter, { a: undefined })).toBe(false);
    });
  });

  describe("nested value matching", () => {
    it("returns false for non-matching or missing nested value", () => {
      const filter = setup({ path: ["a", "b"], value: BasicBuilder.number() }, "==");
      expect(filterMatches(filter, { a: { b: BasicBuilder.number() } })).toBe(false);
      expect(filterMatches(filter, { a: {} })).toBe(false);
      expect(filterMatches(filter, { a: { b: {} } })).toBe(false);
    });

    it("returns true for matching nested value", () => {
      const value = BasicBuilder.number();
      const filter = setup({ path: ["a", "b"], value }, "==");
      expect(filterMatches(filter, { a: { b: value } })).toBe(true);
    });

    it("returns false for undefined currentValue in nested path", () => {
      const filter = setup({ path: ["a", "b"], value: BasicBuilder.number() }, "==");
      expect(filterMatches(filter, { a: { b: undefined } })).toBe(false);
    });
  });

  describe("operator matching", () => {
    it.each([
      ["==", 1, 1, true],
      ["==", 1, 2, false],
      ["!=", 1, 1, false],
      ["!=", 1, 2, true],
      [">", 2, 1, true],
      [">=", 2, 1, true],
      [">=", 1, 1, true],
      [">=", 1, 2, false],
      ["<", 1, 2, true],
      ["<", 2, 1, false],
      ["<=", 1, 2, true],
      ["<=", 1, 1, true],
      ["<=", 2, 1, false],
    ])("returns %s for %s %s %s", (operator, testValue, filterValue, expected) => {
      const filter = setup({ value: filterValue }, operator as OperatorType);
      expect(filterMatches(filter, { a: testValue })).toBe(expected);
    });

    it("returns false for invalid operator", () => {
      const filter = setup({ value: BasicBuilder.number(), operator: "invalid" as any }, "==");
      expect(filterMatches(filter, { a: BasicBuilder.number() })).toBe(false);
    });

    it("returns false for undefined currentValue", () => {
      const filter = setup({ value: BasicBuilder.number() }, "==");
      expect(filterMatches(filter, { a: undefined })).toBe(false);
    });
  });

  describe("handling undefined or empty values", () => {
    it("returns false when currentValue is undefined or an empty object", () => {
      const filter = setup({}, "==");
      expect(filterMatches(filter, {})).toBe(false);
      expect(filterMatches(filter, { a: {} })).toBe(false);
    });

    it("returns true when currentValue is a valid nested object", () => {
      const value = BasicBuilder.number();
      const filter = setup({ path: ["a", "b"], value }, "==");
      expect(filterMatches(filter, { a: { b: value } })).toBe(true);
    });
  });
});
