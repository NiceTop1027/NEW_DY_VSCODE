// public/js/markdownPreview.js
// Markdown preview with marked and highlight.js

import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

class MarkdownPreview {
    constructor() {
        // Configure marked
        marked.setOptions({
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {
                        console.error('Highlight error:', err);
                    }
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });
    }

    // Render markdown to HTML
    render(markdown) {
        try {
            return marked.parse(markdown);
        } catch (error) {
            console.error('Markdown render error:', error);
            return `<p style="color: red;">마크다운 렌더링 실패: ${error.message}</p>`;
        }
    }

    // Show preview in split view
    showPreview(markdown, container) {
        const html = this.render(markdown);
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'markdown-preview';
            container.style.cssText = `
                padding: 20px;
                background: var(--editor-background);
                color: var(--text-color);
                overflow-y: auto;
                height: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
                line-height: 1.6;
            `;
        }
        
        container.innerHTML = this.wrapWithStyles(html);
        return container;
    }

    // Wrap HTML with custom styles
    wrapWithStyles(html) {
        return `
            <style>
                .markdown-preview h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
                .markdown-preview h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
                .markdown-preview h3 { font-size: 1.25em; }
                .markdown-preview code { background: rgba(110, 118, 129, 0.4); padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
                .markdown-preview pre { background: rgba(110, 118, 129, 0.4); padding: 16px; border-radius: 6px; overflow-x: auto; }
                .markdown-preview pre code { background: none; padding: 0; }
                .markdown-preview blockquote { border-left: 4px solid var(--border-color); padding-left: 1em; color: var(--text-color-light); margin: 0; }
                .markdown-preview table { border-collapse: collapse; width: 100%; }
                .markdown-preview table th, .markdown-preview table td { border: 1px solid var(--border-color); padding: 8px 12px; }
                .markdown-preview table th { background: var(--hover-background); }
                .markdown-preview img { max-width: 100%; }
                .markdown-preview a { color: #58a6ff; text-decoration: none; }
                .markdown-preview a:hover { text-decoration: underline; }
                .markdown-preview ul, .markdown-preview ol { padding-left: 2em; }
                .markdown-preview li { margin: 0.25em 0; }
                .markdown-preview hr { border: 0; border-top: 1px solid var(--border-color); margin: 1.5em 0; }
            </style>
            <div class="markdown-content">
                ${html}
            </div>
        `;
    }

    // Generate table of contents
    generateTOC(markdown) {
        const tokens = marked.lexer(markdown);
        const toc = [];
        
        tokens.forEach(token => {
            if (token.type === 'heading' && token.depth <= 3) {
                toc.push({
                    level: token.depth,
                    text: token.text,
                    id: token.text.toLowerCase().replace(/[^\w]+/g, '-')
                });
            }
        });
        
        return toc;
    }

    // Show preview modal
    showPreviewModal(markdown, fileName = 'Preview') {
        const html = this.render(markdown);
        const toc = this.generateTOC(markdown);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; width: 1000px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h2>📄 ${fileName}</h2>
                    <button class="modal-close" id="md-modal-close">&times;</button>
                </div>
                <div style="display: flex; flex: 1; overflow: hidden;">
                    ${toc.length > 0 ? `
                        <div style="width: 200px; border-right: 1px solid var(--border-color); overflow-y: auto; padding: 15px;">
                            <h3 style="margin-top: 0; font-size: 14px;">목차</h3>
                            <ul style="list-style: none; padding: 0;">
                                ${toc.map(item => `
                                    <li style="padding-left: ${(item.level - 1) * 15}px; margin: 5px 0;">
                                        <a href="#${item.id}" style="color: var(--text-color); text-decoration: none; font-size: 13px;">
                                            ${item.text}
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div style="flex: 1; overflow-y: auto; padding: 20px;">
                        ${this.wrapWithStyles(html)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('md-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Export as HTML
    exportHTML(markdown, title = 'Document') {
        const html = this.render(markdown);
        
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #24292f;
            background: #ffffff;
        }
        ${this.getExportStyles()}
    </style>
</head>
<body>
    ${html}
</body>
</html>
        `;
    }

    getExportStyles() {
        return `
            h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
            h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
            code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
            pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
            pre code { background: none; padding: 0; }
            blockquote { border-left: 4px solid #d0d7de; padding-left: 1em; color: #57606a; }
            table { border-collapse: collapse; width: 100%; }
            table th, table td { border: 1px solid #d0d7de; padding: 8px 12px; }
            table th { background: #f6f8fa; }
            img { max-width: 100%; }
            a { color: #0969da; text-decoration: none; }
            a:hover { text-decoration: underline; }
        `;
    }
}

export const markdownPreview = new MarkdownPreview();
export default markdownPreview;
