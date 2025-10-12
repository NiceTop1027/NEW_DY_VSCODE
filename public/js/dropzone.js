// public/js/dropzone.js
// File upload with Dropzone

import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';

class DropzoneManager {
    constructor() {
        this.instances = new Map();
        Dropzone.autoDiscover = false;
    }

    // Create dropzone
    create(element, options = {}) {
        const defaultOptions = {
            url: '/api/upload-file',
            maxFilesize: 10, // MB
            acceptedFiles: null,
            addRemoveLinks: true,
            dictDefaultMessage: '📁 파일을 드래그하거나 클릭하여 업로드',
            dictFallbackMessage: '브라우저가 드래그 앤 드롭을 지원하지 않습니다',
            dictFileTooBig: '파일이 너무 큽니다 ({{filesize}}MB). 최대: {{maxFilesize}}MB',
            dictInvalidFileType: '이 파일 형식은 업로드할 수 없습니다',
            dictRemoveFile: '삭제',
            dictCancelUpload: '취소',
            ...options
        };

        const dropzone = new Dropzone(element, defaultOptions);

        dropzone.on('success', (file, response) => {
            console.log('✅ Upload success:', file.name);
        });

        dropzone.on('error', (file, error) => {
            console.error('❌ Upload error:', file.name, error);
        });

        this.instances.set(element, dropzone);
        return dropzone;
    }

    // Create file upload modal
    createUploadModal(onUpload) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📤 파일 업로드</h2>
                    <button class="modal-close" id="upload-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="dropzone-container" class="dropzone" style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer;">
                        <div class="dz-message" style="margin: 40px 0;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                            <div style="font-size: 16px; color: var(--text-color);">파일을 드래그하거나 클릭하여 업로드</div>
                            <div style="font-size: 12px; color: var(--text-color-light); margin-top: 10px;">최대 10MB</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Create dropzone
        const dropzone = this.create('#dropzone-container', {
            url: '/api/upload-file',
            success: (file, response) => {
                if (onUpload) {
                    onUpload(file, response);
                }
            }
        });

        // Event listeners
        document.getElementById('upload-modal-close').addEventListener('click', () => {
            dropzone.destroy();
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                dropzone.destroy();
                modal.remove();
            }
        });

        return { modal, dropzone };
    }

    // Create inline dropzone
    createInlineDropzone(containerId, onUpload) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        container.innerHTML = `
            <div class="dropzone-inline" style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                <div style="font-size: 16px; color: var(--text-color); margin-bottom: 10px;">파일을 여기에 드롭하세요</div>
                <div style="font-size: 12px; color: var(--text-color-light);">또는 클릭하여 선택</div>
            </div>
        `;

        const dropzone = this.create(container.querySelector('.dropzone-inline'), {
            url: '/api/upload-file',
            success: (file, response) => {
                if (onUpload) {
                    onUpload(file, response);
                }
            }
        });

        return dropzone;
    }

    // Enable drag and drop on entire window
    enableGlobalDragDrop(onDrop) {
        let dropzoneElement = document.getElementById('global-dropzone');
        
        if (!dropzoneElement) {
            dropzoneElement = document.createElement('div');
            dropzoneElement.id = 'global-dropzone';
            dropzoneElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(102, 126, 234, 0.9);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            `;
            dropzoneElement.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="font-size: 72px; margin-bottom: 20px;">📁</div>
                    <div style="font-size: 32px; font-weight: bold;">파일을 여기에 드롭하세요</div>
                </div>
            `;
            document.body.appendChild(dropzoneElement);
        }

        // Show overlay on drag enter
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropzoneElement.style.display = 'flex';
        });

        // Hide overlay on drag leave
        dropzoneElement.addEventListener('dragleave', (e) => {
            if (e.target === dropzoneElement) {
                dropzoneElement.style.display = 'none';
            }
        });

        // Handle drop
        dropzoneElement.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzoneElement.style.display = 'none';
            
            const files = Array.from(e.dataTransfer.files);
            if (onDrop) {
                onDrop(files);
            }
        });

        dropzoneElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
    }

    // Destroy dropzone
    destroy(element) {
        const dropzone = this.instances.get(element);
        if (dropzone) {
            dropzone.destroy();
            this.instances.delete(element);
        }
    }

    // Destroy all
    destroyAll() {
        this.instances.forEach(dropzone => dropzone.destroy());
        this.instances.clear();
    }
}

export const dropzoneManager = new DropzoneManager();
export default dropzoneManager;
