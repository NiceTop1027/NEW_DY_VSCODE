// public/js/animations.js
// Animation utilities with GSAP

import gsap from 'gsap';

class AnimationManager {
  constructor() {
    // Set default GSAP settings
    gsap.defaults({
      ease: 'power2.out',
      duration: 0.3
    });
  }

  // Fade in element
  fadeIn(element, options = {}) {
    return gsap.fromTo(element,
      { opacity: 0, ...options.from },
      { 
        opacity: 1, 
        duration: options.duration || 0.3,
        ease: options.ease || 'power2.out',
        ...options.to 
      }
    );
  }

  // Fade out element
  fadeOut(element, options = {}) {
    return gsap.to(element, {
      opacity: 0,
      duration: options.duration || 0.3,
      ease: options.ease || 'power2.in',
      ...options
    });
  }

  // Slide in from direction
  slideIn(element, direction = 'left', options = {}) {
    const directions = {
      left: { x: -100 },
      right: { x: 100 },
      top: { y: -100 },
      bottom: { y: 100 }
    };

    return gsap.fromTo(element,
      { 
        opacity: 0,
        ...directions[direction]
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: options.duration || 0.4,
        ease: options.ease || 'power2.out',
        ...options
      }
    );
  }

  // Slide out to direction
  slideOut(element, direction = 'left', options = {}) {
    const directions = {
      left: { x: -100 },
      right: { x: 100 },
      top: { y: -100 },
      bottom: { y: 100 }
    };

    return gsap.to(element, {
      opacity: 0,
      ...directions[direction],
      duration: options.duration || 0.4,
      ease: options.ease || 'power2.in',
      ...options
    });
  }

  // Scale animation
  scale(element, scale = 1.1, options = {}) {
    return gsap.to(element, {
      scale: scale,
      duration: options.duration || 0.3,
      ease: options.ease || 'back.out(1.7)',
      ...options
    });
  }

  // Bounce animation
  bounce(element, options = {}) {
    return gsap.fromTo(element,
      { y: 0 },
      {
        y: -20,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        ...options
      }
    );
  }

  // Shake animation
  shake(element, options = {}) {
    return gsap.fromTo(element,
      { x: 0 },
      {
        x: -10,
        duration: 0.1,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 5,
        ...options
      }
    );
  }

  // Pulse animation
  pulse(element, options = {}) {
    return gsap.fromTo(element,
      { scale: 1 },
      {
        scale: 1.05,
        duration: 0.5,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
        ...options
      }
    );
  }

  // Rotate animation
  rotate(element, degrees = 360, options = {}) {
    return gsap.to(element, {
      rotation: degrees,
      duration: options.duration || 0.5,
      ease: options.ease || 'power2.inOut',
      ...options
    });
  }

  // Flip animation
  flip(element, options = {}) {
    return gsap.to(element, {
      rotationY: 180,
      duration: options.duration || 0.6,
      ease: 'power2.inOut',
      transformStyle: 'preserve-3d',
      ...options
    });
  }

  // Stagger animation for multiple elements
  staggerIn(elements, options = {}) {
    return gsap.fromTo(elements,
      { 
        opacity: 0,
        y: 20
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: options.stagger || 0.1,
        ease: 'power2.out',
        ...options
      }
    );
  }

  // Modal animations
  showModal(modalElement, options = {}) {
    const overlay = modalElement.querySelector('.modal-overlay') || modalElement;
    const content = modalElement.querySelector('.modal-content') || modalElement;

    const tl = gsap.timeline();
        
    tl.set(modalElement, { display: 'flex' })
      .fromTo(overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
      .fromTo(content,
        { 
          opacity: 0,
          scale: 0.8,
          y: -50
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.4,
          ease: 'back.out(1.7)'
        },
        '-=0.2'
      );

    return tl;
  }

  hideModal(modalElement, options = {}) {
    const overlay = modalElement.querySelector('.modal-overlay') || modalElement;
    const content = modalElement.querySelector('.modal-content') || modalElement;

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(modalElement, { display: 'none' });
      }
    });
        
    tl.to(content, {
      opacity: 0,
      scale: 0.8,
      y: -50,
      duration: 0.3,
      ease: 'power2.in'
    })
      .to(overlay, {
        opacity: 0,
        duration: 0.2
      }, '-=0.1');

    return tl;
  }

  // Notification animation
  showNotification(element, options = {}) {
    return gsap.fromTo(element,
      {
        opacity: 0,
        x: 100,
        scale: 0.8
      },
      {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
        ...options
      }
    );
  }

  hideNotification(element, options = {}) {
    return gsap.to(element, {
      opacity: 0,
      x: 100,
      scale: 0.8,
      duration: 0.3,
      ease: 'power2.in',
      ...options
    });
  }

  // Loading spinner
  spin(element, options = {}) {
    return gsap.to(element, {
      rotation: 360,
      duration: 1,
      ease: 'none',
      repeat: -1,
      ...options
    });
  }

  // Progress bar animation
  animateProgress(element, progress, options = {}) {
    return gsap.to(element, {
      width: `${progress}%`,
      duration: options.duration || 0.5,
      ease: 'power2.out',
      ...options
    });
  }

  // Typewriter effect
  typewriter(element, text, options = {}) {
    const chars = text.split('');
    element.textContent = '';
        
    return gsap.to({}, {
      duration: options.duration || chars.length * 0.05,
      onUpdate: function() {
        const progress = this.progress();
        const currentIndex = Math.floor(progress * chars.length);
        element.textContent = chars.slice(0, currentIndex).join('');
      },
      ease: 'none',
      ...options
    });
  }

  // Kill all animations on element
  killAnimations(element) {
    gsap.killTweensOf(element);
  }

  // Kill all animations
  killAll() {
    gsap.killTweensOf('*');
  }

  // Create timeline
  timeline(options = {}) {
    return gsap.timeline(options);
  }

  // Scroll to element
  scrollTo(element, options = {}) {
    return gsap.to(window, {
      scrollTo: element,
      duration: options.duration || 0.8,
      ease: 'power2.inOut',
      ...options
    });
  }
}

// Export singleton
export const animator = new AnimationManager();
export default animator;
