// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StateTransitionConfig } from "@lichtblick/suite-base/panels/StateTransitions/types";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import { OpenSiblingPanel } from "@lichtblick/suite-base/types/panels";

import { openSiblingStateTransitionsPanel } from "./openSiblingStateTransitionsPanel";

type IOpenSiblingStateTransisiontsPanelSetup = {
  topicName: string,
  config:Partial<StateTransitionConfig>
}
describe("openSiblingStateTransitionsPanel", () => {
  let mockOpenSiblingPanel: OpenSiblingPanel;
  let topicName: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSiblingPanel = jest.fn();
    topicName = BasicBuilder.string();
  });

  function setup({topicName = undefined, config = {}}: Partial<IOpenSiblingStateTransisiontsPanelSetup> = {}) {
    const topicNameDefault: string = topicName ?? BasicBuilder.string();
    const configDefault: StateTransitionConfig = {
      paths: [],
      isSynced: false,
      ...config
    };
    return {topicName: topicNameDefault, config: configDefault};
  }

  it("should call openSiblingPanel with correct parameters", () => {
    const { config, topicName} = setup();
    openSiblingStateTransitionsPanel(mockOpenSiblingPanel, topicName);
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
    const topicName = BasicBuilder.string();
    const { config } = setup({
      topicName,
      config: {
        paths: [{ value: topicName , timestampMethod: "receiveTime" }],
        isSynced: false,
      }
    });
    openSiblingStateTransitionsPanel(mockOpenSiblingPanel, topicName);
    const siblingConfigCreator = (mockOpenSiblingPanel as jest.Mock).mock.calls[0][0]
      .siblingConfigCreator;
    const newConfig = siblingConfigCreator(config);

    expect(newConfig.paths).toEqual([{ value: topicName, timestampMethod: "receiveTime" }]);
  });
});
