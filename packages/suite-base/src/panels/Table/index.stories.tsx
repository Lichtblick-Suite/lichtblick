// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Table from "@lichtblick/suite-base/panels/Table";
import { mockMessage } from "@lichtblick/suite-base/players/TopicAliasingPlayer/mocks";
import PanelSetup, { Fixture } from "@lichtblick/suite-base/stories/PanelSetup";
import { StoryObj } from "@storybook/react";
import { fireEvent, userEvent, within } from "@storybook/testing-library";

const makeArrayData = ({
  length = 50,
  nestArray = true,
}: { length?: number; nestArray?: boolean } = {}): unknown => {
  return new Array(length).fill(0).map((_, i) => {
    return {
      val: i,
      bool: true,
      str: `${i}-abcd-edfg`,
      n: null, // eslint-disable-line no-restricted-syntax
      u: undefined,
      obj: {
        date: new Date(`2020-01-${i}`),
      },
      arr: nestArray ? makeArrayData({ length: 5, nestArray: false }) : [],
      primitiveArray: [1, 2, 3, 4, 5],
      typedArray: new Uint32Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a]),
    };
  });
};

const fixture: Fixture = {
  datatypes: new Map(
    Object.entries({
      arr_item: {
        definitions: [
          { type: "int32", name: "val", isConstant: false, isArray: false },
          { type: "int32", name: "primitiveArray", isConstant: false, isArray: true },
        ],
      },
      my_arr: {
        definitions: [
          { type: "arr_item", name: "array", isConstant: false, isArray: true, isComplex: true },
        ],
      },
    }),
  ),
  topics: [{ name: "/my_arr", schemaName: "my_arr" }],
  frame: {
    "/my_arr": [
      {
        topic: "/my_arr",
        receiveTime: { sec: 1, nsec: 0 },
        message: { array: makeArrayData() },
        schemaName: "my_arr",
        sizeInBytes: 0,
      },
    ],
  },
};

const longTextFixture: Fixture = {
  datatypes: new Map([
    [
      "schema",
      {
        definitions: [
          { type: "string", name: "value_a", isConstant: false, isArray: false },
          { type: "string", name: "value_b", isConstant: false, isArray: false },
        ],
      },
    ],
  ]),
  topics: [{ name: "topic", schemaName: "schema" }],
  frame: {
    topic: [
      mockMessage(
        {
          value_a: Array(30).fill("Long string that could wrap.").join(" \n"),
          value_b: "Another value",
        },
        { topic: "topic" },
      ),
    ],
  },
};

export default {
  title: "panels/Table",
};

export const NoTopicPath: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ frame: {}, topics: [] }}>
      <Table overrideConfig={{ topicPath: "" }} />
    </PanelSetup>
  ),
};

export const NoData: StoryObj = {
  render: () => (
    <PanelSetup fixture={{ frame: {}, topics: [] }}>
      <Table overrideConfig={{ topicPath: "/unknown" }} />
    </PanelSetup>
  ),
};

export const LongTextValue: StoryObj = {
  render: () => (
    <PanelSetup fixture={longTextFixture}>
      <Table overrideConfig={{ topicPath: "topic" }} />
    </PanelSetup>
  ),
};

export const Arrays: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
};

export const ExpandRows: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [target] = await canvas.findAllByTestId("expand-row-0");

    fireEvent.click(target!);
  },
};

export const ExpandCellsWithNestedObjects: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [target] = await canvas.findAllByTestId("expand-cell-obj-0");

    fireEvent.click(target!);
  },
};

export const ExpandCellsWithNestedArrays: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [target] = await canvas.findAllByTestId("expand-cell-arr-0");

    fireEvent.click(target!);
  },
};

export const ExpandNestedCells: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const [targetRow] = await canvas.findAllByTestId("expand-row-0");
    fireEvent.click(targetRow!);

    const nestedRows = await canvas.findAllByTestId("expand-row-0");
    fireEvent.click(nestedRows[2]!);
  },
};

export const ExpandMultipleRows: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const [row1] = await canvas.findAllByTestId("expand-row-0");
    fireEvent.click(row1!);

    const [row2] = await canvas.findAllByTestId("expand-row-1");
    fireEvent.click(row2!);
  },
};

export const Filtering: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array[:]{val==3}" }} />
    </PanelSetup>
  ),
};

export const Sorting: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array" }} />
    </PanelSetup>
  ),
  parameters: { colorScheme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const [targetCol] = await canvas.findAllByTestId("column-header-val");
    await userEvent.click(targetCol!);
  },
};

export const HandlesPrimitives: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array[:].val" }} />
    </PanelSetup>
  ),
};

export const HandlesArraysOfPrimitives: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <Table overrideConfig={{ topicPath: "/my_arr.array[:].primitiveArray" }} />
    </PanelSetup>
  ),
};

export const ConstrainedWidth: StoryObj = {
  render: () => (
    <PanelSetup fixture={fixture}>
      <div style={{ width: "100px" }}>
        <Table overrideConfig={{ topicPath: "/my_arr.array[:]{val==3}" }} />
      </div>
    </PanelSetup>
  ),
};
