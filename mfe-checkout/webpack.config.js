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
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        // Shell imports this path to mount the Checkout app.
        './App': './src/App',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18' },
        'react-dom': { singleton: true, requiredVersion: '^18' },
      },
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
  devServer: {
    port: 3001,
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    // Disable overlay — when loaded by shell (cross-origin), the overlay
    // script throws "Script error." due to browser same-origin policy.
    client: { overlay: false },
  },
};
