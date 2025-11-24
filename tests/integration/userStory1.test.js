import { jest } from '@jest/globals';
import * as monaco from 'monaco-editor';
import { initEditor } from '../../public/js/editor.js';
import { openFile } from '../../public/ui.js';
import EditorCore from '../../src/editor/editorCore.js';
import UIManager from '../../src/ui/uiManager.js';
import File from '../../src/models/file.js';
import Project from '../../src/models/project.js';

// Mock api.js
jest.mock('../../public/js/api.js', () => ({
  fetchFileContent: jest.fn().mockResolvedValue({ content: 'print("hello")' }),
  fetchFileTree: jest.fn().mockResolvedValue([]),
  uploadFile: jest.fn()
}));

// Mock monaco-editor module
jest.mock('monaco-editor', () => ({
  editor: {
    create: jest.fn(() => ({
      setValue: jest.fn(),
      getValue: jest.fn().mockReturnValue('// test content'),
      layout: jest.fn(),
      getModel: jest.fn().mockReturnValue({
        getLanguageId: jest.fn().mockReturnValue('javascript'),
        getValueInRange: jest.fn(),
        getValue: jest.fn()
      }),
      updateOptions: jest.fn(),
      onMouseDown: jest.fn(),
      addAction: jest.fn(),
      addCommand: jest.fn(),
      onDidChangeModelContent: jest.fn(),
      onDidChangeCursorPosition: jest.fn(),
      getAction: jest.fn()
    })),
    setModelLanguage: jest.fn(),
    setTheme: jest.fn(),
    createModel: jest.fn(),
    createDiffEditor: jest.fn()
  },
  languages: {
    typescript: {
      javascriptDefaults: {
        setDiagnosticsOptions: jest.fn(),
        setCompilerOptions: jest.fn(),
        addExtraLib: jest.fn(),
        setEagerModelSync: jest.fn()
      },
      typescriptDefaults: {
        setDiagnosticsOptions: jest.fn(),
        setCompilerOptions: jest.fn(),
        addExtraLib: jest.fn(),
        setEagerModelSync: jest.fn()
      },
      ScriptTarget: { ES2020: 7 },
      ModuleResolutionKind: { NodeJs: 2 },
      ModuleKind: { ESNext: 99 },
      JsxEmit: { React: 2 }
    },
    html: {
      htmlDefaults: {
        setOptions: jest.fn()
      }
    },
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: jest.fn()
      }
    },
    css: {
      cssDefaults: {
        setOptions: jest.fn()
      }
    },
    register: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    setLanguageConfiguration: jest.fn(),
    registerCompletionItemProvider: jest.fn(),
    registerHoverProvider: jest.fn(),
    registerDefinitionProvider: jest.fn(),
    registerReferenceProvider: jest.fn(),
    registerDocumentSymbolProvider: jest.fn(),
    registerCodeActionProvider: jest.fn(),
    registerRenameProvider: jest.fn(),
    registerFormattingEditProvider: jest.fn()
  },
  KeyMod: { CtrlCmd: 1, Shift: 2, Alt: 4 },
  KeyCode: { KeyS: 1, KeyF: 2, KeyP: 3, Period: 4, F2: 5, F12: 6, KeyE: 7, KeyG: 8, KeyC: 9 },
  Range: jest.fn(),
  MouseTargetType: { GUTTER_GLYPH_MARGIN: 1 }
}));

describe('User Story 1: Basic Editing and File Management', () => {
  let container;
  let mockSetModelLanguage;

  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = '<div id="editor"></div><div id="tabs"></div>';
    container = document.getElementById('editor');
    const tabsContainer = document.getElementById('tabs');

    // Setup mocks
    mockSetModelLanguage = monaco.editor.setModelLanguage;
    mockSetModelLanguage.mockClear();

    // Initialize editor
    initEditor(container, tabsContainer, new Map());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should set editor language based on file type when opening a file', async () => {
    const filePath = 'test.py';
    const fileName = 'test.py';

    // openFile 호출
    await openFile(filePath, fileName);

    // 모킹된 setModelLanguage가 python으로 호출되었는지 확인
    expect(mockSetModelLanguage).toHaveBeenCalledWith(expect.any(Object), 'python');
  });
});
