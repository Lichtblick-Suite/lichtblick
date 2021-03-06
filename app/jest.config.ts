// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// Shared configuration used by all jest projects
const sharedConfig = {
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
    },
  },
  setupFiles: ["<rootDir>/test/setup.ts", "<rootDir>/test/setupEnzyme.ts", "jest-canvas-mock"],
  setupFilesAfterEnv: ["<rootDir>/test/setupTestFramework.ts"],
  restoreMocks: true,
  transform: {
    "\\.ne$": "<rootDir>/test/transformers/neTransformer.js",
    "\\.(bin|template|wasm)$": "<rootDir>/test/transformers/rawTransformer.js",
  },
  moduleNameMapper: {
    "worker-loader.*!.*/UserNodePlayer/.+Worker": "<rootDir>/players/UserNodePlayer/worker.mock.ts",
    "worker-loader.*!.*": "<rootDir>/test/mocks/MockWorker.ts",
    "(.*)\\?raw$": "$1",
    "\\.svg$": "<rootDir>/test/mocks/MockSvg.tsx",
    "react-monaco-editor": "<rootDir>/test/stubs/MonacoEditor.tsx",
    "\\.(glb|md|png)$": "<rootDir>/test/mocks/fileMock.ts",
    "\\.(css|scss)$": "<rootDir>/test/mocks/styleMock.ts",
  },
};

export default {
  projects: [
    // Configuration used by root jest project only
    {
      ...sharedConfig,
      transform: {
        ...sharedConfig.transform,
        "[\\/]nodeTransformerWorker[\\/]typescript[\\/]userUtils[\\/].+\\.ts":
          "<rootDir>/test/transformers/rawTransformer.js",
      },
      testPathIgnorePatterns: [
        "/node_modules/",
        // Ignore userUtils tests - they are run in the nested jest project
        "[\\/]nodeTransformerWorker[\\/]typescript[\\/]userUtils[\\/]",
      ],
    },

    // Custom config to support running userUtils tests, which import typescript files
    // as ordinary modules (in all other tests they are imported as strings).
    // Outside of jest, webpack handles this for us using "?raw" in the module name.
    {
      ...sharedConfig,
      displayName: "Node Playground userUtils tests",
      testRegex: "[\\/]nodeTransformerWorker[\\/]typescript[\\/]userUtils[\\/].+\\.test\\.tsx?$",
    },
  ],
};
