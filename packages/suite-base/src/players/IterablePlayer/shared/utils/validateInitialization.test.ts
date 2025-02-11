// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Initialization } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import InitilizationSourceBuilder from "@lichtblick/suite-base/testing/builders/InitilizationSourceBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

import {
  validateOverlap,
  validateAndAddNewDatatypes,
  validateAndAddNewTopics,
} from "./validateInitialization";

describe("validateInitialization", () => {
  let accumulated: Initialization;
  let current: Initialization;

  beforeEach(() => {
    accumulated = InitilizationSourceBuilder.initialization();
    current = InitilizationSourceBuilder.initialization();
  });

  describe("validateOverlap", () => {
    it.each<[number, number]>([
      [15, 25], // starts inside
      [5, 15], // ends inside
      [5, 25], // wraps around
      [12, 18], // fully inside
    ])(
      "should add a warning if the current MCAP overlaps with the accumulated range",
      (startSec, endSec) => {
        const loadedTimes = [
          {
            start: RosTimeBuilder.time({ sec: 10, nsec: 0 }),
            end: RosTimeBuilder.time({ sec: 20, nsec: 0 }),
          },
        ];

        current.start = RosTimeBuilder.time({ sec: startSec, nsec: 0 });
        current.end = RosTimeBuilder.time({ sec: endSec, nsec: 0 });

        validateOverlap(loadedTimes, current, accumulated);

        expect(accumulated.problems).toHaveLength(1);
        expect(accumulated.problems[0]!.message).toBe(
          "MCAP time overlap detected. Some functionalities may not work as expected.",
        );
      },
    );

    it.each<[number, number]>([
      [0, 5], // before
      [5, 10], // before and touching
      [25, 30], // after
      [20, 25], // after and touching
    ])("should not add a warning if there is no overlap", (startSec, endSec) => {
      const loadedTimes = [
        {
          start: RosTimeBuilder.time({ sec: 10, nsec: 0 }),
          end: RosTimeBuilder.time({ sec: 20, nsec: 0 }),
        },
      ];
      current.start = RosTimeBuilder.time({ sec: startSec, nsec: 0 });
      current.end = RosTimeBuilder.time({ sec: endSec, nsec: 0 });

      validateOverlap(loadedTimes, current, accumulated);

      expect(accumulated.problems).toHaveLength(0);
    });

    it.each<[number, number]>([
      [22, 28], // in between
      [20, 30], // in between and touching
      [20, 28], // in between and touching the start
      [22, 30], // in between and touching the end
    ])(
      "should not add a warning if the current MCAP is between two loaded times",
      (startSec, endSec) => {
        const loadedTimes = [
          {
            start: RosTimeBuilder.time({ sec: 10, nsec: 0 }),
            end: RosTimeBuilder.time({ sec: 20, nsec: 0 }),
          },
          {
            start: RosTimeBuilder.time({ sec: 30, nsec: 0 }),
            end: RosTimeBuilder.time({ sec: 40, nsec: 0 }),
          },
        ];

        current.start = RosTimeBuilder.time({ sec: startSec, nsec: 0 });
        current.end = RosTimeBuilder.time({ sec: endSec, nsec: 0 });

        validateOverlap(loadedTimes, current, accumulated);

        expect(accumulated.problems).toHaveLength(0);
      },
    );
  });

  describe("validateAndAddDatatypes", () => {
    it("should add a warning if there is a datatype mismatch", () => {
      const datatype = "example_datatype";
      const accumulatedDefinition: OptionalMessageDefinition = {
        definitions: [{ name: "field1", type: "string" }],
      };
      const currentDefinition: OptionalMessageDefinition = {
        definitions: [{ name: "field1", type: "int32" }],
      };

      accumulated.datatypes.set(datatype, accumulatedDefinition);
      current.datatypes.set(datatype, currentDefinition);

      validateAndAddNewDatatypes(accumulated, current);

      expect(accumulated.datatypes.get(datatype)).toEqual(accumulatedDefinition);

      expect(accumulated.problems).toHaveLength(1);
      expect(accumulated.problems[0]!.message).toBe(
        `Datatype mismatch detected for "${datatype}". Merging may cause issues.`,
      );
    });

    it("should not add a warning if datatypes are consistent", () => {
      const datatype = "example_datatype";
      const definition: OptionalMessageDefinition = {
        definitions: [{ name: "field1", type: "string" }],
      };

      accumulated.datatypes.set(datatype, definition);
      current.datatypes.set(datatype, definition);

      validateAndAddNewDatatypes(accumulated, current);

      expect(accumulated.problems).toHaveLength(0);
      expect(accumulated.datatypes.get(datatype)).toEqual(definition);
    });

    it("should not add a warning for new datatypes", () => {
      const datatype = "new_datatype";
      const definition: OptionalMessageDefinition = {
        definitions: [{ name: "field1", type: "string" }],
      };

      current.datatypes.set(datatype, definition);

      validateAndAddNewDatatypes(accumulated, current);

      expect(accumulated.problems).toHaveLength(0);

      expect(accumulated.datatypes.get(datatype)).toEqual(definition);
    });

    describe("validateAndAddTopics", () => {
      it("should add a warning if there is a schema name mismatch", () => {
        const topicName = BasicBuilder.string();

        const accumulatedTopic = { name: topicName, schemaName: "schema1" };
        const currentTopic = { name: topicName, schemaName: "schema2" };

        accumulated.topics.push(accumulatedTopic);
        current.topics.push(currentTopic);

        validateAndAddNewTopics(accumulated, current);

        expect(accumulated.topics).toEqual([accumulatedTopic]);

        expect(accumulated.problems).toHaveLength(1);
        expect(accumulated.problems[0]!.message).toBe(
          `Schema name mismatch detected for topic "${topicName}". Expected "schema1", but found "schema2".`,
        );
      });

      it("should not add a warning if schema names are consistent", () => {
        const topicName = BasicBuilder.string();
        const schemaName = BasicBuilder.string();

        const topic = { name: topicName, schemaName };

        accumulated.topics.push(topic);
        current.topics.push(topic);

        validateAndAddNewTopics(accumulated, current);

        expect(accumulated.problems).toHaveLength(0);

        expect(accumulated.topics).toEqual([topic]);
      });

      it("should not add a warning for new topics", () => {
        const topicName = BasicBuilder.string();
        const topic = { name: topicName, schemaName: BasicBuilder.string() };

        accumulated.topics = [];
        current.topics.push(topic);

        validateAndAddNewTopics(accumulated, current);

        expect(accumulated.topics).toEqual([topic]);
        expect(accumulated.problems).toHaveLength(0);
      });

      it("should add all topics for multiple topics per MCAP", () => {
        const topic1 = { name: "topic1", schemaName: "schema1" };
        const topic2 = { name: "topic2", schemaName: "schema2" };
        const topic3 = { name: "topic3", schemaName: "schema3" };
        const topic4 = { name: "topic4", schemaName: "schema4" };
        const topic5 = { name: "topic4", schemaName: "schema4" };

        accumulated.topics = [];

        current.topics = [topic1, topic2];
        validateAndAddNewTopics(accumulated, current);

        current.topics = [topic3, topic4, topic5];
        validateAndAddNewTopics(accumulated, current);

        expect(accumulated.topics).toEqual([topic1, topic2, topic3, topic4]);
        expect(accumulated.problems).toHaveLength(0);
      });
    });
  });
});
