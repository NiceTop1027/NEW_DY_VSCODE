// public/js/colorPicker.js
// Color picker with Pickr

import Pickr from '@simonwep/pickr';
import '@simonwep/pickr/dist/themes/nano.min.css';

class ColorPickerManager {
  constructor() {
    this.pickers = new Map();
  }

  // Create color picker
  create(element, options = {}) {
    const defaultOptions = {
      el: element,
      theme: 'nano',
      default: '#667eea',
      swatches: [
        '#667eea',
        '#764ba2',
        '#f093fb',
        '#4facfe',
        '#43e97b',
        '#fa709a',
        '#fee140',
        '#30cfd0',
        '#ff6b6b',
        '#4ecdc4',
        '#45b7d1',
        '#96ceb4'
      ],
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          hex: true,
          rgba: true,
          hsla: true,
          hsva: true,
          cmyk: true,
          input: true,
          clear: true,
          save: true
        }
      },
      ...options
    };

    const pickr = Pickr.create(defaultOptions);

    pickr.on('save', (color, instance) => {
      if (options.onSave) {
        options.onSave(color.toHEXA().toString());
      }
    });

    pickr.on('change', (color, instance) => {
      if (options.onChange) {
        options.onChange(color.toHEXA().toString());
      }
    });

    this.pickers.set(element, pickr);
    return pickr;
  }

  // Create theme customizer
  createThemeCustomizer() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>🎨 테마 커스터마이징</h2>
                    <button class="modal-close" id="theme-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; gap: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; color: var(--text-color);">배경색</label>
                            <div id="picker-background"></div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; color: var(--text-color);">텍스트 색상</label>
                            <div id="picker-text"></div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; color: var(--text-color);">강조 색상</label>
                            <div id="picker-accent"></div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; color: var(--text-color);">테두리 색상</label>
                            <div id="picker-border"></div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="theme-reset-btn" class="btn-secondary">초기화</button>
                        <button id="theme-apply-btn" class="btn-primary">적용</button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    const colors = {
      background: '#1e1e1e',
      text: '#ffffff',
      accent: '#667eea',
      border: '#3e3e3e'
    };

    // Create pickers
    const bgPicker = this.create('#picker-background', {
      default: colors.background,
      onSave: (color) => colors.background = color
    });

    const textPicker = this.create('#picker-text', {
      default: colors.text,
      onSave: (color) => colors.text = color
    });

    const accentPicker = this.create('#picker-accent', {
      default: colors.accent,
      onSave: (color) => colors.accent = color
    });

    const borderPicker = this.create('#picker-border', {
      default: colors.border,
      onSave: (color) => colors.border = color
    });

    // Event listeners
    document.getElementById('theme-modal-close').addEventListener('click', () => {
      bgPicker.destroyAndRemove();
      textPicker.destroyAndRemove();
      accentPicker.destroyAndRemove();
      borderPicker.destroyAndRemove();
      modal.remove();
    });

    document.getElementById('theme-reset-btn').addEventListener('click', () => {
      colors.background = '#1e1e1e';
      colors.text = '#ffffff';
      colors.accent = '#667eea';
      colors.border = '#3e3e3e';
            
      bgPicker.setColor(colors.background);
      textPicker.setColor(colors.text);
      accentPicker.setColor(colors.accent);
      borderPicker.setColor(colors.border);
    });

    document.getElementById('theme-apply-btn').addEventListener('click', () => {
      this.applyTheme(colors);
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        bgPicker.destroyAndRemove();
        textPicker.destroyAndRemove();
        accentPicker.destroyAndRemove();
        borderPicker.destroyAndRemove();
        modal.remove();
      }
    });
  }

  // Apply theme colors
  applyTheme(colors) {
    const root = document.documentElement;
    root.style.setProperty('--editor-background', colors.background);
    root.style.setProperty('--text-color', colors.text);
    root.style.setProperty('--primary-color', colors.accent);
    root.style.setProperty('--border-color', colors.border);

    // Save to localStorage
    localStorage.setItem('custom-theme', JSON.stringify(colors));
        
    console.log('✅ Theme applied:', colors);
  }

  // Load saved theme
  loadSavedTheme() {
    const saved = localStorage.getItem('custom-theme');
    if (saved) {
      const colors = JSON.parse(saved);
      this.applyTheme(colors);
    }
  }

  // Create inline color picker
  createInlinePicker(containerId, defaultColor, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const pickerEl = document.createElement('div');
    pickerEl.className = 'color-picker-inline';
    container.appendChild(pickerEl);

    return this.create(pickerEl, {
      default: defaultColor,
      onChange: onChange
    });
  }

  // Get color from picker
  getColor(element) {
    const picker = this.pickers.get(element);
    return picker ? picker.getColor().toHEXA().toString() : null;
  }

  // Set color
  setColor(element, color) {
    const picker = this.pickers.get(element);
    if (picker) {
      picker.setColor(color);
    }
  }

  // Destroy picker
  destroy(element) {
    const picker = this.pickers.get(element);
    if (picker) {
      picker.destroyAndRemove();
      this.pickers.delete(element);
    }
  }

  // Destroy all
  destroyAll() {
    this.pickers.forEach(picker => picker.destroyAndRemove());
    this.pickers.clear();
  }
}

export const colorPicker = new ColorPickerManager();
export default colorPicker;
