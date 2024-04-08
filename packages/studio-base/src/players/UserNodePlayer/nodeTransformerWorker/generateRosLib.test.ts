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

import ts from "typescript/lib/typescript";

import stressTestDatatypes from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/fixtures/example-datatypes";
import generateRosLib, {
  generateTypeDefs,
  typedArrayMap,
  InterfaceDeclarations,
} from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/generateRosLib";
import { compile } from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/transform";
import { NodeData } from "@foxglove/studio-base/players/UserNodePlayer/types";
import { Topic } from "@foxglove/studio-base/players/types";

const baseNodeData: NodeData = {
  name: "/studio_script/main",
  sourceCode: "",
  transpiledCode: "",
  diagnostics: [],
  inputTopics: [],
  outputTopic: "",
  outputDatatype: "",
  globalVariables: [],
  datatypes: new Map(),
  sourceFile: undefined,
  typeChecker: undefined,
  rosLib: "",
  typesLib: "",
  projectCode: new Map<string, string>(),
};

// For stringifying Typescript declarations. Makes it much easier to write tests against the output.
const formatTypeDef = (
  interfaceDeclarations: InterfaceDeclarations,
): {
  [datatype: string]: string;
} => {
  const resultFile = ts.createSourceFile(
    "testFile.ts",
    "",
    ts.ScriptTarget.Latest,
    /*setParentNodes*/
    false,
    ts.ScriptKind.TS,
  );
  const printer = ts.createPrinter();
  const datatypes: Record<string, string> = {};
  Object.entries(interfaceDeclarations).forEach(([datatype, interfaceDeclaration]) => {
    datatypes[datatype] = printer
      .printNode(ts.EmitHint.Unspecified, interfaceDeclaration, resultFile)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");
  });

  return datatypes;
};

describe("typegen", () => {
  describe("generateTypeDefs", () => {
    describe("basic types", () => {
      it("multiple properties", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/ColorRGBA": {
                definitions: [
                  { type: "float32", name: "r", isArray: false, isComplex: false },
                  { type: "float32", name: "g", isArray: false, isComplex: false },
                  { type: "float32", name: "b", isArray: false, isComplex: false },
                  { type: "float32", name: "a", isArray: false, isComplex: false },
                ],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/ColorRGBA": `export interface std_msgs__ColorRGBA { r: number; g: number; b: number; a: number; }`,
        });
      });
    });
    describe("special ros types", () => {
      it("time", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/Time": {
                definitions: [{ type: "time", name: "t", isArray: false, isComplex: false }],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Time": `export interface std_msgs__Time { t: Time; }`,
        });
      });
      it("duration", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/Duration": {
                definitions: [{ type: "duration", name: "t", isArray: false, isComplex: false }],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Duration": `export interface std_msgs__Duration { t: Duration; }`,
        });
      });
    });
    describe("internal references", () => {
      it("allows ros datatypes that refer to each other", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "geometry_msgs/Pose": {
                definitions: [
                  {
                    type: "geometry_msgs/Point",
                    name: "position",
                    isArray: false,
                    isComplex: true,
                  },
                ],
              },
              "geometry_msgs/Point": {
                definitions: [
                  { type: "float64", name: "x", isArray: false, isComplex: false },
                  { type: "float64", name: "y", isArray: false, isComplex: false },
                  { type: "float64", name: "z", isArray: false, isComplex: false },
                ],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
      it("does not add duplicate declarations for interfaces already created", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "geometry_msgs/Pose": {
                definitions: [
                  {
                    type: "geometry_msgs/Point",
                    name: "position",
                    isArray: false,
                    isComplex: true,
                  },
                  {
                    type: "geometry_msgs/Point",
                    name: "last_position",
                    isArray: false,
                    isComplex: true,
                  },
                ],
              },
              "geometry_msgs/Point": {
                definitions: [
                  { type: "float64", name: "x", isArray: false, isComplex: false },
                  { type: "float64", name: "y", isArray: false, isComplex: false },
                  { type: "float64", name: "z", isArray: false, isComplex: false },
                ],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point; last_position: geometry_msgs__Point; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
      it("allows deep internal references", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "geometry_msgs/Pose": {
                definitions: [
                  {
                    type: "geometry_msgs/Directions",
                    name: "directions",
                    isArray: true,
                    isComplex: true,
                  },
                ],
              },
              "geometry_msgs/Directions": {
                definitions: [
                  {
                    type: "geometry_msgs/Point",
                    name: "positions",
                    isArray: true,
                    isComplex: true,
                  },
                ],
              },

              "geometry_msgs/Point": {
                definitions: [
                  { type: "float64", name: "x", isArray: false, isComplex: false },
                  { type: "float64", name: "y", isArray: false, isComplex: false },
                  { type: "float64", name: "z", isArray: false, isComplex: false },
                ],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { directions: geometry_msgs__Directions[]; }`,
          "geometry_msgs/Directions": `export interface geometry_msgs__Directions { positions: geometry_msgs__Point[]; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
    });

    describe("arrays", () => {
      it("defines primitive arrays", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/Points": {
                definitions: [{ type: "string", name: "x", isArray: true, isComplex: false }],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Points": `export interface std_msgs__Points { x: string[]; }`,
        });
      });
      it("typed arrays", () => {
        for (const [rosType, jsType] of typedArrayMap) {
          const declarations = generateTypeDefs(
            new Map(
              Object.entries({
                "std_msgs/Data": {
                  definitions: [{ type: rosType, name: "x", isArray: true, isComplex: false }],
                },
              }),
            ),
          );
          const formattedTypes = formatTypeDef(declarations);
          expect(formattedTypes).toEqual({
            "std_msgs/Data": `export interface std_msgs__Data { x: ${jsType}; }`,
          });

          const { diagnostics } = compile({
            ...baseNodeData,
            sourceCode: formattedTypes["std_msgs/Data"] ?? "",
          });
          expect(diagnostics).toEqual([]);
        }
      });
      it("references", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "geometry_msgs/Pose": {
                definitions: [
                  { type: "geometry_msgs/Point", name: "position", isArray: true, isComplex: true },
                ],
              },
              "geometry_msgs/Point": {
                definitions: [
                  { type: "float64", name: "x", isArray: false, isComplex: false },
                  { type: "float64", name: "y", isArray: false, isComplex: false },
                  { type: "float64", name: "z", isArray: false, isComplex: false },
                ],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "geometry_msgs/Pose": `export interface geometry_msgs__Pose { position: geometry_msgs__Point[]; }`,
          "geometry_msgs/Point": `export interface geometry_msgs__Point { x: number; y: number; z: number; }`,
        });
      });
    });
    describe("ros constants", () => {
      it("does not return anything for ros constants", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/Constants": {
                definitions: [{ type: "uint8", name: "ARROW", isConstant: true, value: 0 }],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/Constants": "export interface std_msgs__Constants { }",
        });
      });
    });
    describe("empty references", () => {
      it("contains an empty interface definition if the datatype does not have any properties", () => {
        const declarations = generateTypeDefs(
          new Map(
            Object.entries({
              "std_msgs/NoDef": {
                definitions: [],
              },
            }),
          ),
        );
        expect(formatTypeDef(declarations)).toEqual({
          "std_msgs/NoDef": "export interface std_msgs__NoDef { }",
        });
      });
    });
  });

  describe("generateRosLib", () => {
    it("basic snapshot", () => {
      const rosLib = generateRosLib({
        topics: [
          {
            name: "/my_topic",
            schemaName: "std_msgs/ColorRGBA",
          },
          { name: "/empty_topic", schemaName: "std_msgs/NoDef" },
        ],
        datatypes: new Map(
          Object.entries({
            "std_msgs/ColorRGBA": {
              definitions: [
                { type: "float32", name: "r", isArray: false, isComplex: false },
                { type: "float32", name: "g", isArray: false, isComplex: false },
                { type: "float32", name: "b", isArray: false, isComplex: false },
                { type: "float32", name: "a", isArray: false, isComplex: false },
              ],
            },
          }),
        ),
      });
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);

      expect(rosLib).toMatchSnapshot();
    });
    it("more complex snapshot", () => {
      const randomTopics: Topic[] = Array.from(stressTestDatatypes.keys()).map((schemaName, i) => ({
        name: `/topic_${i}`,
        schemaName,
      }));
      const rosLib = generateRosLib({ topics: randomTopics, datatypes: stressTestDatatypes });
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);

      expect(rosLib).toMatchSnapshot();
    });
    it("works with zero topics or datatypes", () => {
      const rosLib = generateRosLib({ topics: [], datatypes: new Map() });
      expect(rosLib).toMatchSnapshot();
      const { diagnostics } = compile({ ...baseNodeData, sourceCode: rosLib });
      expect(diagnostics).toEqual([]);
    });
  });
});
