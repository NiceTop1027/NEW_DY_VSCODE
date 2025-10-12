const EditorCore = require('../../src/editor/editorCore.js');
const UIManager = require('../../src/ui/uiManager.js');
const File = require('../../src/models/file.js');
const Project = require('../../src/models/project.js');

import { openFile } from '../../public/ui.js'; // 새 ui 모듈에서 openFile 가져오기

// Jest 환경에서 DOM 사용을 위해 jsdom이 필요
import { JSDOM } from 'jsdom';

describe('User Story 1: Basic Editing and File Management', () => {
    let dom;
    let container;
    let mockSetModelLanguage;

    beforeEach(() => {
        // jsdom 환경 초기화
        dom = new JSDOM(`<!DOCTYPE html><body><div id="editor"></div></body>`, { url: 'http://localhost' });
        global.document = dom.window.document;
        global.window = dom.window;
        // Ensure TextEncoder/Decoder are available in the JSDOM window
        global.window.TextEncoder = TextEncoder;
        global.window.TextDecoder = TextDecoder;

        container = document.getElementById('editor');

        // Monaco Editor 모킹
        mockSetModelLanguage = jest.fn();
        global.monaco = {
            editor: {
                create: jest.fn().mockReturnValue({
                    setValue: jest.fn(),
                    getValue: jest.fn().mockReturnValue('// test content'),
                    layout: jest.fn()
                }),
                setModelLanguage: mockSetModelLanguage
            },
            KeyMod: { CtrlCmd: 1 },
            KeyCode: { KeyS: 1 }
        };
    });

    afterEach(() => {
        jest.resetAllMocks();
        delete global.window;
        delete global.document;
        delete global.monaco;
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
