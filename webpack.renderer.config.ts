// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import path from "path";
import retext from "retext";
import rehypePrism from "@mapbox/rehype-prism";
import retextSmartypants from "retext-smartypants";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack, { Configuration } from "webpack";

import { WebpackArgv } from "./WebpackArgv";

declare const visit: any;

// Enable smart quotes:
// https://github.com/mdx-js/mdx/blob/ad58be384c07672dc415b3d9d9f45dcebbfd2eb8/docs/advanced/retext-plugins.md
const smartypantsProcessor = retext().use(retextSmartypants);
function remarkSmartypants() {
  function transformer(tree: unknown) {
    visit(tree, "text", (node: { value: string }) => {
      node.value = String(smartypantsProcessor.processSync(node.value));
    });
  }
  return transformer;
}

export default (_: never, argv: WebpackArgv): Configuration => {
  const isDev = argv.mode === "development";
  const isServe = argv.env?.WEBPACK_SERVE ?? false;

  return {
    // force web target instead of electron-render
    // Fixes "require is not defined" errors if nodeIntegration is off
    // https://gist.github.com/msafi/d1b8571aa921feaaa0f893ab24bb727b
    target: "web",
    context: path.resolve("./app"),
    entry: "./index.tsx",
    devtool: isDev ? "eval-cheap-source-map" : "source-map",

    optimization: {
      minimize: false,
    },

    output: {
      publicPath: isServe ? "/renderer" : "",
      path: path.resolve(__dirname, ".webpack", "renderer"),
    },

    resolve: {
      extensions: [".js", ".ts", ".jsx", ".tsx"],
      alias: {
        "react-dnd": require.resolve("react-dnd"),
        "styled-components": require.resolve("styled-components"),
      },
      fallback: {
        path: require.resolve("path-browserify"),
        stream: require.resolve("stream-browserify"),
        zlib: require.resolve("browserify-zlib"),
        crypto: require.resolve("crypto-browserify"),
        fs: false,
        pnpapi: false,
        // These are optional for react-mosaic-component
        "@blueprintjs/core": false,
        "@blueprintjs/icons": false,
      },
    },
    module: {
      rules: [
        // Add support for native node modules
        {
          test: /\.node$/,
          use: "node-loader",
        },
        {
          test: /\.wasm$/,
          type: "asset/resource",
        },
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
        {
          test: /\.mdx$/,
          use: {
            loader: "@mdx-js/loader",
            options: {
              hastPlugins: [rehypePrism],
              mdPlugins: [remarkSmartypants],
            },
          },
        },
        {
          // We use stringified Typescript in Node Playground.
          test: /players\/UserNodePlayer\/nodeTransformerWorker\/typescript\/.+\.template$/,
          exclude: /node_modules/,
          type: "asset/source",
        },
        { test: /\.md$/, type: "asset/source" },
        {
          test: /\.svg$/,
          loader: "react-svg-loader",
          options: {
            svgo: {
              plugins: [{ removeViewBox: false }, { removeDimensions: false }],
            },
          },
        },
        { test: /\.ne$/, loader: "nearley-loader" },
        {
          test: /\.(png|jpg|gif)$/i,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8kb
            },
          },
        },
        {
          test: /\.s?css$/,
          loader: "style-loader",
          sideEffects: true,
        },
        {
          test: /\.s?css$/,
          oneOf: [
            {
              test: /\.module\./,
              loader: "css-loader",
              options: {
                modules: {
                  localIdentName: "[path][name]-[sha512:hash:base32:5]--[local]",
                },
                sourceMap: true,
              },
            },
            { loader: "css-loader", options: { sourceMap: true } },
          ],
        },
        { test: /\.scss$/, loader: "sass-loader", options: { sourceMap: true } },
        { test: /\.woff2?$/, type: "asset/inline" },
        { test: /\.(glb|bag|ttf|bin)$/, type: "asset/resource" },
        {
          test: /node_modules\/compressjs\/.*\.js/,
          loader: "string-replace-loader",
          options: {
            search:
              "if (typeof define !== 'function') { var define = require('amdefine')(module); }",
            replace:
              "/* webviz: removed broken amdefine shim (https://github.com/webpack/webpack/issues/5316) */",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        templateContent: `
          <html>
            <script>global = globalThis;</script>
            <body>
              <div id="root"></div>
            </body>
          </html>
        `,
      }),
      new webpack.ProvidePlugin({
        // since we avoid "import React from 'react'" we shim here when used globally
        React: "react",
        // the buffer module exposes the Buffer class as a property
        Buffer: ["buffer", "Buffer"],
        process: "process/browser",
      }),
      new webpack.DefinePlugin({
        // Should match webpack-defines.d.ts
        APP_NAME: JSON.stringify("Foxglove Studio"),
      }),
      // https://webpack.js.org/plugins/ignore-plugin/#example-of-ignoring-moment-locales
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      new ForkTsCheckerWebpackPlugin(),
    ],
    node: {
      __dirname: true,
      __filename: true,
    },
  };
};
