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
    fallback: {
      'fs': false,
      'path': false,
      'crypto': false,
      'stream': false,
      'buffer': require.resolve('buffer/'),
      'process': require.resolve('process/browser.js')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
    new MonacoWebpackPlugin({
      languages: [
        'javascript', 'typescript', 'html', 'css', 'json', 'python', 'markdown',
        'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'rust', 'swift',
        'kotlin', 'scala', 'r', 'sql', 'shell', 'powershell', 'yaml', 'xml',
        'dockerfile', 'plaintext'
      ],
      features: [
        'bracketMatching',
        'caretOperations',
        'clipboard',
        'codeAction',
        'codelens',
        'colorPicker',
        'comment',
        'contextmenu',
        'coreCommands',
        'cursorUndo',
        'dnd',
        'find',
        'folding',
        'fontZoom',
        'format',
        'gotoError',
        'gotoLine',
        'gotoSymbol',
        'hover',
        'iPadShowKeyboard',
        'inPlaceReplace',
        'indentation',
        'inlineHints',
        'inspectTokens',
        'linesOperations',
        'linkedEditing',
        'links',
        'multicursor',
        'parameterHints',
        'quickCommand',
        'quickHelp',
        'quickOutline',
        'referenceSearch',
        'rename',
        'smartSelect',
        'snippets',
        'suggest',
        'toggleHighContrast',
        'toggleTabFocusMode',
        'transpose',
        'unusualLineTerminators',
        'viewportSemanticTokens',
        'wordHighlighter',
        'wordOperations',
        'wordPartOperations'
      ]
    }),
    // Remove the old IgnorePlugin
    // new webpack.IgnorePlugin({
    //   resourceRegExp: /^(vs\/language\/json\/jsonWorker|vs\/language\/css\/cssWorker|vs\/language\/html\/htmlWorker|vs\/language\/typescript\/tsWorker|vs\/editor\/editor.worker)$/,
    //   contextRegExp: /monaco-editor/,
    // }),
  ],
};
