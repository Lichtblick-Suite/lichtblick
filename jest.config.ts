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
