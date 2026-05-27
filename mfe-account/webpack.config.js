const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');

module.exports = {
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
        test: /\.module\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { modules: true } }],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'account',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/mount',
      },
      shared: {
        // requiredVersion '^17' is incompatible with shell's '^18'.
        // Module Federation falls back to bundling React 17 inside this MFE.
        // Two React instances coexist — no prototype chain collision because
        // each lives in its own __webpack_require__ registry.
        react: { singleton: false, requiredVersion: '^17' },
        'react-dom': { singleton: false, requiredVersion: '^17' },
      },
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
  devServer: {
    port: 3003,
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    client: { overlay: false },
  },
};
