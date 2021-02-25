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
  moduleNameMapper: {
    "worker-loader.*!.*/UserNodePlayer/.+Worker": "app/players/UserNodePlayer/worker.mock.ts",
    "worker-loader.*!.*": "app/test/MockWorker.ts",
    "\\.svg$": "app/test/MockSvg.tsx",
    "react-monaco-editor": "app/test/stubs/MonacoEditor.tsx",
    "\\.css$": "app/test/MockCss.ts",
  },
};
