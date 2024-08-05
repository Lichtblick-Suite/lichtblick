// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import DiagnosticSummary from "@lichtblick/suite-base/panels/diagnostics/DiagnosticSummary";
import {
  DiagnosticStatusArrayMsg,
  getDiagnosticId,
  KeyValue,
  LEVELS,
} from "@lichtblick/suite-base/panels/diagnostics/util";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { StoryObj } from "@storybook/react";

export default {
  title: "panels/diagnostics/DiagnosticSummary",
  excludeStories: ["makeDiagnosticMessage"],
};

export function makeDiagnosticMessage(
  level: number,
  name: string,
  hardware_id: string,
  messages: string[],
  options?: {
    values?: KeyValue[] | undefined;
    stamp?: MessageEvent<DiagnosticStatusArrayMsg>["message"]["header"]["stamp"];
  },
): MessageEvent<DiagnosticStatusArrayMsg> {
  return {
    topic: "/diagnostics",
    receiveTime: { sec: 2, nsec: 0 },
    message: {
      header: { frame_id: "", stamp: options?.stamp ?? { sec: 1, nsec: 500_000_000 }, seq: 0 },
      status: messages.map((message) => ({
        level,
        name,
        hardware_id,
        message,
        values: options?.values ?? [],
      })),
    },
    schemaName: "diagnostic_msgs/DiagnosticArray",
    sizeInBytes: 0,
  };
}

const fixture: Fixture = {
  topics: [{ name: "/diagnostics", schemaName: "diagnostic_msgs/DiagnosticArray" }],
  frame: {
    "/diagnostics": [
      makeDiagnosticMessage(LEVELS.OK, "name1", "hardware_id1", ["ok"]),
      makeDiagnosticMessage(42, "name4", "hardware_id4/filter", ["unknown level"]),
      makeDiagnosticMessage(LEVELS.ERROR, "name3", "hardware_id3/filter", ["error"]),
      makeDiagnosticMessage(LEVELS.STALE, "name5", "hardware_id5", ["stale"]),
      makeDiagnosticMessage(LEVELS.WARN, "name2", "hardware_id2/filter", ["warn"]),
    ],
  },
};

export const Empty: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={{ ...fixture, frame: {} }}>
        <DiagnosticSummary />
      </PanelSetup>
    );
  },
};

export const Basic: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary />
      </PanelSetup>
    );
  },
};

export const WithSettings: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture} includeSettings>
        <DiagnosticSummary />
      </PanelSetup>
    );
  },
};

export const WithPinnedNodes: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 0,
            pinnedIds: [
              getDiagnosticId("hardware_id1", "name1"),
              getDiagnosticId("hardware_id3/filter", "name3"),
            ],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "",
          }}
        />
      </PanelSetup>
    );
  },
};

export const WithPinnedNodesAndFilter: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 2,
            pinnedIds: [
              getDiagnosticId("hardware_id1", "name1"),
              getDiagnosticId("hardware_id3/filter", "name3"),
            ],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "",
          }}
        />
      </PanelSetup>
    );
  },
};

export const WithoutSorting: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 0,
            pinnedIds: [],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "",
            sortByLevel: false,
          }}
        />
      </PanelSetup>
    );
  },
};

export const FilteredByHardwareId: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 0,
            pinnedIds: [],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "filter",
            sortByLevel: false,
          }}
        />
      </PanelSetup>
    );
  },
};

export const FilteredByLevel: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 2,
            pinnedIds: [],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "",
            sortByLevel: false,
          }}
        />
      </PanelSetup>
    );
  },
};

export const FilteredByHardwareIdAndLevel: StoryObj = {
  render: () => {
    return (
      <PanelSetup fixture={fixture}>
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 2,
            pinnedIds: [],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "filter",
            sortByLevel: false,
          }}
        />
      </PanelSetup>
    );
  },
};

export const OldDiagnosticsMarkedStale: StoryObj = {
  render: () => {
    return (
      <PanelSetup
        includeSettings
        fixture={{
          ...fixture,
          activeData: { currentTime: { sec: 10, nsec: 0 } },
          frame: {
            "/diagnostics": [
              makeDiagnosticMessage(LEVELS.OK, "name1", "timeout_id", ["2 secs"], {
                stamp: { sec: 2, nsec: 0 },
              }),
              makeDiagnosticMessage(LEVELS.OK, "name2", "timeout_id", ["4 secs"], {
                stamp: { sec: 4, nsec: 0 },
              }),
              makeDiagnosticMessage(LEVELS.OK, "name3", "timeout_id", ["6 secs"], {
                stamp: { sec: 6, nsec: 0 },
              }),
            ],
          },
        }}
      >
        <DiagnosticSummary
          overrideConfig={{
            minLevel: 0,
            pinnedIds: [],
            topicToRender: "/diagnostics",
            hardwareIdFilter: "",
            sortByLevel: false,
          }}
        />
      </PanelSetup>
    );
  },
};
