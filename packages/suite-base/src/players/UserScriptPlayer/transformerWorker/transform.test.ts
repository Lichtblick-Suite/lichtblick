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

/* eslint-disable jest/no-conditional-expect */

import exampleDatatypes from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/fixtures/example-datatypes";
import generateRosLib from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/generateRosLib";
import {
  generateEmptyTypesLib,
  generateTypesLib,
} from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/generateTypesLib";
import {
  getOutputTopic,
  validateInputTopics,
  compile,
  extractDatatypes,
  extractGlobalVariables,
  compose,
  getInputTopics,
} from "@lichtblick/suite-base/players/UserScriptPlayer/transformerWorker/transform";
import {
  DiagnosticSeverity,
  ErrorCodes,
  Sources,
  ScriptData,
} from "@lichtblick/suite-base/players/UserScriptPlayer/types";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";
import { basicDatatypes } from "@lichtblick/suite-base/util/basicDatatypes";
import { DEFAULT_STUDIO_SCRIPT_PREFIX } from "@lichtblick/suite-base/util/globalConstants";

// Exported for use in other tests.
const baseNodeData: ScriptData = {
  name: `${DEFAULT_STUDIO_SCRIPT_PREFIX}main`,
  sourceCode: "",
  projectCode: new Map<string, string>(),
  transpiledCode: "",
  diagnostics: [],
  inputTopics: [],
  globalVariables: [],
  outputTopic: "",
  outputDatatype: "",
  datatypes: new Map(),
  sourceFile: undefined,
  typeChecker: undefined,
  rosLib: generateRosLib({
    topics: [{ name: "/some_topic", schemaName: "std_msgs/ColorRGBA" }],
    datatypes: exampleDatatypes,
  }),
  typesLib: generateEmptyTypesLib(),
};

describe("pipeline", () => {
  describe("getInputTopics", () => {
    it.each([
      ["export const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["   export  const inputs = [ '/some_topic' ];", ["/some_topic"]],
      ["export const inputs = ['/some_topic'];", ["/some_topic"]],
      ["export const inputs = ['/some_topic'              ];", ["/some_topic"]],
      [`export const inputs = [ "/some_topic" ];`, ["/some_topic"]],
      ['export const inputs = [ "/rosout", "/tf" ];', ["/rosout", "/tf"]],
      ['export const inputs = [ "/rosout", "/tf", "/turtle" ];', ["/rosout", "/tf", "/turtle"]],
      [
        `export const otherVar = 'hi Jp';
      export const inputs = [ '/my_topic' ];`,
        ["/my_topic"],
      ],
      ['export const inputs = [ "/rosout", \n"/tf", \n"/turtle" ];', ["/rosout", "/tf", "/turtle"]],
      [
        'export const inputs = [ \n"/rosout", \n"/tf", \n"/turtle" \n];',
        ["/rosout", "/tf", "/turtle"],
      ],
      [
        'export const inputs = [ \n\n"/rosout", \n"/tf", \n"/turtle"\n ];',
        ["/rosout", "/tf", "/turtle"],
      ],
      [
        'export const inputs = \n[ \n"/rosout", \n"/tf", \n"/turtle" \n];',
        ["/rosout", "/tf", "/turtle"],
      ],
      [
        '\nexport const inputs = [ \n"/rosout", \n"/tf", \n"/turtle" \n];',
        ["/rosout", "/tf", "/turtle"],
      ],
      [
        `export const inputs = [];
       export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}1";
       const randomVar = [];`,
        [],
      ],
      ['\nexport const inputs = [ \n"/rosout", \n// "/tf", \n// "/turtle" \n];', ["/rosout"]],
    ])("should get each input topic", (sourceCode, expectedTopics) => {
      const { inputTopics } = compose(compile, getInputTopics)({ ...baseNodeData, sourceCode }, []);

      expect(inputTopics).toEqual(expectedTopics);
    });

    it("should run getInputTopics even if there were compile time errors", () => {
      const nodeData = compose(compile, getInputTopics)(
        {
          ...baseNodeData,
          sourceCode: "export const inputs = ['foo']; const x: DoesNotExist = 41",
        },
        [],
      );
      expect(nodeData.diagnostics.map(({ source }) => source)).toEqual([Sources.Typescript]);
      expect(nodeData.inputTopics).toEqual(["foo"]);
    });

    it.each([
      ["const inputs = '/some_topic'", ErrorCodes.InputTopicsChecker.NO_INPUTS_EXPORT],
      ["const x = 'no inputs here'", ErrorCodes.InputTopicsChecker.NO_INPUTS_EXPORT],
      ["", ErrorCodes.InputTopicsChecker.NO_INPUTS_EXPORT],
      [
        "// export const inputs = [ '/some_topic' ];",
        ErrorCodes.InputTopicsChecker.NO_INPUTS_EXPORT,
      ],
      ["export const inputs = []", ErrorCodes.InputTopicsChecker.EMPTY_INPUTS_EXPORT],
      ["export const inputs = [ 1, '/some_topic']", ErrorCodes.InputTopicsChecker.BAD_INPUTS_TYPE],
      ["export const inputs = 2", ErrorCodes.InputTopicsChecker.BAD_INPUTS_TYPE],
      ["export const inputs = 'hello'", ErrorCodes.InputTopicsChecker.BAD_INPUTS_TYPE],
      [
        "export const inputs = { 1: 'some_input', 2: 'some_other_input' }",
        ErrorCodes.InputTopicsChecker.BAD_INPUTS_TYPE,
      ],
      [
        "const input = '/some_topic';\nexport const inputs = [ input ]",
        ErrorCodes.InputTopicsChecker.BAD_INPUTS_TYPE,
      ],
    ])("returns errors for badly formatted input: %s", (sourceCode, errorCategory) => {
      const { diagnostics } = compose(compile, getInputTopics)({ ...baseNodeData, sourceCode }, []);
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0]?.severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0]?.code).toEqual(errorCategory);
    });
  });
  describe("getOutputTopics", () => {
    it.each([
      ["export const output = '/my_topic'", "/my_topic"],
      ["   export  const output = '/my_topic'", "/my_topic"],
      [`export const output = "/my_topic"`, "/my_topic"],
    ])("retrieves the output topic", (sourceCode, expectedTopic) => {
      expect(getOutputTopic({ ...baseNodeData, sourceCode }).outputTopic).toEqual(expectedTopic);
    });
    it.each([
      "const output = ['/my_topic']",
      "const output = 42",
      String(ErrorCodes.OutputTopicChecker.NO_OUTPUTS),
    ])("returns errors for badly formatted output topics", (sourceCode) => {
      const { diagnostics } = getOutputTopic({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0]?.severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0]?.code).toEqual(ErrorCodes.OutputTopicChecker.NO_OUTPUTS);
    });
  });
  describe("validateInputTopics", () => {
    it.each([
      [["/foo"], ["/bar"]],
      [["/foo"], ["/bar", "/baz"]],
    ])("returns a  error when an input topic is not yet available", (inputTopics, topics) => {
      const { diagnostics } = validateInputTopics(
        { ...baseNodeData, inputTopics },
        topics.map((name) => ({ name, schemaName: "" })),
      );
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0]?.severity).toEqual(DiagnosticSeverity.Error);
      expect(diagnostics[0]?.code).toEqual(ErrorCodes.InputTopicsChecker.NO_TOPIC_AVAIL);
    });
  });

  describe("compile", () => {
    it.each(["const x: string = 'hello foxglove'", "const num: number = 1222"])(
      "can compile",
      (sourceCode) => {
        const { diagnostics } = compile({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(0);
      },
    );
    it.each([
      "const x: number = Math.max(1, 2);",
      "const x: string[] = [ 1, 2, 3 ].map(num => num.toString());",
      "const x: number = Math.max(...[1, 2, 3]);",
    ])("can compile globals", (sourceCode) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(0);
    });
    it("compiles type definitions from 'ros'", () => {
      const { diagnostics } = compile({
        ...baseNodeData,
        sourceCode: `import { Time } from 'ros';`,
      });
      expect(diagnostics.length).toEqual(0);
    });
    it.each([
      "import { Time } from 'ros'; const myIncorrectTime: Time = 'abc'",
      "import { Time } from 'ros'; const myIncompleteTime: Time = { sec: 0 }",
    ])("throws errors when user code breaks 'ros' type definitions", (sourceCode) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
    });

    describe("log function", () => {
      it.each([
        "log(1)",
        "log(1, 1.5, 'A', false, undefined, null)",
        "log({ 'a': 'hello' })",
        "log({ 'a': { 'a': 'hello' } })",
        "log({ 'a': { 'a': [ 42 ] } })",
        "log({ 'a': { 'a': [ { 'a': 'hello' } ]} })",
        "log({ 'a': { 'a': null } })",
        "log({ 'a': { 'a': undefined } })",
        "log({ 1: { 'a': undefined } })",
        "const x: [number, number] = [ 1, 1, ]; log({ 'a': x })",
        "const y: any = {}; log({ 'a': y })",
        // "enum Enums { Red, Green, Blue }; log({ 'a': Enums })",
      ])("can compile logs", (sourceCode) => {
        const { diagnostics } = compile({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(0);
      });
      it.each([
        "log(() => {})",
        "log({someKey: () => {}})",
        "log({someKey: {someNestedKey: () => {}}})",
        "log(1, 1.5, 'A', false, undefined, null, () => {})",
        "log(1, 1.5, 'A', false, undefined, null, {'someKey': () => {}})",
        "log(1, 1.5, 'A', false, undefined, null, {'someKey': {'someNestedKey': () => {}}})",
      ])("throws errors when user uses incorrect arguments with log function", (sourceCode) => {
        const { diagnostics } = compile({ ...baseNodeData, sourceCode });
        expect(diagnostics.length).toEqual(1);
        const { source, severity } = diagnostics[0]!;
        expect(source).toEqual(Sources.Typescript);
        expect(severity).toEqual(DiagnosticSeverity.Error);
      });
    });

    it.each([
      { sourceCode: "const x: string = 42;", errorCode: 2322 },
      { sourceCode: "export const x: number = 'hello foxglove';", errorCode: 2322 },
      { sourceCode: "import { x } from './y'", errorCode: 2307 },
      { sourceCode: "const x: string = [];", errorCode: 2322 },
      {
        sourceCode: `
          const publisher = (isOk: boolean): { markers: [] } => {
            if (isOk) {
              return;
            }
            return { markers: [] };
          };
        `,
        errorCode: 2322,
      },
    ])("catches semantic errors", ({ sourceCode, errorCode }) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      const { source, message, severity, code } = diagnostics[0]!;
      expect(code).toEqual(errorCode);
      expect(source).toEqual("Typescript");
      expect(typeof message).toEqual("string");
      expect(severity).toEqual(DiagnosticSeverity.Error);
    });
    it.each([
      { sourceCode: "const x = ';", errorCode: 1002 },
      { sourceCode: "(", errorCode: 1109 },
    ])("catches syntactic errors", ({ sourceCode, errorCode }) => {
      const { diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics.length).toEqual(1);
      const { source, message, severity, code } = diagnostics[0]!;
      expect(code).toEqual(errorCode);
      expect(source).toEqual("Typescript");
      expect(typeof message).toEqual("string");
      expect(severity).toEqual(DiagnosticSeverity.Error);
    });

    describe("generated types", () => {
      it("can successfully use dynamically typed definitions as input", () => {
        const tickInfoDatatype = {
          definitions: [
            { type: "uint64", name: "cpu_elapsed_ns", isArray: false, isComplex: false },
          ],
        };
        const sourceCode = `
          import { Input, Messages } from "ros";

          export const inputs = ["/tick_information"];
          export const output = "/studio_script/my_node";

          const publisher = (message: Input<"/tick_information">): Messages.std_msgs__TickInfo => {
            return {
              cpu_elapsed_ns: message.message.cpu_elapsed_ns
            };
          };

          export default publisher;
        `;

        const rosLib = generateRosLib({
          topics: [{ name: "/tick_information", schemaName: "std_msgs/TickInfo" }],
          datatypes: new Map(
            Object.entries({
              "std_msgs/TickInfo": tickInfoDatatype,
            }),
          ),
        });
        const { diagnostics } = compile({ ...baseNodeData, sourceCode, rosLib: `${rosLib}` });
        expect(diagnostics).toEqual([]);
      });
    });

    it.each(["const x: string = 'hello foxglove'"])("produces transpiled code", (sourceCode) => {
      const { transpiledCode, diagnostics } = compile({ ...baseNodeData, sourceCode });
      expect(typeof transpiledCode).toEqual("string");
      expect(diagnostics.length).toEqual(0);
    });
    it.each([
      "const x: string = 'hello foxglove'",
      `
      import {norm} from "./pointClouds";
      const x = norm({x:1, y:2, z:3});
      `,
    ])("produces projectCode", (sourceCode) => {
      const { diagnostics, transpiledCode } = compile({ ...baseNodeData, sourceCode });
      expect(diagnostics).toEqual([]);
      expect(typeof transpiledCode).toEqual("string");
    });
  });

  describe("compile + extractGlobalVariables", () => {
    const extract = compose(compile, extractGlobalVariables);

    it("should not run if there were any compile time errors", () => {
      const nodeData = extract(
        {
          ...baseNodeData,
          sourceCode: "const x: string = 41; type GlobalVariables = { foo: string; };",
        },
        [],
      );
      expect(nodeData.globalVariables).toEqual([]);
    });

    it("extracts globalVariables from the AST", () => {
      const nodeData = extract(
        {
          ...baseNodeData,
          sourceCode: "type GlobalVariables = { foo: string; bar: number; };",
        },
        [],
      );
      expect(nodeData.globalVariables).toEqual(["foo", "bar"]);
    });

    it("ignores variables named GlobalVariables", () => {
      const nodeData = extract(
        {
          ...baseNodeData,
          sourceCode: "const GlobalVariables = { foo: 'string', num: 3 };",
        },
        [],
      );
      expect(nodeData.globalVariables).toEqual([]);
    });

    it("allows empty GlobalVariables", () => {
      const nodeData = extract(
        {
          ...baseNodeData,
          sourceCode: "type GlobalVariables = {};",
        },
        [],
      );
      expect(nodeData.globalVariables).toEqual([]);
    });
  });

  describe("compile + extractDatatypes", () => {
    const extract = compose(compile, extractDatatypes);

    it("should not run extractDatatypes if there were any compile time errors", () => {
      const nodeData = extract(
        {
          ...baseNodeData,
          sourceCode: "const x: string = 41",
        },
        [],
      );
      expect(nodeData.diagnostics.map(({ source }) => source)).toEqual([Sources.Typescript]);
    });

    type TestCase = {
      sourceCode: string;
      description: string;
      datatypes?: RosDatatypes;
      error?: (typeof ErrorCodes.DatatypeExtraction)[keyof typeof ErrorCodes.DatatypeExtraction];
      errorMessage?: string;
      outputDatatype?: string;
      only?: boolean;
      /* Debugging helper */
      skip?: boolean;
      /* Debugging helper  */
      rosLib?: string;
    };

    const numDataType: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "num",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
          ],
        },
      }),
    );

    const uint32DataType: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "val",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "uint32",
            },
          ],
        },
      }),
    );

    const posDatatypes: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "pos",
              isArray: false,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/pos`,
            },
          ],
        },
        [`${baseNodeData.name}/pos`]: {
          definitions: [
            {
              name: "x",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
            {
              name: "y",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
          ],
        },
      }),
    );

    const pointFields = {
      definitions: [
        {
          name: "x",
          isArray: false,
          isComplex: false,
          arrayLength: undefined,
          type: "float64",
        },
        {
          name: "y",
          isArray: false,
          isComplex: false,
          arrayLength: undefined,
          type: "float64",
        },
        {
          name: "z",
          isArray: false,
          isComplex: false,
          arrayLength: undefined,
          type: "float64",
        },
      ],
    };

    const pointDataType: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: pointFields,
      }),
    );

    const nestedPointDataType: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "point",
              isArray: false,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/point`,
            },
          ],
        },
        [`${baseNodeData.name}/point`]: pointFields,
      }),
    );

    const poseDataType: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "position",
              isArray: false,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/position`,
            },
            {
              name: "orientation",
              isArray: false,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/orientation`,
            },
          ],
        },
        [`${baseNodeData.name}/position`]: pointFields,
        [`${baseNodeData.name}/orientation`]: {
          definitions: [
            ...pointFields.definitions,
            {
              name: "w",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
          ],
        },
      }),
    );

    const timeDatatypes: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              arrayLength: undefined,
              isArray: false,
              isComplex: false,
              name: "stamp",
              type: "time",
            },
          ],
        },
      }),
    );

    const baseDatatypesWithNestedColor: RosDatatypes = new Map([
      ...basicDatatypes,
      [
        baseNodeData.name,
        {
          definitions: [
            {
              arrayLength: undefined,
              isArray: false,
              isComplex: true,
              name: "color",
              type: "std_msgs/ColorRGBA",
            },
          ],
        },
      ],
    ]);

    const posArrayDatatypes: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "pos",
              isArray: true,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/pos`,
            },
          ],
        },
        [`${baseNodeData.name}/pos`]: {
          definitions: [
            {
              name: "x",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
            {
              name: "y",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
          ],
        },
      }),
    );

    const mixedDatatypes: RosDatatypes = new Map(
      Object.entries({
        [baseNodeData.name]: {
          definitions: [
            {
              name: "details",
              isArray: false,
              isComplex: true,
              arrayLength: undefined,
              type: `${baseNodeData.name}/details`,
            },
          ],
        },
        [`${baseNodeData.name}/details`]: {
          definitions: [
            {
              name: "name",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "string",
            },
            {
              name: "count",
              isArray: false,
              isComplex: false,
              arrayLength: undefined,
              type: "float64",
            },
          ],
        },
      }),
    );

    const testCases: TestCase[] = [
      {
        description: "Nullable return type",
        sourceCode: `
          const publisher = (msg: any): { num: number } | undefined => {
            if (msg.num > 0) {
              return;
            }
            return { num: 1 };
          };
          export default publisher;`,
        datatypes: numDataType,
      },
      {
        description: "Multiple aliases",
        sourceCode: `
          interface NestedType { num: number };
          type Nums = NestedType
          type ReturnType = Nums;
          export default (msg: any): ReturnType => {
           return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Multiple aliases with multiple declarations",
        sourceCode: `
          const NestedType = "not a type";
          interface NestedType { num: number };
          type Nums = NestedType
          type ReturnType = Nums;
          export default (msg: any): ReturnType => {
           return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Type alias as return type",
        sourceCode: `
          interface Nums { num: number };
          type ReturnType = Nums;
          export default (msg: any): ReturnType => {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Enum as return type",
        sourceCode: `
          enum MyEnum { A = 1, B = 2, C };
          export default (msg: any): { val: MyEnum } => {
            return { val: MyEnum.A };
          };`,
        datatypes: uint32DataType,
      },
      {
        description: "Imported type from 'ros' in return type",
        sourceCode: `
          import { Messages } from 'ros';
          export default (msg: any): { point: Messages.geometry_msgs__Point } => {
            return { point: { x: 1, y: 2, z: 3 } };
          };`,
        datatypes: nestedPointDataType,
      },
      {
        description: "Imported type from 'ros' is return type",
        sourceCode: `
          import { Messages } from 'ros';
          export default (msg: any):  Messages.geometry_msgs__Point => {
            return { x: 1, y: 2, z: 3 };
          };`,
        datatypes: pointDataType,
      },
      {
        description: "Imported nested type from 'ros' is return type",
        sourceCode: `
          import { Messages } from 'ros';
          export default (msg: any): Messages.geometry_msgs__Pose => {
            return {position: { x: 1, y: 2, z: 3 }, orientation: { x: 4, y: 5, z: 6, w: 7}};
          };`,
        datatypes: poseDataType,
      },
      {
        description: "Type reference as return type",
        sourceCode: `
          type ReturnType = { num: number }
          export default (msg: any): ReturnType => {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Function type declaration assignment",
        sourceCode: `
          type MyFunc = (msg: any) => { num: number };
          const publisher: MyFunc = (msg) => {
            return { num: 1 };
          };
          export default publisher;`,
        datatypes: numDataType,
      },
      {
        description: "Default export identifier",
        sourceCode: `
          const publisher = (msg: any): { num: number } => {
            return { num: 1 };
          };
          export default publisher;`,
        datatypes: numDataType,
      },
      {
        description: "Multiple exports",
        sourceCode: `
          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";
          export default (msg: any): { num: number } => {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Type literal in default export",
        sourceCode: `
          export default (msg: any): { num: number } => {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Function declaration",
        sourceCode: `
          export default function(msg: { str: string }): { num: number } {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Multiple exports with function declaration",
        sourceCode: `
          export const inputs = [];
          export default function(msg: { str: string }): { num: number } {
            return { num: 1 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Function declaration reference",
        sourceCode: `
          function publish(msg: { str: string }): { num: number } {
            return { num: 1 };
          };
          export default publish;`,
        datatypes: numDataType,
      },
      {
        description: "Multiple return type properties",
        sourceCode: `
          export default (msg: any): { num: number, str: string } => {
            return { num: 1, str: 'hello' };
          };`,
        datatypes: new Map(
          Object.entries({
            [baseNodeData.name]: {
              definitions: [
                {
                  name: "num",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "float64",
                },
                {
                  name: "str",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "string",
                },
              ],
            },
          }),
        ),
      },
      {
        description: "number type alias",
        sourceCode: `
          type Num = number;
          export default (msg: any): { num: Num } => {
            return { num: 42 };
          };`,
        datatypes: numDataType,
      },
      {
        description: "Nested properties",
        sourceCode: `
          export default (msg: any): { pos: { x: number, y: number } } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Deeply nested properties",
        sourceCode: `
          type Header = { time: number };
          export default (msg: any): { pos: { header: Header, x: number, y: number } } => {
            return { pos: { header: { time: 42 }, x: 1, y: 2 } };
          };`,
        datatypes: new Map(
          Object.entries({
            [baseNodeData.name]: {
              definitions: [
                {
                  name: "pos",
                  isArray: false,
                  isComplex: true,
                  arrayLength: undefined,
                  type: `${baseNodeData.name}/pos`,
                },
              ],
            },
            [`${baseNodeData.name}/pos`]: {
              definitions: [
                {
                  name: "header",
                  isArray: false,
                  isComplex: true,
                  arrayLength: undefined,
                  type: `${baseNodeData.name}/pos/header`,
                },
                {
                  name: "x",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "float64",
                },
                {
                  name: "y",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "float64",
                },
              ],
            },
            [`${baseNodeData.name}/pos/header`]: {
              definitions: [
                {
                  name: "time",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "float64",
                },
              ],
            },
          }),
        ),
      },
      {
        description: "Nested properties with type reference",
        sourceCode: `
          type Pos = { x: number, y: number };
          export default (msg: any): { pos: Pos } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Nested properties with multiple nested type references",
        sourceCode: `
          type Num = number;
          type Pos = { x: Num, y: Num };
          export default (msg: any): { pos: Pos } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Nested properties with interface reference",
        sourceCode: `
          interface Pos { x: number, y: number };
          export default (msg: any): { pos: Pos } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Array literal",
        sourceCode: `
          export default (msg: any): { pos: number[] } => {
            return { pos: [ 1, 2, 3 ] };
          };`,
        datatypes: new Map(
          Object.entries({
            [baseNodeData.name]: {
              definitions: [
                {
                  name: "pos",
                  isArray: true,
                  isComplex: true,
                  arrayLength: undefined,
                  type: "float64",
                },
              ],
            },
          }),
        ),
      },
      {
        description: "Array literal type reference",
        sourceCode: `
          type Pos = { x: number, y: number };
          export default (msg: any): { pos: Pos[] } => {
            return { pos: [{ x: 1, y: 2 }] };
          };`,
        datatypes: posArrayDatatypes,
      },
      {
        description: "Generics - interface",
        sourceCode: `
          interface Pos<T> { x: T, y: T };
          export default (msg: any): { pos: Pos<number> } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Generics - type declaration",
        sourceCode: `
          type Details<N, C> = { name: N, count: C };
          export default (msg: any): { details: Details<string, number> } => {
            return { details: { name: 'Studio', count: 1 } };
          };`,
        datatypes: mixedDatatypes,
      },
      {
        description: "Generics - type declaration with defaults",
        sourceCode: `
          type Details<N, C = number> = { name: N, count: C };
          export default (msg: any): { details: Details<string> } => {
            return { details: { name: 'Studio', count: 1 } };
          };`,
        datatypes: mixedDatatypes,
      },
      {
        description: "Generics - type declaration",
        sourceCode: `
          type Pos<T> = { x: T, y: T };
          export default (msg: any): { pos: Pos<number> } => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Nested generics",
        sourceCode: `
          type PointType<P> = P;
          type Pos<T> = { x: PointType<T>, y: number };
          export default (msg: any): { pos: Pos<number> } => {
            return { pos: { x: 1, y: 1 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Fields that look like ROS time",
        sourceCode: `
          type Time = { sec: number, nsec: number };
          export default (msg: any): { stamp: Time } => {
            return { stamp: { sec: 1, nsec: 1 } };
          };`,
        datatypes: timeDatatypes,
      },
      {
        description: "Return types that look like ROS time",
        sourceCode: `
          export default (msg: any): { stamp: { sec: number, nsec: number } } => {
            return { stamp: { sec: 1, nsec: 1 } };
          };`,
        datatypes: timeDatatypes,
      },
      {
        description: "Boolean return types",
        sourceCode: `
          export default (msg: any): { isTrue: boolean } => {
            return { isTrue: true };
          };`,
        datatypes: new Map(
          Object.entries({
            [baseNodeData.name]: {
              definitions: [
                {
                  name: "isTrue",
                  isArray: false,
                  isComplex: false,
                  arrayLength: undefined,
                  type: "bool",
                },
              ],
            },
          }),
        ),
      },
      {
        description: "Indexed access type",
        sourceCode: `
          interface Pos { position: { pos: { x: number, y: number } }, lala: string  };
          export default (msg: any): Pos["position"] => {
            return { pos: { x: 1, y: 2 } };
          };`,
        datatypes: posDatatypes,
      },
      {
        description: "Should return any arbritrary datatype as the return type",
        sourceCode: `
          import { Messages } from "ros";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): Messages.std_msgs__ColorRGBA => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "std_msgs/ColorRGBA",
      },
      {
        description:
          "Should return any arbritrary datatype w/nested autogenerated type as the return type",
        sourceCode: `
          import { Messages } from "ros";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          type ReturnType = { color: Messages.std_msgs__ColorRGBA };

          const publisher = (message: any): ReturnType => {
            return { color: { r: 1, g: 1, b: 1, a: 1 } };
          };
          export default publisher;`,
        datatypes: baseDatatypesWithNestedColor,
        outputDatatype: "/studio_script/main",
      },
      {
        description: "Should handle type aliases",
        sourceCode: `
          import { Messages } from "ros";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          type ReturnType = Messages.std_msgs__ColorRGBA;

          const publisher = (message: any): ReturnType => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "std_msgs/ColorRGBA",
      },
      {
        description: "Should handle deep type aliases",
        sourceCode: `
          import { Messages, TopicsToMessageDefinition } from "ros";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): TopicsToMessageDefinition["/some_topic"] => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "std_msgs/ColorRGBA",
      },
      {
        description: "Should handle very deep type aliases",
        sourceCode: `
          import { Messages, TopicsToMessageDefinition } from "ros";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          type Alias = TopicsToMessageDefinition["/some_topic"]

          const publisher = (message: any): Alias => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "std_msgs/ColorRGBA",
      },
      {
        description: "Should detect output datatype from @foxglove/schemas",
        sourceCode: `
          import { Color } from "@foxglove/schemas";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): Color => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "foxglove.Color",
      },
      {
        description: "Allows TypedArrays when output datatype is from @foxglove/schemas",
        sourceCode: `
          import { LaserScan } from "@foxglove/schemas";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): LaserScan => {
            return {
              timestamp: {sec: 0, nsec: 1},
              frame_id: "",
              pose: {
                position: {x: 0, y: 0, z: 0},
                orientation: {x: 0, y: 0, z: 0, w: 1},
              },
              start_angle: 0,
              end_angle: 0,
              ranges: new Float64Array([1, 2, 3]),
              intensities: new Float32Array([1, 2, 3]),
            };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "foxglove.LaserScan",
      },
      {
        description:
          "Rejects wrong kind of TypedArray when output datatype is from @foxglove/schemas",
        sourceCode: `
          import { LaserScan } from "@foxglove/schemas";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): LaserScan => {
            return {
              timestamp: {sec: 0, nsec: 1},
              frame_id: "",
              pose: {
                position: {x: 0, y: 0, z: 0},
                orientation: {x: 0, y: 0, z: 0, w: 1},
              },
              start_angle: 0,
              end_angle: 0,
              ranges: new Float64Array([1, 2, 3]),
              intensities: new Uint32Array([1, 2, 3]),
            };
          };

          export default publisher;`,
        error: 2322,
        errorMessage: expect.stringContaining(
          `Type 'Uint32Array' is not assignable to type 'number[] | Float32Array | Float64Array'`,
        ),
      },
      {
        description: "Should handle deep subtype lookup",
        sourceCode: `
          import { Input } from "ros";

          type MessageBySchemaName = {
            "std_msgs/Header": {
              frame_id: string;
              seq: number;
              stamp: {
                sec: number,
                nsec: number,
              };
            };
            "pkg/Custom": {
              header: MessageBySchemaName["std_msgs/Header"];
            };
          };

          type Message<T extends keyof MessageBySchemaName> = MessageBySchemaName[T];

          export const inputs = ["/some_topic"];
          export const output = "/studio_script/sample";

          type PoseStamped = Message<"pkg/Custom">;
          type Output = PoseStamped;

          const publisher = (message: Input<"/some_topic">): Output => {
            return {
              header: { frame_id: "foo", seq: 0, stamp: { sec: 0, nsec: 0 } },
            };
          };
          export default publisher;`,
        datatypes: new Map(
          Object.entries({
            "/studio_script/main": {
              definitions: [
                {
                  arrayLength: undefined,
                  isArray: false,
                  isComplex: true,
                  name: "header",
                  type: "/studio_script/main/header",
                },
              ],
            },
            "/studio_script/main/header": {
              definitions: [
                {
                  arrayLength: undefined,
                  isArray: false,
                  isComplex: false,
                  name: "frame_id",
                  type: "string",
                },
                {
                  arrayLength: undefined,
                  isArray: false,
                  isComplex: false,
                  name: "seq",
                  type: "float64",
                },
                {
                  arrayLength: undefined,
                  isArray: false,
                  isComplex: false,
                  name: "stamp",
                  type: "time",
                },
              ],
            },
          }),
        ),
        outputDatatype: "/studio_script/main",
      },
      {
        description: "Should detect output datatype from input datatypes",
        sourceCode: `
          import { Message } from "./types";

          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";

          const publisher = (message: any): Message<"std_msgs/ColorRGBA"> => {
            return { r: 1, g: 1, b: 1, a: 1 };
          };

          export default publisher;`,
        datatypes: basicDatatypes,
        outputDatatype: "std_msgs/ColorRGBA",
      },
      /*
      ERRORS
      */
      {
        description: "No default export",
        sourceCode: `
          export const inputs = [];
          export const output = "/hello";`,
        error: ErrorCodes.DatatypeExtraction.NO_DEFAULT_EXPORT,
      },
      {
        description: "Exporting a publisher function without a type return",
        sourceCode: `
          export default () => {};`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Exporting a publisher function with a return type 'any'",
        sourceCode: `
          export default (): any => {};`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Exporting a publisher function with a return type alias of 'any'",
        sourceCode: `
          type MyAny = any;
          export default (msg: any): MyAny => {
            return 'BAD MSG';
          };`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Multiple declarations (type, const)",
        sourceCode: `
          const MyAny = 'a const';
          type MyAny = 42;

          export default (msg: any): MyAny => {
            return 42;
          };`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Exporting a publisher function with a return type alias of 'any'",
        sourceCode: `
          type MyMyAny = any;
          type MyAny = MyMyAny;
          export default (msg: any): MyAny => {
            return 'BAD MSG';
          };`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Nested 'any' in the return type",
        sourceCode: `
          type NestedAny = { prop: any };
          export default (msg: any): NestedAny => {
            return { prop: 1 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_NESTED_ANY,
      },
      {
        description: "Complex nested 'any' in the return type",
        sourceCode: `
          type NestedAny = { prop: any[] };
          export default (msg: any): NestedAny => {
            return { prop: [ 1 ] };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_NESTED_ANY,
      },
      {
        description: "Exporting a Record type",
        sourceCode: `
          type RecordType = Record<string, any>;
          export default (msg: any): RecordType => {
            return { foo: "bar" };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_MAPPED_TYPES,
      },
      {
        description: "Exporting a mapped type",
        sourceCode: `
          type Readonly<T> = {
            readonly [P in keyof T]: T[P];
          };
          type SomeType = Record<string, any>;
          type MappedType = Readonly<SomeType>;
          export default (msg: any): MappedType => {
            return { foo: "bar" };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_MAPPED_TYPES,
      },
      {
        description: "Exporting a publisher function with a return type 'void'",
        sourceCode: `
          export default (): void => {};`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Exporting a type reference as default export",
        sourceCode: `
          type orange = { [name: string]: number };
          export default orange;`,
        error: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
      },
      {
        description: "Export an object as default export.",
        sourceCode: `
          export default {};`,
        error: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
      },
      {
        description: "Export a number as default export.",
        sourceCode: `
          export default 42;`,
        error: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
      },
      {
        description: "Export a number reference as default export.",
        sourceCode: `
          const num = 42;
          export default num;`,
        error: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
      },
      {
        description: "Export a string as default export.",
        sourceCode: `
          export default 'hello foxglove';`,
        error: ErrorCodes.DatatypeExtraction.NON_FUNC_DEFAULT_EXPORT,
      },
      {
        description: "unions",
        sourceCode: `
          export default (msg: any): { num: number | string } => {
            return { num: 42 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_UNIONS,
      },
      {
        description: "functions expression",
        sourceCode: `
          export default (msg: any): { func: () => void } => {
            return { func: () => {} };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_FUNCTIONS,
      },
      {
        description: "functions expression",
        sourceCode: `
          type Func = () => void;
          export default (msg: any): { func: Func } => {
            return { func: () => {} };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_FUNCTIONS,
      },
      {
        description: "number literals",
        sourceCode: `
          export default (msg: any): { num: 42 } => {
            return { num: 42 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TYPE_LITERALS,
      },
      {
        description: "string literals",
        sourceCode: `
          export default (msg: any): { str: 'type_1' } => {
            return { str: 'type_1' };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TYPE_LITERALS,
      },
      {
        description: "Tuples",
        sourceCode: `
          export default (msg: any): { pos: [ number, number ] } => {
            return { pos: [ 1, 2 ] };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TUPLES,
      },
      {
        description: "Array keyword",
        sourceCode: `
          type Pos = { x: number, y: number };
          export default (msg: any): { pos: Array<Pos> } => {
            return { pos: [{ x: 1, y: 2 }] };
          };`,
        error: ErrorCodes.DatatypeExtraction.PREFER_ARRAY_LITERALS,
      },
      {
        description: "Nested intersection types",
        sourceCode: `
          type A = { x: number };
          type B = { y: number, z: number }
          export default (msg: any): { pos: A & B } => {
            return { pos: { x: 1, y: 2, z: 3 } };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_INTERSECTION_TYPES,
      },
      {
        description: "Intersection types",
        sourceCode: `
          type A = { x: number };
          type B = { y: number, z: number }
          export default (msg: any): A & B => {
            return { x: 1, y: 2, z: 3 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_INTERSECTION_TYPES,
      },
      {
        description: "Imported intersection types",
        rosLib: `
          export declare type MultiPointMarker = { badType: boolean } ;

          export declare type LineStripMarker = MultiPointMarker & {
            type: 4
          };
        `,
        sourceCode: `
          import { LineStripMarker } from "ros";

          type Output = { m: LineStripMarker[] };
          export const inputs = [];
          export const output = "${DEFAULT_STUDIO_SCRIPT_PREFIX}";
          const publisher = (message: any): Output => {
              return { m: [] }
          };
          export default publisher;`,

        error: ErrorCodes.DatatypeExtraction.NO_INTERSECTION_TYPES,
      },
      {
        description: "Class types",
        sourceCode: `
          class MyClass {};
          export default (msg: any): MyClass => {
            return new MyClass();
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_CLASSES,
      },
      {
        description: "Nested class types",
        sourceCode: `
          class MyClass {};
          type ReturnType = { myClass: MyClass }
          export default (msg: any): { myClass: MyClass } => {
            return { myClass: new MyClass() };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_CLASSES,
      },
      {
        description: "typeof func",
        sourceCode: `
          const func = (): number => 42;
          type MyAny = typeof func;

          export default (msg: any): MyAny => {
            return () => 1;
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_FUNCTIONS,
      },
      {
        description: "Nested typeof func",
        sourceCode: `
          const func = (): number => 42;
          type MyAny = { func: typeof func };

          export default (msg: any): MyAny => {
            return { func: () => 1 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TYPEOF,
      },
      {
        description: "typeof string literals",
        sourceCode: `
          const constant_1 = 'type_1';
          export default (msg: any): { str: typeof constant_1 } => {
            return { str: 'type_1' };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TYPEOF,
      },
      {
        description: "typeof number literals",
        sourceCode: `
          const constant_1 = 42;
          export default (msg: any): { num: typeof constant_1 } => {
            return { num: 42 };
          };`,
        error: ErrorCodes.DatatypeExtraction.NO_TYPEOF,
      },
      {
        description: "Bad union return type",
        sourceCode: `
          const publisher = (msg: any): { num: number } | undefined | { str: string } => {
            if (msg.num > 0) {
              return;
            }
            return { num: 1 };
          };
          export default publisher;`,
        error: ErrorCodes.DatatypeExtraction.LIMITED_UNIONS,
      },
      {
        description: "Return type member with no type",
        sourceCode: `
          // @ts-ignore
          export default function(): {x} {
            throw new Error();
          };
          `,
        error: ErrorCodes.DatatypeExtraction.INVALID_PROPERTY,
      },
      {
        description: "Return type member with no name",
        sourceCode: `
          export default function(): {(): number;} {
            throw new Error();
          };
          `,
        error: ErrorCodes.DatatypeExtraction.INVALID_PROPERTY,
      },
      {
        description: "Indexed access type with non-literal index",
        sourceCode: `
          interface Pos { position: { pos: { x: number, y: number } }, lala: string  };
          export default (msg: any): Pos[keyof Pos] => {
            return { pos: { x: 1, y: 2 } };
          };`,
        error: ErrorCodes.DatatypeExtraction.LIMITED_UNIONS,
      },
      {
        description: "Indexed access type with non-string index",
        sourceCode: `
          interface Pos { [key: number]: number  };
          export default (msg: any): Pos[3] => {
            throw new Error();
          };`,
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
      {
        description: "Generic type that's just too difficult :(",
        sourceCode: `
          import { Input, Message } from "./types";
          type Output = {
            foo: Message<"Foo">;
          };
          export default (msg: any): Output => {
            throw new Error();
          };`,
        datatypes: new Map([["Foo", { definitions: [] }]]),
        errorMessage: "Unsupported type for member 'foo'.",
        error: ErrorCodes.DatatypeExtraction.BAD_TYPE_RETURN,
      },
    ];

    describe("extracts datatypes from the return type of the publisher", () => {
      // Run all tests if no only/skip params have been specified.
      let filteredTestCases = testCases.filter(({ only }) => only === true);
      if (filteredTestCases.length === 0) {
        filteredTestCases = testCases;
      }
      filteredTestCases = filteredTestCases.filter(({ skip }) =>
        typeof skip === "boolean" ? !skip : true,
      );
      filteredTestCases.forEach(
        ({
          description,
          sourceCode,
          datatypes = new Map(),
          error,
          errorMessage,
          outputDatatype,
          rosLib,
        }) => {
          it(`${error != undefined ? "Expected Error: " : ""}${description}`, () => {
            const typesLib = generateTypesLib({ topics: [], datatypes });
            const inputNodeData: ScriptData = {
              ...baseNodeData,
              datatypes,
              sourceCode,
              typesLib,
              ...(rosLib != undefined ? { rosLib } : {}),
            };
            const nodeData = extract(inputNodeData, []);
            if (error == undefined) {
              expect(nodeData.diagnostics).toEqual([]);
              expect(nodeData.outputDatatype).toEqual(outputDatatype ?? nodeData.name);
              expect(nodeData.datatypes).toEqual(datatypes);
            } else {
              expect(nodeData.diagnostics.map(({ code }) => code)).toEqual([error]);
            }
            if (errorMessage != undefined) {
              expect(nodeData.diagnostics.map(({ message }) => message)).toEqual([errorMessage]);
            }
          });
        },
      );
    });
  });
});
