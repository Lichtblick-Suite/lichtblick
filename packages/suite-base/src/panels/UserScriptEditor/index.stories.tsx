// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useCurrentLayoutActions } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import NodePlayground from "@lichtblick/suite-base/panels/UserScriptEditor";
import { generateFoxgloveSchemaDeclarations } from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/typescript/projectConfig";
import rawUserUtils from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/typescript/rawUserUtils";
import { UserScriptLog } from "@lichtblick/suite-base/players/UserScriptPlayer/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";
import { ExpectedResult } from "@lichtblick/suite-base/stories/storyHelpers";
import { DEFAULT_STUDIO_SCRIPT_PREFIX } from "@lichtblick/suite-base/util/globalConstants";
import { StoryObj } from "@storybook/react";
import { fireEvent, screen } from "@storybook/testing-library";
import { useCallback, useEffect } from "react";

const userScripts = {
  nodeId1: { name: "/studio_script/script", sourceCode: "const someVariableName = 1;" },
  nodeId2: { name: "/studio_script/script2", sourceCode: "const anotherVariableName = 2;" },
};

const userNodeRosLib = `
  export declare interface TopicsToMessageDefinition {
    "/my_topic": Messages.std_msgs__ColorRGBA;
  }

  export declare interface Duration {
    sec: number;
    nsec: number;
  }

  export declare interface Time {
    sec: number;
    nsec: number;
  }

  export declare namespace Messages {
    export interface std_msgs__ColorRGBA {
      r: number;
      g: number;
      b: number;
      a: number;
    }
  }

  export declare interface Input<T extends keyof TopicsToMessageDefinition> {
    topic: T;
    receiveTime: Time;
    message: TopicsToMessageDefinition[T];
  }
`;

const fixture = {
  topics: [],
  frame: {},
  userNodeRosLib,
};

const sourceCodeWithLogs = `
  import { Messages } from "ros";

  export const inputs = ["/my_topic"];
  export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

  const publisher = (): Messages.std_msgs__ColorRGBA => {
    log({ "someKey": { "nestedKey": "nestedValue" } });
    return { r: 1, b: 1, g: 1, a: 1 };
  };

  log(100, false, "abc", null, undefined);
  export default publisher;
`;
const logs: UserScriptLog[] = [
  { source: "registerScript", value: 100 },
  { source: "registerScript", value: false },
  { source: "registerScript", value: "abc" },
  { source: "registerScript", value: null }, // eslint-disable-line no-restricted-syntax
  { source: "registerScript", value: undefined },
  {
    source: "processMessage",
    value: { someKey: { nestedKey: "nestedValue" } },
  },
];

const generatedSchemas = generateFoxgloveSchemaDeclarations()
  .filter(
    (schema) =>
      !schema.fileName.endsWith("index.ts") &&
      !schema.fileName.endsWith("Time.ts") &&
      !schema.fileName.endsWith("Duration.ts"),
  )
  .map((schema) => schema.fileName.split("/").at(-1)?.replaceAll(".ts", ""))
  .join(", ");

const sourceCodeWithSchemas = `
import { Input } from "ros";
import { ${generatedSchemas} } from "@foxglove/schemas";

export const inputs = ["/my_topic"];
export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";

export default function script(event: Input<"/my_topic">): Log {
  return {
    timestamp: event.receiveTime,
    level: LogLevel.ERROR,
    message: "log message",
    name: "mr log",
    file: "log.log",
    line: 1,
  };
}
`;

const sourceCodeWithUtils = `
  import { Input } from "ros";
  import { norm } from "./pointClouds";

  export const inputs = ["/my_topic"];
  export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}/1";

  const publisher = (message: Input<"/my_topic">): { val: number } => {
    const val = norm({x:1, y:2, z:3});
    return { val };
  };

  export default publisher;
`;

const utilsSourceCode = `
  import { type RGBA } from "ros";

  export function norm() {
    return 0;
  }
`;

export default {
  title: "panels/NodePlayground",
  parameters: {
    chromatic: {
      delay: 2500,
    },
  },
};

export const WelcomeScreen: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <NodePlayground />
    </PanelSetup>
  ),
  name: "welcome screen",
};

export const RawUserUtils: StoryObj = {
  render: () => (
    <div style={{ margin: 12 }}>
      <p style={{ color: "lightgreen" }}>
        This should be original TypeScript source code. This is a story rather than a unit test
        because it’s effectively a test of our webpack config.
      </p>
      <pre>{rawUserUtils[0]?.sourceCode}</pre>;
    </div>
  ),
  name: "rawUserUtils",
};

export const SchemaUsageInNode: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: {
          nodeId1: {
            name: "/studio_script/script",
            sourceCode: sourceCodeWithSchemas.trim(),
          },
        },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: [] },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "schema usage in node",
  parameters: {
    colorScheme: "light",
  },
};

export const UtilsUsageInNode: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: {
          nodeId1: {
            name: "/studio_script/script",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: [] },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "utils usage in node",
};

export const EditorShowsNewCodeWhenUserNodesChange: StoryObj = {
  render: function Story() {
    const ChangeUserNodeOnMount = useCallback(function ChangeUserNodeOnMount(): JSX.Element {
      const actions = useCurrentLayoutActions();
      useEffect(() => {
        actions.setUserScripts({
          nodeId1: {
            name: "/studio_script/script",
            sourceCode: utilsSourceCode,
          },
        });
      }, [actions]);
      return <></>;
    }, []);

    return (
      <PanelSetup
        fixture={{
          ...fixture,
          userScripts: {
            nodeId1: {
              name: "/studio_script/script",
              sourceCode: sourceCodeWithUtils,
            },
          },
          userScriptDiagnostics: { nodeId1: [] },
          userScriptLogs: { nodeId1: [] },
        }}
      >
        <ChangeUserNodeOnMount />
        <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
        <ExpectedResult left={375} top={150}>
          Should show function norm() code
        </ExpectedResult>
      </PanelSetup>
    );
  },
  name: "Editor shows new code when userNodes change",
  play: async () => {
    const buttons = await screen.findAllByTestId("node-explorer");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const EditorGotoDefinition: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: {
          nodeId1: {
            name: "/studio_script/script",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: [] },
      }}
    >
      <NodePlayground
        overrideConfig={{
          selectedNodeId: "nodeId1",
          additionalBackStackItems: [
            {
              filePath: "/studio_script/pointClouds",
              code: utilsSourceCode,
              readOnly: true,
            },
          ],
        }}
      />
    </PanelSetup>
  ),
  name: "editor goto definition",
};

export const GoBackFromGotoDefinition: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: {
          nodeId1: {
            name: "/studio_script/script",
            sourceCode: sourceCodeWithUtils,
          },
        },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: [] },
      }}
    >
      <NodePlayground
        overrideConfig={{
          selectedNodeId: "nodeId1",
          additionalBackStackItems: [
            {
              filePath: "/studio_script/pointClouds",
              code: utilsSourceCode,
              readOnly: true,
            },
          ],
        }}
      />
    </PanelSetup>
  ),
  name: "go back from goto definition",
  play: async () => {
    const buttons = await screen.findAllByTestId("go-back");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const SidebarOpenNodeExplorer: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ ...fixture, userScripts }}>
      <NodePlayground />
    </PanelSetup>
  ),
  name: "sidebar open - node explorer",
  play: async () => {
    const buttons = await screen.findAllByTestId("node-explorer");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const SidebarOpenNodeExplorerSelectedNode: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ ...fixture, userScripts }}>
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "sidebar open - node explorer - selected node",
  play: async () => {
    const buttons = await screen.findAllByTestId("node-explorer");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const SidebarOpenUtilsExplorerSelectedUtility: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ ...fixture, userScripts }}>
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "sidebar open - utils explorer - selected utility",
  play: async () => {
    const buttons = await screen.findAllByTestId("utils-explorer");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const SidebarOpenTemplatesExplorer: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ ...fixture, userScripts }}>
      <NodePlayground />
    </PanelSetup>
  ),
  name: "sidebar open - templates explorer",
  play: async () => {
    const buttons = await screen.findAllByTestId("templates-explorer");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

const NeverLoad = () => {
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw new Promise(() => {
    // no-op
  });
};

export const EditorLoadingState: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ ...fixture, userScripts }}>
      <NodePlayground
        overrideConfig={{ selectedNodeId: "nodeId1", editorForStorybook: <NeverLoad /> }}
      />
    </PanelSetup>
  ),
  name: "editor loading state",
};

export const BottomBarNoErrorsOrLogsClosed: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: { nodeId1: [] },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - no errors or logs - closed",
};

export const BottomBarNoErrorsOpen: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: { nodeId1: [] },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - no errors - open",
  play: async () => {
    const buttons = await screen.findAllByTestId("np-errors");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const BottomBarNoLogsOpen: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: { nodeId1: [] },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - no logs - open",
  play: async () => {
    const buttons = await screen.findAllByTestId("np-logs");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const BottomBarErrorsClosed: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: {
          nodeId1: [
            {
              message: `Type '"bad number"' is not assignable to type 'number[]'.`,
              severity: 8,
              source: "Typescript",
              startLineNumber: 0,
              startColumn: 6,
              endLineNumber: 72,
              endColumn: 20,
              code: 2304,
            },
            {
              message: "This is a warning message (without line or column numbers).",
              severity: 4,
              source: "Source A",
              endLineNumber: 72,
              endColumn: 20,
              code: 2304,
            },
            {
              message: "This is an info message (without line or column numbers).",
              severity: 2,
              source: "Source B",
              code: 2304,
            },
            {
              message: "This is a hint message (without line or column numbers).",
              severity: 1,
              source: "Source C",
              code: 2304,
            },
          ],
        },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - errors - closed",
};

export const BottomBarErrorsOpen: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: {
          nodeId1: [
            {
              message: Array(10).fill("Long error that might wrap.").join(" "),
              severity: 8,
              source: "Typescript",
              startLineNumber: 0,
              startColumn: 6,
              endLineNumber: 72,
              endColumn: 20,
              code: 2304,
            },
            {
              message: `Type '"bad number"' is not assignable to type 'number[]'.`,
              severity: 8,
              source: "Typescript",
              startLineNumber: 0,
              startColumn: 6,
              endLineNumber: 72,
              endColumn: 20,
              code: 2304,
            },
            {
              message: "This is a warning message (without line or column numbers).",
              severity: 4,
              source: "Source A",
              endLineNumber: 72,
              endColumn: 20,
              code: 2304,
            },
            {
              message: "This is an info message (without line or column numbers).",
              severity: 2,
              source: "Source B",
              code: 2304,
            },
            {
              message: "This is a hint message (without line or column numbers).",
              severity: 1,
              source: "Source C",
              code: 2304,
            },
          ],
        },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - errors - open",
  play: async () => {
    const buttons = await screen.findAllByTestId("np-errors");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const BottomBarLogsClosed: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: sourceCodeWithLogs } },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: logs },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - logs - closed",
};

export const BottomBarLogsOpen: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: sourceCodeWithLogs } },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: logs },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - logs - open",
  play: async () => {
    const buttons = await screen.findAllByTestId("np-logs");
    buttons.forEach((button) => fireEvent.click(button));
  },
};

export const BottomBarClearedLogs: StoryObj = {
  render: () => (
    <PanelSetup
      fixture={{
        ...fixture,
        userScripts: { nodeId1: { name: "/studio_script/script", sourceCode: "" } },
        userScriptDiagnostics: { nodeId1: [] },
        userScriptLogs: { nodeId1: logs },
      }}
    >
      <NodePlayground overrideConfig={{ selectedNodeId: "nodeId1" }} />
    </PanelSetup>
  ),
  name: "BottomBar - cleared logs",
  play: async () => {
    const buttons = await screen.findAllByTestId("np-logs");
    buttons.forEach((button) => fireEvent.click(button));

    const clearButtons = await screen.findAllByTestId("np-logs-clear");
    clearButtons.forEach((button) => fireEvent.click(button));
  },
};
