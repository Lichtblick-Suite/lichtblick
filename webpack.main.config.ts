import path from "path";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import type { Configuration, WebpackPluginInstance } from "webpack";

export default (_: never, argv: { mode?: string }): Configuration => {
  const isDev = argv.mode === "development";
  const plugins: WebpackPluginInstance[] = [];

  if (isDev) {
    plugins.push(new ForkTsCheckerWebpackPlugin());
  }

  return {
    context: path.resolve("./desktop"),
    entry: "./index.ts",
    target: "electron-main",

    output: {
      publicPath: "",
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
              transpileOnly: isDev,
              // https://github.com/TypeStrong/ts-loader#onlycompilebundledfiles
              // avoid looking at files which are not part of the bundle
              onlyCompileBundledFiles: true,
            },
          },
        },
      ],
    },

    plugins,

    resolve: {
      extensions: [".js", ".ts", ".tsx", ".json"],
    },
  };
};
