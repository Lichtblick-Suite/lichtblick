/**
 * @jest-environment jsdom
 */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import "@testing-library/jest-dom";

import { render} from "@testing-library/react";

import { useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";
import { PlayerPresence } from "@lichtblick/suite-base/players/types";
import { TopicListItem } from "./useTopicListSearch";
import { getDraggedMessagePath, TopicList } from "./TopicList";

// Mock dependencies
jest.mock("@lichtblick/suite-base/components/MessagePipeline");
jest.mock("./useTopicListSearch");
jest.mock("./useMultiSelection", () => ({
  useMultiSelection: jest.fn().mockReturnValue({ selectedIndexes: [] }),
}));

// Mock for useMessagePipeline
const mockUseMessagePipeline = (playerPresence: PlayerPresence) => {
  (useMessagePipeline as jest.Mock).mockReturnValue(playerPresence);
};
// Helper to render TopicList with default mocks
const setup = (playerPresence: PlayerPresence) => {
  mockUseMessagePipeline(playerPresence);
  return render(<TopicList />);
};

// Helper to render and get text
const renderAndGetText = (playerPresence: PlayerPresence, text: string) => {
  const { getByText } = setup(playerPresence);
  expect(getByText(text)).toBeInTheDocument();
};

describe("TopicList Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders EmptyState when playerPresence is NOT_PRESENT", () => {
    renderAndGetText(PlayerPresence.NOT_PRESENT, "No data source selected");
  });

  it("renders EmptyState when playerPresence is ERROR", () => {
    renderAndGetText(PlayerPresence.ERROR, "An error occurred");
  });

  it("renders loading state when playerPresence is INITIALIZING", () => {
    const { getByPlaceholderText, getAllByRole } = setup(PlayerPresence.INITIALIZING);
    expect(getByPlaceholderText("Waiting for data…")).toBeInTheDocument();
    expect(getAllByRole("listitem")).toHaveLength(16);
  });
});

describe("getDraggedMessagePath", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testDraggedMessagePath = (treeItem: TopicListItem, expectedPath: object) => {
    const result = getDraggedMessagePath(treeItem);
    expect(result).toEqual(expectedPath);
  };

  it("should return correct path for topic type", () => {
    const treeItem: TopicListItem = {
      type: "topic",
      item: {
        item: {
          name: "testTopic",
          schemaName: "testSchema",
        },
        positions: new Set<number>(),
        start: 0,
        end: 0,
        score: 0,
      },
    };
    testDraggedMessagePath(treeItem, {
      path: "testTopic",
      rootSchemaName: "testSchema",
      isTopic: true,
      isLeaf: false,
      topicName: "testTopic",
    });
  });

  it("should return correct path for schema type", () => {
    const treeItem: TopicListItem = {
      type: "schema",
      item: {
        item: {
          fullPath: "test/full/path",
          topic: {
            schemaName: "testSchema",
            name: "testTopic",
          },
          offset: 0,
          suffix: {
            isLeaf: true,
            pathSuffix: "",
            type: ""
          },
        },
        positions: new Set<number>(),
        start: 0,
        end: 0,
        score: 0,
      },
    };
    testDraggedMessagePath(treeItem, {
      path: "test/full/path",
      rootSchemaName: "testSchema",
      isTopic: false,
      isLeaf: true,
      topicName: "testTopic",
    });
  });
});
