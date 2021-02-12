import path from 'path';
import type { Configuration } from 'webpack';

const config: Configuration = {
  context: path.resolve('./app'),
  entry: './preload.ts',
  target: 'electron-preload',

  output: {
    publicPath: '',
    filename: 'preload.js',
    // Put the preload script in main since main becomes the "app path"
    // This simplifies setting the 'preload' webPrefereces option on BrowserWindow
    path: path.resolve(__dirname, '.webpack', 'main'),
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.json'],
  },
};

export default config;
