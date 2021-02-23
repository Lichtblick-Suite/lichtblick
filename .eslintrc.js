module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  ignorePatterns: [
    "app/**/*.js", // ignore flow files for now
  ],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["react", "react-hooks", "@typescript-eslint"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off", // TODO: remove once we fix all TS issues
    // It's sometimes useful to explicitly name to guard against future changes
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-empty-function": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
  },
  settings: {
    "import/ignore": ["\\.js$"], // ignore flow files for now
    react: {
      version: "detect",
    },
  },
};
