import { FlatConfig } from "eslint";

const config: FlatConfig[] = [
  {
    ignores: [
      "dist",
      "out",
      "template",
      "packages/**/wasm/*.js",
      "!.storybook",
      "storybook-static",
      "coverage",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        browser: true,
        es6: true,
        node: true,
      },
    },
    plugins: {
      "file-progress": require("eslint-plugin-file-progress"),
      "tss-unused-classes": require("eslint-plugin-tss-unused-classes"),
      "@lichtblick/suite": require("@lichtblick/eslint-plugin-suite"),
    },
    rules: {
      "@lichtblick/license-header": "error",
      "@lichtblick/prefer-hash-private": "error",
      "tss-unused-classes/unused-classes": "error",
      "file-progress/activate": "warn",
      "prettier/prettier": "off",
      "import/no-self-import": "off",
      "import/no-duplicates": "off",
      "id-denylist": ["error", "useEffectOnce", "window"],
      "no-console": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": [
        "error",
        { additionalHooks: "(useAsync(?!AppConfigurationValue))|useCallbackWithToast" },
      ],
      "react/jsx-curly-brace-presence": ["error", "never"],
      "react/forbid-component-props": [
        "error",
        {
          forbid: [
            {
              propName: "sx",
              message:
                "Use of the sx prop is not advised due to performance issues. Consider using alternative styling methods instead.",
            },
          ],
        },
      ],
      "no-warning-comments": ["error", { terms: ["fixme", "xxx", "todo"], location: "anywhere" }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@emotion/styled",
              importNames: ["styled"],
              message: "@emotion/styled has performance implications. Use tss-react/mui instead.",
            },
            {
              name: "@mui/material",
              importNames: ["styled"],
              message: "@mui/styled has performance implications. Use tss-react/mui instead.",
            },
            {
              name: "@mui/system",
              importNames: ["styled"],
              message: "@mui/styled has performance implications. Use tss-react/mui instead.",
            },
            {
              name: "@mui/material/styles/styled",
              message: "@mui/styled has performance implications. Use tss-react/mui instead.",
            },
            {
              name: "@mui/material",
              importNames: ["Box"],
              message: "@mui/Box has performance implications. Use tss-react/mui instead.",
            },
            {
              name: "@mui/system",
              importNames: ["Box"],
              message: "@mui/Box has performance implications. Use tss-react/mui instead.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MethodDefinition[kind='get'], Property[kind='get']",
          message: "Property getters are not allowed; prefer function syntax instead.",
        },
        {
          selector: "MethodDefinition[kind='set'], Property[kind='set']",
          message: "Property setters are not allowed; prefer function syntax instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name!=/^(warn|error|debug|assert)$/]",
          message: "Unexpected property on console object was called",
        },
        {
          selector: "TSNullKeyword, Literal[raw=null]",
          message:
            "Prefer undefined instead of null. When required for React refs/components, use the `ReactNull` alias. Otherwise, if strictly necessary, disable this error with `// eslint-disable-next-line no-restricted-syntax`.",
        },
        {
          selector: "CallExpression[callee.name='setTimeout'][arguments.length<2]",
          message: "`setTimeout()` must be invoked with at least two arguments.",
        },
        {
          selector: "CallExpression[callee.name='setInterval'][arguments.length<2]",
          message: "`setInterval()` must be invoked with at least two arguments.",
        },
        {
          selector: "CallExpression[callee.object.name='Promise'][callee.property.name='race']",
          message:
            'Promise.race is banned. Use `import { race } from "@lichtblick/den/async"` instead.',
        },
      ],
      "jest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect*", "sendNotification.expectCalledDuringTest"] },
      ],
    },
    settings: {
      "import/internal-regex": "^@lichtblick",
    },
  },
  {
    files: ["*.ts", "*.tsx"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.eslint.json" },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/explicit-member-accessibility": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],
      "no-loop-func": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          varsIgnorePattern: "^_.",
          argsIgnorePattern: "^_.",
        },
      ],
    },
  },
  {
    files: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.stories.tsx"],
    rules: {
      "react/forbid-component-props": "off",
    },
  },
];

export default config;
