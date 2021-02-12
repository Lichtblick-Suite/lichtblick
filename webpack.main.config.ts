import path from 'path';
import type { Configuration } from 'webpack';

const config: Configuration = {
  context: path.resolve('./desktop'),
  entry: './index.ts',
  target: 'electron-main',

  output: {
    publicPath: '',
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
