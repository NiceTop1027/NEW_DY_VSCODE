// public/js/dialogs.js
// Beautiful dialogs with SweetAlert2

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

class DialogManager {
    constructor() {
        // Configure default theme
        this.defaultConfig = {
            background: '#1e1e1e',
            color: '#ffffff',
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            customClass: {
                popup: 'swal-dark-popup',
                title: 'swal-dark-title',
                content: 'swal-dark-content'
            }
        };
    }

    // Success dialog
    success(title, message) {
        return Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            ...this.defaultConfig
        });
    }

    // Error dialog
    error(title, message) {
        return Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            ...this.defaultConfig
        });
    }

    // Warning dialog
    warning(title, message) {
        return Swal.fire({
            icon: 'warning',
            title: title,
            text: message,
            ...this.defaultConfig
        });
    }

    // Info dialog
    info(title, message) {
        return Swal.fire({
            icon: 'info',
            title: title,
            text: message,
            ...this.defaultConfig
        });
    }

    // Confirm dialog
    async confirm(title, message, confirmText = '확인', cancelText = '취소') {
        const result = await Swal.fire({
            icon: 'question',
            title: title,
            text: message,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            ...this.defaultConfig
        });
        return result.isConfirmed;
    }

    // Input dialog
    async input(title, placeholder = '', inputType = 'text') {
        const result = await Swal.fire({
            title: title,
            input: inputType,
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: '확인',
            cancelButtonText: '취소',
            ...this.defaultConfig,
            inputValidator: (value) => {
                if (!value) {
                    return '값을 입력하세요!';
                }
            }
        });
        return result.isConfirmed ? result.value : null;
    }

    // Select dialog
    async select(title, options) {
        const inputOptions = {};
        options.forEach((opt, idx) => {
            inputOptions[idx] = opt;
        });

        const result = await Swal.fire({
            title: title,
            input: 'select',
            inputOptions: inputOptions,
            showCancelButton: true,
            confirmButtonText: '선택',
            cancelButtonText: '취소',
            ...this.defaultConfig
        });
        return result.isConfirmed ? options[result.value] : null;
    }

    // Loading dialog
    loading(title = '처리 중...', message = '잠시만 기다려주세요') {
        Swal.fire({
            title: title,
            text: message,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
            ...this.defaultConfig
        });
    }

    // Close loading
    closeLoading() {
        Swal.close();
    }

    // Toast notification
    toast(message, icon = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        return Toast.fire({
            icon: icon,
            title: message
        });
    }

    // Progress dialog
    async progress(title, steps, onStep) {
        let currentStep = 0;
        
        Swal.fire({
            title: title,
            html: `
                <div class="progress-container">
                    <div class="progress-bar" id="swal-progress-bar" style="width: 0%; height: 20px; background: #667eea; border-radius: 10px; transition: width 0.3s;"></div>
                    <p id="swal-progress-text" style="margin-top: 10px;">0%</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            ...this.defaultConfig
        });

        for (let i = 0; i < steps.length; i++) {
            await onStep(steps[i], i);
            currentStep = i + 1;
            const progress = Math.round((currentStep / steps.length) * 100);
            
            const progressBar = document.getElementById('swal-progress-bar');
            const progressText = document.getElementById('swal-progress-text');
            
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${progress}% - ${steps[i]}`;
        }

        Swal.close();
    }

    // Custom HTML dialog
    custom(config) {
        return Swal.fire({
            ...this.defaultConfig,
            ...config
        });
    }

    // File delete confirmation
    async confirmDelete(fileName) {
        return await this.confirm(
            '파일 삭제',
            `"${fileName}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            '삭제',
            '취소'
        );
    }

    // Save confirmation
    async confirmSave(fileName) {
        return await this.confirm(
            '저장 확인',
            `"${fileName}"의 변경사항을 저장하시겠습니까?`,
            '저장',
            '취소'
        );
    }

    // Overwrite confirmation
    async confirmOverwrite(fileName) {
        return await this.confirm(
            '덮어쓰기 확인',
            `"${fileName}"이(가) 이미 존재합니다.\n덮어쓰시겠습니까?`,
            '덮어쓰기',
            '취소'
        );
    }
}

export const dialogs = new DialogManager();
export default dialogs;
