// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as _ from "lodash-es";

import { MessageEvent } from "@lichtblick/suite";
import { MessageAndData } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import MessageEventBuilder from "@lichtblick/suite-base/testing/builders/MessageEventBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { TimestampMethod } from "@lichtblick/suite-base/util/time";

import {
  extractQueriedData,
  isValueNotANumberOrString,
  isValidValue,
  getColor,
  createLabel,
  baseColors,
  messagesToDataset,
} from "./messagesToDataset";
import { MessageDatasetArgs, StateTransitionPath } from "./types";

const messageEventMock = MessageEventBuilder.messageEvent({
  message: {
    test_property1: false,
    test_property2: undefined,
    test_property3: false,
    test_property4: undefined,
    test_property5: false,
    test_property6: undefined,
    test_property7: false,
    test_property8: undefined,
    test_property9: false,
    test_property0: 0,
    test_property11: false,
  },
});

const mockMessageEvent: MessageEvent = {
  topic: "/test/message_topic_test",
  schemaName: "Unit.test.SchemaName",
  // receiveTime: { nsec: 234857428, sec: 37628636 },
  receiveTime: RosTimeBuilder.time(),
  sizeInBytes: 152,
  message: messageEventMock,
};

const mockPath: StateTransitionPath = {
  label: "Test Label",
  value: "/test/debug/unitTest.",
  timestampMethod: BasicBuilder.sample(["receiveTime", "headerStamp"] as TimestampMethod[]),
};

function MessageAndDataBuilder(
  messageEvent: MessageEvent,
  value: number,
  path: string,
  constantName: string,
): MessageAndData {
  return {
    messageEvent,
    queriedData: [{ value, path, constantName }],
  };
}

const item: MessageAndData = {
  messageEvent: mockMessageEvent,
  queriedData: [{ value: BasicBuilder.number(), path: BasicBuilder.string() }],
};

describe("messagesToDataset helper functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // unit tests for extractQueriedData

  it("should return the first item when queriedData has exactly one item", () => {
    const result = extractQueriedData(item);

    expect(result).toEqual(item.queriedData[0]);
  });

  it("should return undefined when queriedData's argument has an empty array", () => {
    const mockMessageAndDataWithEmptyQueriedData: MessageAndData = {
      messageEvent: mockMessageEvent,
      queriedData: [],
    };

    const result = extractQueriedData(mockMessageAndDataWithEmptyQueriedData);

    expect(result).toEqual(undefined);
  });

  it("should return undefined when queriedData's argument has more than one item", () => {
    const mockMessageAndDataWithMultipleItemsOnQueriedData: MessageAndData = {
      messageEvent: mockMessageEvent,
      queriedData: [
        { value: BasicBuilder.number(), path: BasicBuilder.string() },
        { value: BasicBuilder.number(), path: BasicBuilder.string() },
      ],
    };

    const result = extractQueriedData(mockMessageAndDataWithMultipleItemsOnQueriedData);

    expect(result).toEqual(undefined);
  });

  // unit tests for isValueNotANumberOrString

  it("should return true for NaN", () => {
    const value = NaN;
    expect(isValueNotANumberOrString(value)).toBe(true);
  });

  it("should return false for string", () => {
    const value = BasicBuilder.string();
    expect(isValueNotANumberOrString(value)).toBe(false);
  });

  it("should return false for number", () => {
    const value = BasicBuilder.number();
    expect(isValueNotANumberOrString(value)).toBe(false);
  });

  it("should return false for undefined", () => {
    const value = undefined;
    expect(isValueNotANumberOrString(value)).toBe(false);
  });

  // unit tests for isValidValue
  it("should return false for object, not a valid value", () => {
    const value = {};
    expect(isValidValue(value)).toBe(false);
  });

  it("should return true for number", () => {
    const value = BasicBuilder.number();
    expect(isValidValue(value)).toBe(true);
  });

  it("should return true for string", () => {
    const value = BasicBuilder.string();
    expect(isValidValue(value)).toBe(true);
  });

  it("should return true for bigInt", () => {
    const value = BasicBuilder.bigInt();
    expect(isValidValue(value)).toBe(true);
  });

  it("should return true for boolean", () => {
    const value = BasicBuilder.boolean();
    expect(isValidValue(value)).toBe(true);
  });

  it("should return false for undefined, not a valid value", () => {
    const value = undefined;
    expect(isValidValue(value)).toBe(false);
  });

  // unit tests for getColorForValue

  it("should return a color for a string input", () => {
    const value = BasicBuilder.string();
    const result = getColor(value);

    expect(baseColors).toContain(result);
  });

  it("should return a color for a number input", () => {
    const value = BasicBuilder.number();
    const result = getColor(value);

    expect(baseColors).toContain(result);
  });

  it("should return a color for a boolean input", () => {
    const value = BasicBuilder.boolean();
    const result = getColor(value);

    expect(baseColors).toContain(result);
  });

  it("should return a color for a bigInt input", () => {
    const value = BasicBuilder.bigInt();
    const result = getColor(value);

    expect(baseColors).toContain(result);
  });

  // unit tests for getColorForValue

  it("should return the label with constant name and value when constantName is string type", () => {
    const stringConst = BasicBuilder.string();
    const value = BasicBuilder.number();
    const result = createLabel(stringConst, value);

    expect(result).toBe(`${stringConst} (${String(value)})`);
  });

  it("should return the label only with value when constantName is undefined", () => {
    const stringConst = undefined;
    const value = BasicBuilder.number();
    const result = createLabel(stringConst, value);

    expect(result).toBe(String(value));
  });

  it("should return the label with constant name and value when constantName is boolean type", () => {
    const stringConst = BasicBuilder.string();
    const value = BasicBuilder.boolean();
    const result = createLabel(stringConst, value);

    expect(result).toBe(`${stringConst} (${String(value)})`);
  });

  it("should return the label with constant name and value when constantName is number type", () => {
    const stringConst = BasicBuilder.string();
    const value = BasicBuilder.number();
    const result = createLabel(stringConst, value);

    expect(result).toBe(`${stringConst} (${String(value)})`);
  });

  it("should return the label with constant name and value when constantName is bigInt type", () => {
    const stringConst = BasicBuilder.string();
    const value = BasicBuilder.bigInt();
    const result = createLabel(stringConst, value);

    expect(result).toBe(`${stringConst} (${String(value)})`);
  });
});

describe("messagesToDataset", () => {
  const mockArgs = {
    path: mockPath,
    startTime: { nsec: 234857428, sec: 37628636 },
    y: 50,
    pathIndex: 40,
    blocks: [],
    showPoints: false,
    timestampMethod: mockPath,
  };

  it("should initialize dataset with default properties", () => {
    const result = messagesToDataset(mockArgs);

    expect(result).toEqual(
      expect.objectContaining({
        borderWidth: 10,
        data: [],
        label: "Test Label",
        pointBackgroundColor: "rgba(0, 0, 0, 0.4)",
        pointBorderColor: "transparent",
        pointHoverRadius: 3,
        pointRadius: 0,
        pointStyle: "circle",
        showLine: true,
      }),
    );
  });

  it("should return an empty data array if blocks are empty", () => {
    const result = messagesToDataset({ ...mockArgs, blocks: [] });
    expect(result.data).toEqual([]);
  });

  it("should add data points when blocks contain valid messages", () => {
    const queriedDataValue = BasicBuilder.number();
    const queriedDataName = BasicBuilder.string();
    const queriedDataPath = BasicBuilder.string();
    //forcing path.timestampMethod to be receiveTime for this specific unit test, headerStamp wont work here
    const argsDataset: MessageDatasetArgs = {
      ...mockArgs,
      path: { ...mockArgs.path, timestampMethod: "receiveTime" },
    };
    const blocks: MessageAndData[][] = [
      [MessageAndDataBuilder(messageEventMock, queriedDataValue, queriedDataPath, queriedDataName)],
    ];
    _.merge(argsDataset, { blocks });

    const result = messagesToDataset(argsDataset);

    expect(result.data[0]).toStrictEqual({
      x: expect.any(Number),
      y: 50,
      label: `${queriedDataName} (${queriedDataValue})`,
      labelColor: expect.any(String),
      value: queriedDataValue,
      constantName: queriedDataName,
    });
  });

  it("should push lastDatum to dataset.data if isNewSegment is true", () => {
    const randomValue = BasicBuilder.number();
    const randomConst = BasicBuilder.string();

    const mockBlocks = [
      [
        {
          messageEvent: mockMessageEvent,
          queriedData: [
            { value: randomValue, path: BasicBuilder.string(), constantName: randomConst },
          ],
        },
      ],
    ];

    const result = messagesToDataset({
      ...mockArgs,
      blocks: mockBlocks,
      path: { ...mockArgs.path, timestampMethod: "receiveTime" },
    });

    expect(result.data[0]).toEqual(expect.objectContaining({ value: randomValue }));
  });
});
