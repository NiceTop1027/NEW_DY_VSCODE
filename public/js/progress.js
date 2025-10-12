// public/js/progress.js
// Progress bar with NProgress

import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

class ProgressManager {
    constructor() {
        // Configure NProgress
        NProgress.configure({
            showSpinner: true,
            trickleSpeed: 200,
            minimum: 0.08,
            easing: 'ease',
            speed: 500
        });

        // Custom styling
        this.injectCustomStyles();
    }

    // Inject custom styles
    injectCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #nprogress {
                pointer-events: none;
            }
            #nprogress .bar {
                background: linear-gradient(to right, #667eea, #764ba2);
                position: fixed;
                z-index: 10000;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
            }
            #nprogress .peg {
                display: block;
                position: absolute;
                right: 0px;
                width: 100px;
                height: 100%;
                box-shadow: 0 0 10px #667eea, 0 0 5px #667eea;
                opacity: 1.0;
                transform: rotate(3deg) translate(0px, -4px);
            }
            #nprogress .spinner {
                display: block;
                position: fixed;
                z-index: 10000;
                top: 15px;
                right: 15px;
            }
            #nprogress .spinner-icon {
                width: 18px;
                height: 18px;
                box-sizing: border-box;
                border: solid 2px transparent;
                border-top-color: #667eea;
                border-left-color: #667eea;
                border-radius: 50%;
                animation: nprogress-spinner 400ms linear infinite;
            }
            @keyframes nprogress-spinner {
                0%   { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Start progress
    start() {
        NProgress.start();
    }

    // Set progress (0 to 1)
    set(progress) {
        NProgress.set(progress);
    }

    // Increment progress
    inc(amount) {
        NProgress.inc(amount);
    }

    // Complete progress
    done() {
        NProgress.done();
    }

    // Remove progress
    remove() {
        NProgress.remove();
    }

    // Show progress for promise
    async trackPromise(promise, message = '') {
        this.start();
        try {
            const result = await promise;
            this.done();
            return result;
        } catch (error) {
            this.done();
            throw error;
        }
    }

    // Show progress for async function
    async track(fn, message = '') {
        return this.trackPromise(fn(), message);
    }

    // Show progress for multiple steps
    async trackSteps(steps) {
        this.start();
        const increment = 1 / steps.length;
        
        for (let i = 0; i < steps.length; i++) {
            await steps[i]();
            this.set((i + 1) * increment);
        }
        
        this.done();
    }

    // Show progress for file operations
    async trackFileOperation(operation, fileName) {
        console.log(`📁 ${operation}: ${fileName}`);
        this.start();
        try {
            const result = await operation;
            this.done();
            console.log(`✅ ${operation} complete: ${fileName}`);
            return result;
        } catch (error) {
            this.done();
            console.error(`❌ ${operation} failed: ${fileName}`, error);
            throw error;
        }
    }
}

export const progress = new ProgressManager();
export default progress;
