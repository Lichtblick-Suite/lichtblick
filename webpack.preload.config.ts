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
              transpileOnly: isDev,
              configFile: "tsconfig.preload.json",
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
