// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import path from "path";
import webpack from "webpack";

import webpackConfigDesktop from "./desktop/webpack.config";
import webpackConfigWeb from "./web/webpack.config";

if (process.env.TARGET !== "desktop" && process.env.TARGET !== "web") {
  throw new Error("TARGET env variable must be either 'desktop' or 'web'");
}

const target = process.env.TARGET;
const appPath = path.join(__dirname, target, ".webpack");
export { appPath };

// global jest test setup builds the webpack build before running any integration tests
export default async (): Promise<void> => {
  if ((process.env.INTEGRATION_SKIP_BUILD ?? "") !== "") {
    return;
  }

  const webpackConfig = target === "desktop" ? webpackConfigDesktop : webpackConfigWeb;

  const compiler = webpack(
    webpackConfig.map((config) => {
      if (typeof config === "function") {
        return config(undefined, { mode: "production" });
      }

      return config;
    }),
  );

  await new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line no-restricted-syntax
    console.info(`\nBuilding Webpack (${target}). To skip, set INTEGRATION_SKIP_BUILD=1`);
    compiler.run((err, result) => {
      compiler.close(() => {});
      if (err) {
        reject(err);
        return;
      }
      if (!result || result.hasErrors()) {
        console.error(result?.toString());
        reject(new Error("webpack build failed"));
        return;
      }
      // eslint-disable-next-line no-restricted-syntax
      console.info("Webpack build complete");
      resolve();
    });
  });
};
