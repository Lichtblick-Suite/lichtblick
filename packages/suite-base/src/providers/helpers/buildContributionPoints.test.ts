// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  RegisterMessageConverterArgs,
  TopicAliasFunction,
  ExtensionPanelRegistration,
  PanelSettings,
} from "@lichtblick/suite";
import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import ExtensionBuilder from "@lichtblick/suite-base/testing/builders/ExtensionBuilder";

import { buildContributionPoints } from "./buildContributionPoints";

jest.mock("@lichtblick/log", () => ({
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

describe("buildContributionPoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize contribution objects", () => {
    const extensionInfo = ExtensionBuilder.extension();

    const result = buildContributionPoints(extensionInfo, "");

    expect(result).toHaveProperty("panels", {});
    expect(result).toHaveProperty("messageConverters", []);
    expect(result).toHaveProperty("topicAliasFunctions", []);
    expect(result).toHaveProperty("panelSettings", {});
  });

  it("should register a panel", () => {
    const extensionInfo = ExtensionBuilder.extension();
    const panelName = BasicBuilder.string();
    const panelId = `${extensionInfo.qualifiedName}.${panelName}`;
    const registration: ExtensionPanelRegistration = {
      name: panelName,
      initPanel: jest.fn(),
    };

    (globalThis as any).panel = registration;
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerPanel(globalThis.panel);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    expect(result.panels[panelId]).toBeDefined();
    expect(result.panels[panelId]).toEqual(
      expect.objectContaining({
        extensionId: extensionInfo.id,
        extensionName: extensionInfo.qualifiedName,
        extensionNamespace: extensionInfo.namespace,
        registration: expect.objectContaining({
          name: panelName,
          initPanel: expect.any(Function),
        } as ExtensionPanelRegistration),
      }),
    );
  });

  it("should register a message converter", () => {
    const extensionInfo = ExtensionBuilder.extension();
    const messageConverter: RegisterMessageConverterArgs<unknown> = {
      fromSchemaName: BasicBuilder.string(),
      toSchemaName: BasicBuilder.string(),
      panelSettings: {},
      extensionId: extensionInfo.id,
      converter: jest.fn(),
    };

    (globalThis as any).messageConverter = messageConverter;
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerMessageConverter(globalThis.messageConverter);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    expect(result.messageConverters).toHaveLength(1);
    expect(result.messageConverters.length).toBe(1);
    expect(result.messageConverters[0]).toEqual({
      ...messageConverter,
      extensionNamespace: extensionInfo.namespace,
      extensionId: extensionInfo.id,
    });
    delete (globalThis as any).messageConverter;
  });

  it("should register a message converter with panel settings", () => {
    const extensionInfo = ExtensionBuilder.extension();
    const panelA: PanelSettings<unknown> = {
      defaultConfig: BasicBuilder.genericDictionary(String),
      extensionId: extensionInfo.id,
      handler: jest.fn(),
      settings: jest.fn(),
    };
    const panelB: PanelSettings<unknown> = {
      defaultConfig: BasicBuilder.genericDictionary(String),
      extensionId: extensionInfo.id,
      handler: jest.fn(),
      settings: jest.fn(),
    };
    const messageConverter: RegisterMessageConverterArgs<unknown> = {
      fromSchemaName: BasicBuilder.string(),
      toSchemaName: BasicBuilder.string(),
      panelSettings: {
        panelA,
        panelB,
      },
      extensionId: extensionInfo.id,
      converter: jest.fn(),
    };

    (globalThis as any).messageConverter = messageConverter;
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerMessageConverter(globalThis.messageConverter);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    expect(result.panelSettings).toBeDefined();
    expect(Object.keys(result.panelSettings)).toHaveLength(2);
    expect(result.panelSettings.panelA).toHaveProperty(messageConverter.fromSchemaName);
    expect(result.panelSettings.panelA![messageConverter.fromSchemaName]).toEqual(panelA);
    expect(result.panelSettings.panelB).toHaveProperty(messageConverter.fromSchemaName);
    expect(result.panelSettings.panelB![messageConverter.fromSchemaName]).toEqual(panelB);
    delete (globalThis as any).messageConverter;
  });

  it("registers topic aliases correctly", () => {
    const extensionInfo = ExtensionBuilder.extension();
    const aliasFunction: TopicAliasFunction = jest.fn();

    (globalThis as any).topicAliasFunction = aliasFunction;
    const extensionSource = `
      module.exports = {
        activate: (ctx) => {
          ctx.registerTopicAliases(globalThis.topicAliasFunction);
        }
      };
    `;

    const result = buildContributionPoints(extensionInfo, extensionSource);

    expect(result.topicAliasFunctions).toHaveLength(1);
    expect(result.topicAliasFunctions[0]!.extensionId).toBe(extensionInfo.id);
    expect(result.topicAliasFunctions[0]!.aliasFunction).toBe(aliasFunction);
    delete (globalThis as any).topicAliasFunction;
  });
});
