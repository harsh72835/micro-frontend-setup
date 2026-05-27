const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: 'auto',
    clean: true,
  },
  resolve: { extensions: ['.js', '.vue'] },
  module: {
    rules: [
      { test: /\.vue$/, use: 'vue-loader' },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env'] },
        },
      },
      {
        // Vue SFC styles — scoped by vue-loader, no CSS Modules needed
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ModuleFederationPlugin({
      name: 'analytics',
      filename: 'remoteEntry.js',
      exposes: {
        // Exposes mount/unmount — not a React component.
        // Shell calls mount(el) to render Vue into a DOM node.
        './App': './src/bootstrap',
      },
      // Vue has zero overlap with React — no shared deps needed.
      shared: {},
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
  devServer: {
    port: 3002,
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    client: { overlay: false },
  },
};
