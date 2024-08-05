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

import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import {
  Diagnostic,
  DiagnosticSeverity,
  ErrorCodes,
  ProcessMessageOutput,
  RegistrationOutput,
  Sources,
  UserScriptLog,
} from "@lichtblick/suite-base/players/UserScriptPlayer/types";
import { DEFAULT_STUDIO_SCRIPT_PREFIX } from "@lichtblick/suite-base/util/globalConstants";
import path from "path";

// Each script runtime worker runs one script at a time, hence why we have one
// global declaration of 'nodeCallback'.
let nodeCallback: (
  message: unknown,
  globalVariables: GlobalVariables,
) => Record<string, unknown> | undefined;

if (process.env.NODE_ENV === "test") {
  // When in tests, clear out the callback between tests.
  beforeEach(() => {
    nodeCallback = () => {
      return undefined;
    };
  });
}

export const containsFuncDeclaration = (args: unknown[]): boolean => {
  for (const arg of args) {
    if (typeof arg === "function") {
      return true;
    } else if (typeof arg === "object" && arg != undefined) {
      for (const value of Object.values(arg)) {
        if (containsFuncDeclaration([value])) {
          return true;
        }
      }
    }
  }
  return false;
};

export const stringifyFuncsInObject = (arg: unknown): unknown => {
  if (typeof arg === "function") {
    return `${arg}`;
  } else if (typeof arg === "object" && arg != undefined) {
    const newArg: Record<string, unknown> = { ...arg };
    for (const [key, value] of Object.entries(arg)) {
      newArg[key] = stringifyFuncsInObject(value);
    }
    return newArg;
  }
  return arg;
};

const getArgsToPrint = (args: unknown[]) => {
  return args
    .map(stringifyFuncsInObject)
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg));
};

// Exported for tests.
export const requireImplementation = (id: string, projectCode: Map<string, string>): unknown => {
  const requestedFile = `${path.join(DEFAULT_STUDIO_SCRIPT_PREFIX, id)}.js`;
  for (const [file, source] of projectCode.entries()) {
    if (requestedFile.endsWith(file)) {
      const sourceExports = {};
      const require = (reqId: string) => requireImplementation(reqId, projectCode);
      // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
      new Function("exports", "require", source)(sourceExports, require);
      return sourceExports;
    }
  }
  throw new Error(`User script required unknown module: '${id}'`);
};

export const registerScript = ({
  scriptCode,
  projectCode,
}: {
  scriptCode: string;
  projectCode: Map<string, string>;
}): RegistrationOutput => {
  const userScriptLogs: UserScriptLog[] = [];
  const userScriptDiagnostics: Diagnostic[] = [];
  (self as { log?: unknown }).log = function (...args: unknown[]) {
    // recursively check that args do not contain a function declaration
    if (containsFuncDeclaration(args)) {
      const argsToPrint = getArgsToPrint(args);
      throw new Error(
        `Cannot invoke log() with a function argument (registerScript) - log(${argsToPrint.join(
          ", ",
        )})`,
      );
    }
    userScriptLogs.push(...args.map((value) => ({ source: "registerScript" as const, value })));
  };
  try {
    const nodeExports: { default?: typeof nodeCallback } = {};

    const require = (id: string) => requireImplementation(id, projectCode);

    // Using new Function in order to execute user-input text in User Scripts as code
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
    new Function("exports", "require", scriptCode)(nodeExports, require);
    nodeCallback = nodeExports.default!;
    return {
      error: undefined,
      userScriptLogs,
      userScriptDiagnostics,
    };
  } catch (e) {
    const error: string = e.toString();
    return {
      error: error.length > 0 ? error : `Unknown error encountered registering this node.`,
      userScriptLogs,
      userScriptDiagnostics,
    };
  }
};

export const processMessage = ({
  message,
  globalVariables,
}: {
  message: unknown;
  globalVariables: GlobalVariables;
}): ProcessMessageOutput => {
  const userScriptLogs: UserScriptLog[] = [];
  const userScriptDiagnostics: Diagnostic[] = [];
  (self as { log?: unknown }).log = function (...args: unknown[]) {
    // recursively check that args do not contain a function declaration
    if (containsFuncDeclaration(args)) {
      const argsToPrint = getArgsToPrint(args);
      throw new Error(
        `Cannot invoke log() with a function argument (processMessage) - log(${argsToPrint.join(
          ", ",
        )})`,
      );
    }
    userScriptLogs.push(...args.map((value) => ({ source: "processMessage" as const, value })));
  };
  try {
    const newMessage = nodeCallback(message, globalVariables);
    return { message: newMessage, error: undefined, userScriptLogs, userScriptDiagnostics };
  } catch (err) {
    const error: string = err.toString();
    const diagnostic: Diagnostic = {
      source: Sources.Runtime,
      severity: DiagnosticSeverity.Error,
      message: error.length > 0 ? error : "Unknown error encountered running this node.",
      code: ErrorCodes.RUNTIME,
    };

    return {
      message: undefined,
      error: undefined,
      userScriptLogs,
      userScriptDiagnostics: [diagnostic],
    };
  }
};
