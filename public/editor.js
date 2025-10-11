// public/js/editor.js
import * as monaco from 'monaco-editor';
import { saveFile } from './api.js';
import { getLanguageIdFromFilePath } from './utils.js';
import { openFiles } from './ui.js';

let editor = null;
let tabsContainer = null;

export function initEditor(editorEl, tabsEl, openFilesMap) {
    tabsContainer = tabsEl;

    editor = monaco.editor.create(editorEl, {
        value: '// Welcome to VS Code Clone!\n// Click a file in the explorer to open it.',
        language: 'javascript',
        theme: 'vs-dark'
    });

    window.addEventListener('resize', () => editor.layout());

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const activeFilePath = tabsContainer.querySelector('.tab.active')?.dataset.filePath;
        if (activeFilePath && editor) {
            saveFile(activeFilePath, editor.getValue())
                .then(data => {
                    if (data.success) console.log('File saved:', data.message);
                    else console.error('Save failed:', data.error);
                })
                .catch(err => console.error('Error saving file:', err));
        }
    });

    editor.onDidChangeModelContent(() => {
        const activeFilePath = tabsContainer.querySelector('.tab.active')?.dataset.filePath;
        if (activeFilePath && openFilesMap.has(activeFilePath)) {
            openFilesMap.get(activeFilePath).content = editor.getValue();
            // TODO: Add dirty indicator to tab
        }
    });
}

export function setEditorContent(content, filePath) {
    if (editor) {
        editor.setValue(content);
        const language = getLanguageIdFromFilePath(filePath);
        monaco.editor.setModelLanguage(editor.getModel(), language);
    }
}

export function getEditorContent() {
    return editor ? editor.getValue() : '';
}

export function clearEditorContent() {
    if (editor) editor.setValue('');
}