// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

module.exports = {
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsconfig: "app/tsconfig.json",
    },
  },
  setupFiles: [
    "<rootDir>/app/test/setup.ts",
    "<rootDir>/app/test/setupEnzyme.ts",
    "jest-canvas-mock",
  ],
  setupFilesAfterEnv: ["<rootDir>/app/test/setupTestFramework.ts"],
  restoreMocks: true,
  transform: {
    "\\.ne$": "<rootDir>/app/test/transformers/neTransformer.js",
    "\\.(bin|template|wasm)$": "<rootDir>/app/test/transformers/rawTransformer.js",
  },
  moduleNameMapper: {
    "worker-loader.*!.*/UserNodePlayer/.+Worker":
      "<rootDir>/app/players/UserNodePlayer/worker.mock.ts",
    "worker-loader.*!.*": "<rootDir>/app/test/mocks/MockWorker.ts",
    "\\.svg$": "<rootDir>/app/test/mocks/MockSvg.tsx",
    "react-monaco-editor": "<rootDir>/app/test/stubs/MonacoEditor.tsx",
    "\\.(glb|md|png)$": "<rootDir>/app/test/mocks/fileMock.ts",
    "\\.(css|scss)$": "<rootDir>/app/test/mocks/styleMock.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/.webpack"],
};
