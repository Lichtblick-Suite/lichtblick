// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { definitions } from "./messageDefinitionTestTypes";
import { addTimeTypes, friendlyTypeName, typeSize } from "./messageDefinitionUtils";

describe("friendlyTypeName", () => {
  it("removes slashes from primitives and message types", () => {
    expect(friendlyTypeName("time")).toBe("time");
    expect(friendlyTypeName("std_msgs/Header")).toBe("std_msgs_Header");
  });

  it("removes more than one slash when several are present", () => {
    expect(friendlyTypeName("webviz_msgs/traffic_light_lane_state/directive_state")).toBe(
      "webviz_msgs_traffic_light_lane_state_directive_state",
    );
  });
});

describe("addTimeTypes", () => {
  it("adds time definitions to the definitions of 'real' complex types", () => {
    expect(addTimeTypes(definitions)).toEqual({
      ...definitions,
      time: {
        fields: [
          { name: "sec", type: "int32" },
          { name: "nsec", type: "int32" },
        ],
      },
      duration: {
        fields: [
          { name: "sec", type: "int32" },
          { name: "nsec", type: "int32" },
        ],
      },
    });
  });
});

describe("typeSize", () => {
  it("works for primitives", () => {
    expect(typeSize(definitions, "time")).toBe(8);
    expect(typeSize(definitions, "string")).toBe(8);
    expect(typeSize(definitions, "int8")).toBe(1);
    expect(typeSize(definitions, "float32")).toBe(4);
  });

  it("works for simple compound datatypes", () => {
    expect(typeSize(definitions, "std_msgs/Header")).toBe(
      /*4 + 8 + 8*/
      20,
    );
  });

  it("works for more complex datatypes", () => {
    expect(typeSize(definitions, "fake_msgs/HasComplexAndArray")).toBe(8 + 20);
  });

  it("works for constants", () => {
    expect(typeSize(definitions, "fake_msgs/HasConstant")).toBe(0);
  });

  it("throws for datatypes that don't exist", () => {
    expect(() => typeSize(definitions, "asdf")).toThrow();
  });

  it("works for arrays of complex datatypes", () => {
    expect(typeSize(definitions, "fake_msgs/HasComplexArray")).toBe(8);
  });
});
