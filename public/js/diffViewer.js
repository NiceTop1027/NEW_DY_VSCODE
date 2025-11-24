// public/js/diffViewer.js
// Git diff visualization with diff2html

import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

class DiffViewer {
  constructor() {
    this.outputFormat = 'side-by-side'; // or 'line-by-line'
  }

  // Generate diff HTML
  generateDiff(oldContent, newContent, fileName = 'file') {
    // Create unified diff format
    const diff = this.createUnifiedDiff(oldContent, newContent, fileName);
        
    // Generate HTML
    const diffHtml = html(diff, {
      drawFileList: true,
      matching: 'lines',
      outputFormat: this.outputFormat,
      renderNothingWhenEmpty: false
    });

    return diffHtml;
  }

  // Create unified diff format
  createUnifiedDiff(oldContent, newContent, fileName) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
        
    let diff = `diff --git a/${fileName} b/${fileName}\n`;
    diff += `--- a/${fileName}\n`;
    diff += `+++ b/${fileName}\n`;
    diff += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
        
    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
        
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
            
      if (oldLine === newLine) {
        diff += ` ${oldLine || ''}\n`;
      } else {
        if (oldLine !== undefined) {
          diff += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      }
    }
        
    return diff;
  }

  // Show diff in modal
  showDiffModal(oldContent, newContent, fileName) {
    const diffHtml = this.generateDiff(oldContent, newContent, fileName);
        
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; width: 1200px; max-height: 90vh; overflow: auto;">
                <div class="modal-header">
                    <h2>📊 변경사항 비교: ${fileName}</h2>
                    <button class="modal-close" id="diff-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${diffHtml}
                </div>
                <div style="padding: 15px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color);">
                    <button id="diff-toggle-view" class="btn-secondary">보기 전환</button>
                    <button id="diff-close-btn" class="btn-primary">닫기</button>
                </div>
            </div>
        `;
        
    document.body.appendChild(modal);
        
    // Event listeners
    document.getElementById('diff-modal-close').addEventListener('click', () => {
      modal.remove();
    });
        
    document.getElementById('diff-close-btn').addEventListener('click', () => {
      modal.remove();
    });
        
    document.getElementById('diff-toggle-view').addEventListener('click', () => {
      this.outputFormat = this.outputFormat === 'side-by-side' ? 'line-by-line' : 'side-by-side';
      const newDiffHtml = this.generateDiff(oldContent, newContent, fileName);
      modal.querySelector('.modal-body').innerHTML = newDiffHtml;
    });
        
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Compare two files
  compareFiles(file1Content, file2Content, file1Name, file2Name) {
    return this.showDiffModal(file1Content, file2Content, `${file1Name} ↔ ${file2Name}`);
  }

  // Get diff stats
  getDiffStats(oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
        
    let additions = 0;
    let deletions = 0;
    let changes = 0;
        
    const maxLines = Math.max(oldLines.length, newLines.length);
        
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
            
      if (oldLine === undefined) {
        additions++;
      } else if (newLine === undefined) {
        deletions++;
      } else if (oldLine !== newLine) {
        changes++;
      }
    }
        
    return { additions, deletions, changes };
  }
}

export const diffViewer = new DiffViewer();
export default diffViewer;
