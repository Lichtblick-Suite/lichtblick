// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { get } from "http";

import { MultiSource } from "@lichtblick/suite-base/players/IterablePlayer/shared/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import InitilizationSourceBuilder from "@lichtblick/suite-base/testing/builders/InitilizationSourceBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";

import { MultiIterableSource } from "./MultiIterableSource";
import { IIterableSource, Initalization } from "../IIterableSource";

describe("MultiIterableSource", () => {
  let mockSourceConstructor: jest.Mock;
  let dataSource: MultiSource;

  beforeEach(() => {
    mockSourceConstructor = jest.fn().mockImplementation(
      () =>
        ({
          initialize: jest.fn(),
          messageIterator: jest.fn(),
          getBackfillMessages: jest.fn(),
          getStart: jest.fn(),
        }) as unknown as jest.Mocked<IIterableSource>,
    );

    dataSource = {
      type: "files",
      files: [new Blob(), new Blob()],
    };
  });

  describe("Initialization", () => {
    const mockInitialization = (initialization: Initalization) => {
      mockSourceConstructor.mockImplementationOnce(() => ({
        initialize: jest.fn().mockResolvedValue(initialization),
        getStart: jest.fn().mockReturnValue(initialization.start),
      }));
    };
    it("should merge initializations correctly with no problems", async () => {
      const multiSource = new MultiIterableSource(dataSource, mockSourceConstructor);

      const dataTypeName = BasicBuilder.string();
      const dataType = { definitions: [{ name: "field1", type: "int64" }] };
      const topicName = BasicBuilder.string();
      const topic = { name: topicName, schemaName: BasicBuilder.string() };

      const init1 = InitilizationSourceBuilder.initialization({
        start: RosTimeBuilder.time({ sec: 0 }),
        end: RosTimeBuilder.time({ sec: 20, nsec: 0 }),
        datatypes: new Map([[dataTypeName, dataType]]),
        topics: [topic],
        topicStats: new Map([[topicName, { numMessages: 10 }]]),
        metadata: [{ name: "key", metadata: { key: "value" } }],
      });

      const init2 = InitilizationSourceBuilder.initialization({
        start: RosTimeBuilder.time({ sec: 20, nsec: 0 }),
        end: RosTimeBuilder.time({ sec: 40 }),
        datatypes: new Map([[dataTypeName, dataType]]),
        topics: [topic],
        topicStats: new Map([[topicName, { numMessages: 20 }]]),
        metadata: [{ name: "key", metadata: { key: "value2" } }],
      });

      mockInitialization(init1);
      mockInitialization(init2);

      const result = await multiSource.initialize();

      expect(result.start.sec).toBe(0);
      expect(result.end.sec).toBe(40);
      expect(result.datatypes.size).toBe(1);
      expect(result.topics.length).toBe(1);
      expect(result.topicStats.size).toBe(1);
      expect(result.topicStats.get(topicName)!.numMessages).toBe(30);
      expect(result.name).toBe(init2.name);
      expect(result.metadata!.length).toBe(2);
      expect(result.metadata).toContainEqual(init1.metadata![0]);
      expect(result.metadata).toContainEqual(init2.metadata![0]);
      expect(result.profile).toBe(init2.profile);
      expect(result.problems.length).toBe(0);
    });

    it("should merge initializations, but containing problems", async () => {
      const multiSource = new MultiIterableSource(dataSource, mockSourceConstructor);

      const dataTypeName = BasicBuilder.string();
      const topicName = BasicBuilder.string();

      const init1 = InitilizationSourceBuilder.initialization({
        start: RosTimeBuilder.time({ sec: 0 }),
        end: RosTimeBuilder.time({ sec: 20 }),
        datatypes: new Map([[dataTypeName, { definitions: [{ name: "field1", type: "int64" }] }]]),
        topics: [{ name: topicName, schemaName: BasicBuilder.string() }],
      });

      const init2 = InitilizationSourceBuilder.initialization({
        start: RosTimeBuilder.time({ sec: 10 }),
        end: RosTimeBuilder.time({ sec: 30 }),
        datatypes: new Map([[dataTypeName, { definitions: [{ name: "field1", type: "string" }] }]]),
        topics: [{ name: topicName, schemaName: BasicBuilder.string() }],
      });

      mockInitialization(init1);
      mockInitialization(init2);

      const result = await multiSource.initialize();

      expect(result.start.sec).toBe(0);
      expect(result.end.sec).toBe(30);
      expect(result.datatypes.size).toBe(1);
      expect(result.topics.length).toBe(1);

      expect(result.problems.length).toBe(3);
      expect(result.problems[0]!.message).toBe(
        "MCAP time overlap detected. Some functionalities may not work as expected.",
      );

      expect(result.problems[1]!.message).toBe(
        `Datatype mismatch detected for "${dataTypeName}". Merging may cause issues.`,
      );

      expect(result.problems[2]!.message).toBe(
        `Schema name mismatch detected for topic "${topicName}". Expected "${init1.topics[0]!.schemaName}", but found "${init2.topics[0]!.schemaName}".`,
      );
    });
  });
});
