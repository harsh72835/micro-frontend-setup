const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  // In prod, manifest URL comes from environment. Locally, shell reads the
  // static file. Remote URLs are injected at runtime via loadManifest().
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      publicPath: 'auto',
      clean: true,
    },
    resolve: { extensions: ['.js', '.jsx'] },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader?modules'],
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name: 'shell',
        // Shell is the host — it consumes remotes but exposes nothing.
        // Remote URLs are set dynamically at runtime; placeholders here.
        remotes: {},
        shared: {
          react: { singleton: true, requiredVersion: '^18', eager: true },
          'react-dom': { singleton: true, requiredVersion: '^18', eager: true },
          'react-router-dom': { singleton: true, requiredVersion: '^6', eager: true },
        },
      }),
      new webpack.DefinePlugin({
        'process.env.MANIFEST_URL': JSON.stringify(
          process.env.MANIFEST_URL || '/remoteEntry.json'
        ),
      }),
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public/remoteEntry.json', to: 'remoteEntry.json' },
          { from: 'public/manifest-history.json', to: 'manifest-history.json', noErrorOnMissing: true },
          { from: 'public/vercel.json', to: 'vercel.json' },
        ],
      }),
    ],
    devServer: {
      port: 3000,
      historyApiFallback: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  };
};
