// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { Immutable } from "@lichtblick/suite";
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

// Exported for tests
export const constantsByDatatype = (
  datatypes: Immutable<RosDatatypes>,
): Record<string, Record<string, string>> => {
  type Result = Record<string | number, string>;
  const results: Record<string, Result> = {};
  for (const [datatype, value] of datatypes) {
    const result: Result = (results[datatype] = {});
    for (const field of value.definitions) {
      if (
        field.isConstant === true &&
        field.value != undefined &&
        typeof field.value !== "boolean"
      ) {
        if (result[field.value.toString()] != undefined) {
          result[field.value.toString()] = "<multiple constants match>";
        } else {
          result[field.value.toString()] = field.name;
        }
      }
    }
  }
  return results;
};

const extractTypeFromStudioEnumAnnotationRegex = /(.*)__(foxglove|webviz)_enum$/;

// Lichtblick enum annotations are of the form: "Foo__foxglove_enum" (notice double underscore)
// This method returns type name from "Foo" or undefined name doesn't match this format
export function extractTypeFromStudioEnumAnnotation(name: string): string | undefined {
  const match = extractTypeFromStudioEnumAnnotationRegex.exec(name);
  return match?.[1];
}

// Returns a nested record of the form {datatype -> {field -> {value -> name}}}.
export const enumValuesByDatatypeAndField = (
  datatypes: Immutable<RosDatatypes>,
): { [datatype: string]: { [field: string]: { [value: string]: string } } } => {
  const datatypeConstants = constantsByDatatype(datatypes);
  const results: { [datatype: string]: { [field: string]: { [value: string]: string } } } = {};
  for (const [datatype, value] of datatypes) {
    const currentResult: { [field: string]: { [value: string]: string } } = {};
    // keep track of parsed constants
    let constants: { [key: string]: string } = {};
    // constants' types
    let lastType: string | undefined;
    for (const field of value.definitions) {
      if (lastType != undefined && field.type !== lastType) {
        // encountering new type resets the accumulated constants
        constants = {};
        lastType = undefined;
      }

      if (
        field.isConstant === true &&
        field.value != undefined &&
        typeof field.value !== "boolean"
      ) {
        lastType = field.type;
        if (constants[field.value.toString()] != undefined) {
          constants[field.value.toString()] = "<multiple constants match>";
        } else {
          constants[field.value.toString()] = field.name;
        }
        continue;
      }
      // check if current field is annotation of the form: "Foo bar__foxglove_enum"
      // This means that "bar" is enum of type "Foo"
      const fieldName = extractTypeFromStudioEnumAnnotation(field.name);
      if (fieldName != undefined) {
        // associate all constants of type field.type with the annotated field
        const fieldConstants = datatypeConstants[field.type];
        if (fieldConstants) {
          currentResult[fieldName] = fieldConstants;
        }
        continue;
      }

      // this field was already covered by annotation, skip it
      if (currentResult[field.name]) {
        continue;
      }

      // otherwise assign accumulated constants for that field
      if (Object.keys(constants).length > 0) {
        currentResult[field.name] = constants;
      }
      // and start over - reset constants
      constants = {};
    }
    // only assign result if we found non-empty mapping into constants
    if (Object.keys(currentResult).length > 0) {
      results[datatype] = currentResult;
    }
  }
  return results;
};
