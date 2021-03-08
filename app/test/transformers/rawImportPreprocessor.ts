// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type { CacheKeyOptions, TransformOptions } from "@jest/transform";
import type { Config } from "@jest/types";
import fs from "fs";
import { createTransformer } from "ts-jest";

const transformer = createTransformer();

// look for `?raw` import statements
// re-write these into `const variable = "string source";`;
const importRegEx = /^import (.*) from "(.*)\?raw";$/gm;
const importReplacer = (_: unknown, p1: string, p2: string) => {
  const resolved = require.resolve(p2);
  const rawFile = fs.readFileSync(resolved, { encoding: "utf-8" });
  return `const ${p1} = ${JSON.stringify(rawFile.toString())};`;
};

function rewriteSource(source: string) {
  return source.replace(importRegEx, importReplacer);
}

module.exports = {
  process(
    source: string,
    filePath: string,
    config: Config.ProjectConfig,
    options?: TransformOptions,
  ) {
    return transformer.process(rewriteSource(source), filePath, config, options);
  },
  getCacheKey(source: string, filePath: string, config: string, options: CacheKeyOptions) {
    return transformer.getCacheKey(rewriteSource(source), filePath, config, options);
  },
};
