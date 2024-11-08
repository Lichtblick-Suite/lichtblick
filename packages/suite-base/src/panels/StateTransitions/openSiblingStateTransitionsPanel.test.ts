// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StateTransitionConfig } from "@lichtblick/suite-base/panels/StateTransitions/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import { OpenSiblingPanel } from "@lichtblick/suite-base/types/panels";

import { openSiblingStateTransitionsPanel } from "./openSiblingStateTransitionsPanel";

describe("openSiblingStateTransitionsPanel", () => {
  let mockOpenSiblingPanel: OpenSiblingPanel;
  let topicName: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSiblingPanel = jest.fn();
    topicName = BasicBuilder.string();
  });

  it("should call openSiblingPanel with correct parameters", () => {
    openSiblingStateTransitionsPanel(mockOpenSiblingPanel, topicName);
    const config: StateTransitionConfig = { paths: [], isSynced: false };
    const siblingConfigCreator = (mockOpenSiblingPanel as jest.Mock).mock.calls[0][0]
    .siblingConfigCreator;
    const newConfig = siblingConfigCreator(config);

    expect(mockOpenSiblingPanel).toHaveBeenCalledWith({
      panelType: "StateTransitions",
      updateIfExists: true,
      siblingConfigCreator: expect.any(Function),
    });
    expect(newConfig.paths).toEqual([{ value: topicName, timestampMethod: "receiveTime" }]);
  });

  it("should not duplicate paths in the config", () => {
    openSiblingStateTransitionsPanel(mockOpenSiblingPanel, topicName);
    const config: StateTransitionConfig = {
      paths: [{ value: topicName, timestampMethod: "receiveTime" }],
      isSynced: false,
    };
    const siblingConfigCreator = (mockOpenSiblingPanel as jest.Mock).mock.calls[0][0]
      .siblingConfigCreator;
    const newConfig = siblingConfigCreator(config);

    expect(newConfig.paths).toEqual([{ value: topicName, timestampMethod: "receiveTime" }]);
  });
});
