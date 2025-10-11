const path = require('path');
const webpack = require('webpack');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin'); // Import the plugin

module.exports = {
  mode: 'production',
  entry: './public/js/ui.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public/dist'),
    publicPath: '/dist/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
    // alias: { // Remove alias for 'vs' as plugin handles it
    //   'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs'
    // }
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'html', 'css', 'json', 'python', 'markdown'] // Specify languages to include
    }),
    // Remove the old IgnorePlugin
    // new webpack.IgnorePlugin({
    //   resourceRegExp: /^(vs\/language\/json\/jsonWorker|vs\/language\/css\/cssWorker|vs\/language\/html\/htmlWorker|vs\/language\/typescript\/tsWorker|vs\/editor\/editor.worker)$/,
    //   contextRegExp: /monaco-editor/,
    // }),
  ],
};
