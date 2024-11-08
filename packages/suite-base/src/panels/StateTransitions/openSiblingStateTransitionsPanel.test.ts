// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StateTransitionConfig } from "@lichtblick/suite-base/panels/StateTransitions/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import { OpenSiblingPanel } from "@lichtblick/suite-base/types/panels";

import { openSiblingStateTransitionsPanel } from "./openSiblingStateTransitionsPanel";

type IOpenSiblingStateTransisiontsPanelSetup = {
  topicName: string;
  config: Partial<StateTransitionConfig>;
};

describe("openSiblingStateTransitionsPanel", () => {
  let mockOpenSiblingPanel: OpenSiblingPanel;
  let topicName = BasicBuilder.string();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSiblingPanel = jest.fn();
  });

  function setup({
    config = {},
  }: Partial<IOpenSiblingStateTransisiontsPanelSetup> = {}) {
    const topicNameDefault: string = topicName;
    const configDefault: StateTransitionConfig = {
      paths: [],
      isSynced: false,
      ...config,
    };
    return { topicName: topicNameDefault, config: configDefault };
  }


  it("should not duplicate paths in the config", () => {
    const { config } = setup({
      config: {
        paths: [{ value: topicName, timestampMethod: "receiveTime" }],
        isSynced: false,
      },
    });
    openSiblingStateTransitionsPanel(mockOpenSiblingPanel, topicName);
    const siblingConfigCreator = (mockOpenSiblingPanel as jest.Mock).mock.calls[0][0]
      .siblingConfigCreator;
    const newConfig = siblingConfigCreator(config);

    expect(newConfig.paths).toEqual([{ value: topicName, timestampMethod: "receiveTime" }]);
  });
});
