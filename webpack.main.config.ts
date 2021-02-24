import path from "path";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import webpack, { Configuration, ResolveOptions } from "webpack";

export default (_: never, argv: { mode?: string }): Configuration => {
  const isDev = argv.mode === "development";

  const resolve: ResolveOptions = {
    extensions: [".js", ".ts", ".tsx", ".json"],
  };

  if (!isDev) {
    // Stub out devtools installation for non-dev builds
    resolve.alias = {
      "electron-devtools-installer": false,
    };
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
              transpileOnly: true,
              // https://github.com/TypeStrong/ts-loader#onlycompilebundledfiles
              // avoid looking at files which are not part of the bundle
              onlyCompileBundledFiles: true,
              compilerOptions: {
                module: "es2020",
              },
            },
          },
        },
        {
          test: /\.s?css$/,
          loader: "css-loader",
          options: { modules: { exportOnlyLocals: true } },
        },
        { test: /\.scss$/, loader: "sass-loader" },
      ],
    },

    plugins: [
      new webpack.DefinePlugin({
        // Should match webpack-defines.d.ts
        APP_NAME: JSON.stringify("Foxglove Studio"),
      }),
      new ForkTsCheckerWebpackPlugin(),
    ],

    resolve,
  };
};
