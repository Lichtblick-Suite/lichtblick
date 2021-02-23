import path from "path";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import type { Configuration } from "webpack";

export default (_: never, argv: { mode?: string }): Configuration => {
  return {
    context: path.resolve("./app"),
    entry: "./preload.ts",
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
              configFile: "tsconfig.preload.json",
              // https://github.com/TypeStrong/ts-loader#onlycompilebundledfiles
              // avoid looking at files which are not part of the bundle
              onlyCompileBundledFiles: true,
            },
          },
        },
      ],
    },

    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configFile: "tsconfig.preload.json",
        },
      }),
    ],

    resolve: {
      extensions: [".js", ".ts", ".tsx", ".json"],
    },
  };
};
