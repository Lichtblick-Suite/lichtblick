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
import { $Values } from "utility-types";

import { DiagnosticSeverity, Diagnostic } from "@foxglove-studio/app/players/UserNodePlayer/types";

const mapCategoryToDiagnosticSeverity = (
  category: ts.DiagnosticCategory,
): $Values<typeof DiagnosticSeverity> => {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Info;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    default:
      throw new Error("Diagnostic category not recognized");
  }
};

// Function responsible for transforming diagnostic information into a format
// the monaco-editor can use.
export const transformDiagnosticToMarkerData = (diagnostic: ts.Diagnostic): Diagnostic => {
  if (!diagnostic.file || diagnostic.start === undefined || diagnostic.length === undefined) {
    throw new Error("Invariant: diagnostic is not initialized");
  }

  const {
    line: startLineNumber,
    character: startColumn,
  } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

  const {
    line: endLineNumber,
    character: endColumn,
  } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start + diagnostic.length);

  let messageText = "";
  // Typescript sometimes builds a linked list of formatted diagnostic messages
  // to be used as part of a multiline message.
  if (typeof diagnostic.messageText === "string") {
    messageText = diagnostic.messageText;
  } else {
    let message = diagnostic.messageText;
    while (message.next) {
      messageText += `\n${message.messageText}`;
      message = message.next;
    }
  }

  return {
    message: messageText,
    severity: mapCategoryToDiagnosticSeverity(diagnostic.category),
    source: "Typescript",
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    // TODO: Maybe map these 'codes' to meaningful strings?
    code: diagnostic.code,
  };
};

// https://www.typescriptlang.org/docs/handbook/compiler-options.html
export const baseCompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
};
