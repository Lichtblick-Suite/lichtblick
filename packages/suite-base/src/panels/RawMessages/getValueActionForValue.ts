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

import { isTypicalFilterName } from "@lichtblick/suite-base/components/MessagePathSyntax/isTypicalFilterName";

import { MessagePathStructureItem, PrimitiveType } from "@foxglove/message-path";

export type ValueAction = {
  singleSlicePath: string; // Path that will only return one value per unit of time (for line charts).
  multiSlicePath: string; // Path that might return multiple values per unit of time (for scatter plots).
  primitiveType: string; // The ROS primitive type that these paths point at.
  filterPath: string; // Path to filter on using the current value
};

const isObjectElement = (
  value: unknown,
  pathItem: string | number,
  structureItem: MessagePathStructureItem | undefined,
): boolean => {
  return (
    typeof pathItem === "string" &&
    (structureItem == undefined || structureItem.structureType === "message") &&
    typeof value === "object"
  );
};

const isArrayElement = (
  value: unknown,
  pathItem: string | number,
  structureItem: MessagePathStructureItem | undefined,
): boolean =>
  typeof pathItem === "number" &&
  (structureItem == undefined || structureItem.structureType === "array") &&
  Array.isArray(value);

// Given a root value (e.g. a message object), a root structureItem (e.g. a message definition),
// and a key path to navigate down the value and strutureItem (e.g. ["items", 10, "speed"]), return
// a bunch of paths for that navigated down value.
export function getValueActionForValue(
  rootValue: unknown,
  rootStructureItem: MessagePathStructureItem | undefined,
  keyPath: (number | string)[],
): ValueAction | undefined {
  let singleSlicePath = "";
  let multiSlicePath = "";
  let filterPath = "";
  let value: unknown = rootValue;
  let structureItem: MessagePathStructureItem | undefined = rootStructureItem;
  // Walk down the keyPath, while updating `value` and `structureItem`
  for (const pathItem of keyPath) {
    if (value == undefined) {
      break;
    } else if (isObjectElement(value, pathItem, structureItem)) {
      structureItem =
        structureItem?.structureType === "message" && typeof pathItem === "string"
          ? structureItem.nextByName[pathItem]
          : undefined;
      value = (value as Record<string, unknown>)[pathItem];
      if (multiSlicePath.endsWith("[:]") && structureItem?.structureType === "primitive") {
        // We're just inside a message that is inside an array, so we might want to pivot on this new value.
        if (typeof value === "bigint") {
          filterPath = `${multiSlicePath}{${pathItem}==${value.toString()}}`;
        } else {
          filterPath = `${multiSlicePath}{${pathItem}==${JSON.stringify(value) ?? ""}}`;
        }
      } else {
        filterPath = "";
      }
      singleSlicePath += `.${pathItem}`;
      multiSlicePath += `.${pathItem}`;
    } else if (isArrayElement(value, pathItem, structureItem)) {
      value = (value as Record<string, unknown>)[pathItem];
      structureItem = structureItem?.structureType === "array" ? structureItem.next : undefined;
      multiSlicePath = `${singleSlicePath}[:]`;

      // Ideally show something like `/topic.object[:]{id=123}` for the singleSlicePath, but fall
      // back to `/topic.object[10]` if necessary.
      let typicalFilterName;
      if (structureItem?.structureType === "message") {
        typicalFilterName = Object.entries(structureItem.nextByName).find(
          ([key, nextStructureItem]) =>
            nextStructureItem.structureType === "primitive" && isTypicalFilterName(key),
        )?.[0];
      }
      if (
        typeof value === "object" &&
        value != undefined &&
        typeof typicalFilterName === "string"
      ) {
        const filterValue = (value as Record<string, unknown>)[typicalFilterName];
        singleSlicePath += `[:]{${typicalFilterName}==${
          typeof filterValue === "bigint"
            ? filterValue.toString()
            : JSON.stringify(filterValue) ?? ""
        }}`;
      } else {
        singleSlicePath += `[${pathItem}]`;
      }
    } else if (structureItem?.structureType === "primitive") {
      // ROS has primitives with nested data (time, duration).
      // We currently don't support looking inside them.
      return undefined;
    } else {
      throw new Error(`Invalid structureType: ${structureItem?.structureType} for value/pathItem.`);
    }
  }
  // At this point we should be looking at a primitive. If not, just return nothing.
  if (value != undefined) {
    // If we know the primitive type from the schema, use it.
    if (structureItem?.structureType === "primitive") {
      return {
        singleSlicePath,
        multiSlicePath,
        primitiveType: structureItem.primitiveType,
        filterPath,
      };
    }
    // Otherwise, deduce a roughly-correct type from the runtime type of the value.
    let primitiveType: PrimitiveType | undefined;
    switch (typeof value) {
      case "bigint":
        primitiveType = "int64";
        break;
      case "boolean":
        primitiveType = "bool";
        break;
      case "number":
        primitiveType = "int32"; // compatible with both Plot and State Transitions
        break;
      case "string":
        primitiveType = "string";
        break;
      default:
        break;
    }
    if (primitiveType != undefined) {
      return {
        singleSlicePath,
        multiSlicePath,
        primitiveType,
        filterPath,
      };
    }
  }
  return undefined;
}

// Given root structureItem (e.g. a message definition),
// and a key path to navigate down, return strutureItem for the field at that path
export const getStructureItemForPath = (
  rootStructureItem: MessagePathStructureItem | undefined,
  keyPath: (number | string)[],
): MessagePathStructureItem | undefined => {
  let structureItem: MessagePathStructureItem | undefined = rootStructureItem;
  // Walk down the keyPath, while updating `value` and `structureItem`
  for (const pathItem of keyPath) {
    if (structureItem == undefined) {
      break;
    } else if (structureItem.structureType === "message" && typeof pathItem === "string") {
      structureItem = structureItem.nextByName[pathItem];
    } else if (structureItem.structureType === "array" && typeof pathItem === "number") {
      structureItem = structureItem.next;
    } else if (structureItem.structureType === "primitive") {
      // ROS has some primitives that contain nested data (time+duration). We currently don't
      // support looking inside them.
      return structureItem;
    } else {
      throw new Error(`Invalid structureType: ${structureItem.structureType} for value/pathItem.`);
    }
  }
  return structureItem;
};
