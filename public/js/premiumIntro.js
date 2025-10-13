// public/js/premiumIntro.js
// Premium intro screen with Three.js, GSAP, and Lottie

import * as THREE from 'three';
import gsap from 'gsap';
import lottie from 'lottie-web';
import anime from 'animejs';

class PremiumIntro {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.animationFrame = null;
    }

    /**
     * Initialize premium intro screen
     */
    init() {
        const container = document.getElementById('intro-screen');
        if (!container) return;

        // Setup Three.js scene
        this.setupThreeJS(container);
        
        // Animate text with GSAP
        this.animateText();
        
        // Add interactive particles
        this.createParticles();
        
        // Start animation loop
        this.animate();
        
        // Auto hide after 3 seconds
        setTimeout(() => this.hide(), 3000);
    }

    /**
     * Setup Three.js 3D background
     */
    setupThreeJS(container) {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1,
            1000
        );
        this.camera.position.z = 400;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Insert canvas before content
        const canvas = this.renderer.domElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1';
        container.insertBefore(canvas, container.firstChild);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x007acc, 1, 1000);
        pointLight.position.set(0, 0, 300);
        this.scene.add(pointLight);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Create animated particles
     */
    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];

        const particleCount = 2000;

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * 2000 - 1000;
            const y = Math.random() * 2000 - 1000;
            const z = Math.random() * 2000 - 1000;

            vertices.push(x, y, z);

            // Gradient colors (blue to cyan)
            const color = new THREE.Color();
            color.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.5);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    /**
     * Animate text with GSAP
     */
    animateText() {
        const title = document.querySelector('#intro-screen h1');
        const subtitle = document.querySelector('#intro-screen p');

        if (title) {
            // Split text into characters
            const text = title.textContent;
            title.innerHTML = text.split('').map(char => 
                `<span style="display:inline-block;opacity:0">${char === ' ' ? '&nbsp;' : char}</span>`
            ).join('');

            // Animate each character
            gsap.to(title.querySelectorAll('span'), {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.05,
                ease: 'back.out(1.7)',
                delay: 0.2
            });

            // Glowing effect
            gsap.to(title, {
                textShadow: '0 0 20px rgba(0, 122, 204, 0.8), 0 0 40px rgba(0, 122, 204, 0.6)',
                duration: 1.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }

        if (subtitle) {
            gsap.from(subtitle, {
                opacity: 0,
                y: 30,
                duration: 1,
                delay: 1,
                ease: 'power3.out'
            });
        }

        // Animate logo if exists
        const logo = document.querySelector('#intro-screen .intro-logo');
        if (logo) {
            gsap.from(logo, {
                scale: 0,
                rotation: 360,
                duration: 1.2,
                ease: 'elastic.out(1, 0.5)'
            });

            // Floating animation
            gsap.to(logo, {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }
    }

    /**
     * Animation loop
     */
    animate() {
        this.animationFrame = requestAnimationFrame(() => this.animate());

        if (this.particles) {
            // Rotate particles
            this.particles.rotation.x += 0.0005;
            this.particles.rotation.y += 0.001;

            // Pulse effect
            const time = Date.now() * 0.001;
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                
                positions[i + 2] = z + Math.sin(time + x * 0.01) * 0.5;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Hide intro screen
     */
    hide() {
        const container = document.getElementById('intro-screen');
        if (!container) return;

        // Animate out with GSAP
        gsap.to(container, {
            opacity: 0,
            scale: 1.1,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
                container.style.display = 'none';
                this.cleanup();
            }
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
    }
}

// Export singleton
export const premiumIntro = new PremiumIntro();
export default premiumIntro;
