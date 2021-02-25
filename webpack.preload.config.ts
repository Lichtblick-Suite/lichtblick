import path from "path";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import type { Configuration } from "webpack";

import { WebpackArgv } from "./WebpackArgv";

export default (_: never, argv: WebpackArgv): Configuration => {
  return {
    context: path.resolve("./preload"),
    entry: "./index.ts",
    target: "electron-preload",

    output: {
      publicPath: "",
      filename: "preload.js",
      // Put the preload script in main since main becomes the "app path"
      // This simplifies setting the 'preload' webPrefereces option on BrowserWindow
      path: path.resolve(__dirname, ".webpack", "main"),
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              // https://github.com/TypeStrong/ts-loader#onlycompilebundledfiles
              // avoid looking at files which are not part of the bundle
              onlyCompileBundledFiles: true,
            },
          },
        },
      ],
    },

    plugins: [new ForkTsCheckerWebpackPlugin()],

    resolve: {
      extensions: [".js", ".ts", ".tsx", ".json"],
    },
  };
};
