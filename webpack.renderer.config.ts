import path from 'path';
import retext from 'retext';
import rehypePrism from '@mapbox/rehype-prism';
import retextSmartypants from 'retext-smartypants';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import webpack, { Configuration } from 'webpack';

declare const visit: any;

// Enable smart quotes:
// https://github.com/mdx-js/mdx/blob/ad58be384c07672dc415b3d9d9f45dcebbfd2eb8/docs/advanced/retext-plugins.md
const smartypantsProcessor = retext().use(retextSmartypants);
function remarkSmartypants() {
  function transformer(tree: unknown) {
    visit(tree, 'text', (node: { value: string }) => {
      node.value = String(smartypantsProcessor.processSync(node.value));
    });
  }
  return transformer;
}

const config: Configuration = {
  // force web target instead of electron-render
  // Fixes "require is not defined" errors if nodeIntegration is off
  // https://gist.github.com/msafi/d1b8571aa921feaaa0f893ab24bb727b
  target: 'web',
  entry: './app/index.js',

  output: {
    publicPath: '',
    path: path.resolve(__dirname, '.webpack', 'renderer'),
  },

  resolve: {
    // This prevents looking
    // prevents resolution of packages installed under shell/node_modules  -> yes
    //modules: [path.resolve(`${__dirname}/app/node_modules`), "./node_modules"],
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      'react-dnd': require.resolve('react-dnd', {
        paths: [path.resolve(`${__dirname}/app/node_modules`)],
      }),
      'styled-components': require.resolve('styled-components', {
        paths: [path.resolve(`${__dirname}/app/node_modules`)],
      }),
      'webviz-core/src': path.resolve(`${__dirname}/app`),
      'webviz-core/shared': path.resolve(`${__dirname}/app/shared`),
      'webviz-core/migrations': path.resolve(`${__dirname}/app/migrations`),
    },
    fallback: {
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      zlib: require.resolve('browserify-zlib'),
      crypto: require.resolve('crypto-browserify'),
      fs: false,
      pnpapi: false,
      // These are optional for react-mosaic-component
      '@blueprintjs/core': false,
      '@blueprintjs/icons': false,
    },
  },
  module: {
    rules: [
      // Add support for native node modules
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|players\/UserNodePlayer\/nodeTransformerWorker\/typescript\/)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.wasm$/,
        // Bypass webpack's default importing logic for .wasm files.
        // https://webpack.js.org/configuration/module/#ruletype
        type: 'javascript/auto',
        use: {
          loader: 'file-loader',
          options: {
            name: '[name]-[hash].[ext]',
          },
        },
      },
      {
        test: /\.worker\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: '[name].[ext]?[hash]',
            /* action item to remove this and move workers to esmodule style */
            esModule: false,
          },
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader?cacheDirectory' },
      },
      {
        test: /\.mdx$/,
        use: [
          'babel-loader?cacheDirectory',
          {
            loader: '@mdx-js/loader',
            options: {
              hastPlugins: [rehypePrism],
              mdPlugins: [remarkSmartypants],
            },
          },
        ],
      },
      {
        // We use stringified Typescript in Node Playground.
        // eslint-disable-next-line no-useless-escape
        test: /players\/UserNodePlayer\/nodeTransformerWorker\/typescript\/.+\.ts$/,
        exclude: /node_modules/,
        use: { loader: 'raw-loader' },
      },
      { test: /\.md$/, loader: 'raw-loader' },
      {
        test: /\.svg$/,
        loader: 'react-svg-loader',
        options: {
          svgo: {
            plugins: [{ removeViewBox: false }, { removeDimensions: false }],
          },
        },
      },
      { test: /\.ne$/, loader: 'nearley-loader' },
      {
        test: /\.(png|jpg|gif)$/i,
        use: [{ loader: 'url-loader', options: { limit: 8192 } }],
      },
      {
        test: /\.s?css$/,
        loader: 'style-loader',
      },
      {
        test: /\.s?css$/,
        oneOf: [
          {
            test: /\.module\./,
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]-[sha512:hash:base32:5]--[local]',
              },
              sourceMap: true,
            },
          },
          { loader: 'css-loader', options: { sourceMap: true } },
        ],
      },
      { test: /\.scss$/, loader: 'sass-loader', options: { sourceMap: true } },
      { test: /\.woff2?$/, loader: 'url-loader' },
      { test: /\.(glb|bag|ttf|bin)$/, loader: 'file-loader' },
      {
        test: /node_modules\/compressjs\/.*\.js/,
        loader: 'string-replace-loader',
        options: {
          search: "if (typeof define !== 'function') { var define = require('amdefine')(module); }",
          replace:
            '/* webviz: removed broken amdefine shim (https://github.com/webpack/webpack/issues/5316) */',
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
      Buffer: 'buffer',
      process: 'process/browser',
    }),
    new ForkTsCheckerWebpackPlugin(),
    new webpack.DefinePlugin({
      RAVEN_URL: JSON.stringify(undefined),
      GIT_INFO: JSON.stringify({ hash: '', dirty: false }),
      CURRENT_VERSION: JSON.stringify(''),
      MINIMUM_CHROME_VERSION: JSON.stringify(parseInt(process.env.MINIMUM_CHROME_VERSION ?? '68')),
    }),
    new CaseSensitivePathsPlugin(),
    // https://webpack.js.org/plugins/ignore-plugin/#example-of-ignoring-moment-locales
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new MonacoWebpackPlugin({
      // available options: https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ['typescript', 'javascript'],
    }),
  ],
  node: {
    __dirname: true,
    __filename: true,
  },
};

export default config;
