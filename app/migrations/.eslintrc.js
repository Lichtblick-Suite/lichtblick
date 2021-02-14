//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.
const fs = require("fs");
const path = require("path");

const getRestrictedDirs = (source) =>
  fs
    .readdirSync(source)
    .map((name) => path.join(source, name))
    .filter((eachSource) => fs.lstatSync(eachSource).isDirectory())
    .filter((dirPath) => !dirPath.endsWith(`app/migrations`))
    .map((eachPath) => `webviz-core/${eachPath.split("app/")[1]}`);

const restrictedDirs = getRestrictedDirs(path.join(__dirname, "../"));
const getSubDirs = (arr) => arr.map((eachPath) => `${eachPath}/*`);

module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        // migrations/ directory can import from within itself, but not from outside directories
        patterns: [...restrictedDirs, ...getSubDirs(restrictedDirs)],
      },
    ],
    "no-restricted-modules": [
      "error",
      {
        // migrations/ directory can import from within itself, but not from outside directories
        patterns: [...restrictedDirs, ...getSubDirs(restrictedDirs)],
      },
    ],
  },
  overrides: [{ files: ["*.test.js"], rules: { "no-restricted-imports": 0 } }],
};
