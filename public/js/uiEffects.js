// public/js/uiEffects.js
// Beautiful UI effects with particles.js, typed.js, and AOS

import Typed from 'typed.js';
import AOS from 'aos';
import 'aos/dist/aos.css';

class UIEffects {
    constructor() {
        this.typedInstances = [];
        this.particlesLoaded = false;
    }

    // Initialize AOS (Animate On Scroll)
    initAOS() {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        });
        console.log('✅ AOS initialized');
    }

    // Typewriter effect
    createTypewriter(element, strings, options = {}) {
        const defaultOptions = {
            strings: strings,
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 1000,
            loop: true,
            showCursor: true,
            cursorChar: '|',
            ...options
        };

        const typed = new Typed(element, defaultOptions);
        this.typedInstances.push(typed);
        return typed;
    }

    // Destroy all typewriters
    destroyTypewriters() {
        this.typedInstances.forEach(typed => typed.destroy());
        this.typedInstances = [];
    }

    // Create welcome screen with effects
    createWelcomeScreen() {
        const welcome = document.createElement('div');
        welcome.id = 'welcome-screen';
        welcome.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
        `;

        welcome.innerHTML = `
            <div style="text-align: center;" data-aos="fade-up">
                <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: bold;">
                    DY VSCode
                </h1>
                <div id="typed-text" style="font-size: 24px; min-height: 40px; margin-bottom: 40px;"></div>
                <div class="loading-spinner" style="margin: 0 auto;"></div>
            </div>
        `;

        document.body.appendChild(welcome);

        // Typewriter effect
        this.createTypewriter('#typed-text', [
            '웹 기반 코드 에디터',
            '40개 이상의 언어 지원',
            'GitHub 통합',
            '실시간 코드 실행',
            '프로페셔널 IDE'
        ]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            welcome.style.transition = 'opacity 0.5s';
            welcome.style.opacity = '0';
            setTimeout(() => {
                welcome.remove();
                this.destroyTypewriters();
            }, 500);
        }, 3000);
    }

    // Particle background
    async createParticles(containerId = 'particles-bg') {
        if (this.particlesLoaded) return;

        // Create container
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Load particles.js dynamically
        try {
            const particlesJS = (await import('particles.js')).default;
            
            window.particlesJS(containerId, {
                particles: {
                    number: {
                        value: 80,
                        density: {
                            enable: true,
                            value_area: 800
                        }
                    },
                    color: {
                        value: '#667eea'
                    },
                    shape: {
                        type: 'circle'
                    },
                    opacity: {
                        value: 0.5,
                        random: false
                    },
                    size: {
                        value: 3,
                        random: true
                    },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: '#667eea',
                        opacity: 0.4,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: 'none',
                        random: false,
                        straight: false,
                        out_mode: 'out',
                        bounce: false
                    }
                },
                interactivity: {
                    detect_on: 'canvas',
                    events: {
                        onhover: {
                            enable: true,
                            mode: 'repulse'
                        },
                        onclick: {
                            enable: true,
                            mode: 'push'
                        },
                        resize: true
                    }
                },
                retina_detect: true
            });

            this.particlesLoaded = true;
            console.log('✅ Particles initialized');
        } catch (error) {
            console.error('Particles error:', error);
        }
    }

    // Confetti effect
    createConfetti() {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}%;
                opacity: ${Math.random()};
                transform: rotate(${Math.random() * 360}deg);
                animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }

        // Add animation
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confetti-fall {
                    to {
                        top: 100%;
                        transform: translateY(100%) rotate(720deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Ripple effect on click
    addRippleEffect(element) {
        element.addEventListener('click', (e) => {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                top: ${y}px;
                left: ${x}px;
                pointer-events: none;
                animation: ripple-animation 0.6s ease-out;
            `;

            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });

        // Add animation
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple-animation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Add ripple to all buttons
    addRippleToButtons() {
        document.querySelectorAll('button').forEach(btn => {
            this.addRippleEffect(btn);
        });
    }

    // Glow effect on hover
    addGlowEffect(element, color = '#667eea') {
        element.addEventListener('mouseenter', () => {
            element.style.boxShadow = `0 0 20px ${color}`;
            element.style.transition = 'box-shadow 0.3s';
        });

        element.addEventListener('mouseleave', () => {
            element.style.boxShadow = 'none';
        });
    }
}

export const uiEffects = new UIEffects();
export default uiEffects;
