// __mocks__/monaco-editor.js
const mockMonacoEditorInstance = {
  setValue: jest.fn(),
  getModel: jest.fn(() => ({})),
  addCommand: jest.fn(),
  layout: jest.fn(),
};

const monaco = {
  editor: {
    create: jest.fn(() => mockMonacoEditorInstance),
    setModelLanguage: jest.fn(),
  },
  KeyMod: { CtrlCmd: 1, KeyCode: { KeyS: 2 } },
};

module.exports = monaco;
