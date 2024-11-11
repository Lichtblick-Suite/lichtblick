/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { renderHook } from "@testing-library/react";

import { useBlocksSubscriptions } from "@lichtblick/suite-base/PanelAPI";
import { MessageBlock } from "@lichtblick/suite-base/PanelAPI/useBlocksSubscriptions";
import { useDecodeMessagePathsForMessagesByTopic } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import RosTimeBuilder from "@lichtblick/suite-base/testing/builders/RosTimeBuilder";

import { useDecodedBlocks } from "./useDecodedBlocks";
import { StateTransitionPath } from "../types";

// Mock dependencies
jest.mock("@lichtblick/suite-base/PanelAPI");
jest.mock("@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems");
jest.mock("@lichtblick/suite-base/players/subscribePayloadFromMessagePath");

describe("useDecodedBlocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return decoded blocks", () => {
    const paths: StateTransitionPath[] = [
      {
        timestampMethod: "receiveTime",
        value: "/unit/test1",
        enabled: true,
        label: "test 1",
      },
      {
        timestampMethod: "receiveTime",
        value: "/unit/test2",
        enabled: true,
        label: "test 2",
      },
      {
        timestampMethod: "headerStamp",
        value: "/unit/test2",
        enabled: true,
        label: "test with headerstamp",
      },
    ];

    const mockBlocks: MessageBlock[] = [
      {
        topic1: [
          {
            message: BasicBuilder.string(),
            receiveTime: RosTimeBuilder.time(),
            schemaName: BasicBuilder.string(),
            sizeInBytes: BasicBuilder.number(),
            topic: BasicBuilder.string(),
          },
          {
            message: BasicBuilder.string(),
            receiveTime: RosTimeBuilder.time(),
            schemaName: BasicBuilder.string(),
            sizeInBytes: BasicBuilder.number(),
            topic: BasicBuilder.string(),
          },
        ],
      },
      {
        topic2: [
          {
            message: BasicBuilder.string(),
            receiveTime: RosTimeBuilder.time(),
            schemaName: BasicBuilder.string(),
            sizeInBytes: BasicBuilder.number(),
            topic: BasicBuilder.string(),
          },
          {
            message: BasicBuilder.string(),
            receiveTime: RosTimeBuilder.time(),
            schemaName: BasicBuilder.string(),
            sizeInBytes: BasicBuilder.number(),
            topic: BasicBuilder.string(),
          },
        ],
      },
    ];
    const mockDecodeMessagePathsForMessagesByTopic = jest.fn().mockImplementation((blocks) => {
      return blocks;
    });

    (useBlocksSubscriptions as jest.Mock).mockReturnValue(mockBlocks);

    (useDecodeMessagePathsForMessagesByTopic as jest.Mock).mockReturnValue(
      mockDecodeMessagePathsForMessagesByTopic,
    );

    const { result } = renderHook(() => useDecodedBlocks(paths));

    expect(useBlocksSubscriptions).toHaveBeenCalledWith([]);
    expect(mockDecodeMessagePathsForMessagesByTopic).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual(mockBlocks);
  });

  it("should handle empty paths", () => {
    const mockDecodeMessagePathsForMessagesByTopic = jest.fn().mockImplementation((blocks) => {
      return blocks[0];
    });

    (useDecodeMessagePathsForMessagesByTopic as jest.Mock).mockReturnValue(
      mockDecodeMessagePathsForMessagesByTopic,
    );

    const { result } = renderHook(() => useDecodedBlocks([]));

    expect(result.current).toEqual([]);
    expect(useBlocksSubscriptions).toHaveBeenCalledWith([]);
  });
});
