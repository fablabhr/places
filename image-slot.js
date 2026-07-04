/**
 * image-slot.js — drag-drop / click-to-upload image placeholder
 *
 * Attributes:
 *   placeholder  – label shown when empty
 *   shape        – "rounded" (default) | "circle" | "square"
 *   radius       – border-radius in px when shape="rounded"
 */
class ImageSlot extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    const placeholder = this.getAttribute('placeholder') || 'Drop an image here · or click to select';
    const radius = this.getAttribute('radius') || '8';
    const shape = this.getAttribute('shape') || 'rounded';

    const br = shape === 'circle' ? '50%'
      : shape === 'rounded' ? `${radius}px`
      : '0';

    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.style.borderRadius = br;
    this.style.background = '#E8E2D8';
    this.style.cursor = 'pointer';

    this._img = null;

    // Placeholder label
    this._label = document.createElement('div');
    Object.assign(this._label.style, {
      position: 'absolute', inset: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: '16px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '13px',
      fontWeight: '500',
      color: '#8F897D',
      letterSpacing: '0.04em',
      lineHeight: '1.5',
      pointerEvents: 'none',
      userSelect: 'none',
    });
    this._label.textContent = placeholder;
    this.appendChild(this._label);

    // Drop overlay
    this._overlay = document.createElement('div');
    Object.assign(this._overlay.style, {
      position: 'absolute', inset: '0',
      background: 'rgba(32,159,147,0.15)',
      border: '2px dashed #209F93',
      borderRadius: br,
      display: 'none',
      pointerEvents: 'none',
    });
    this.appendChild(this._overlay);

    // Hidden file input
    this._input = document.createElement('input');
    this._input.type = 'file';
    this._input.accept = 'image/*';
    this._input.style.display = 'none';
    this.appendChild(this._input);

    // Events
    this.addEventListener('click', () => this._input.click());

    this._input.addEventListener('change', () => {
      if (this._input.files[0]) this._load(this._input.files[0]);
    });

    this.addEventListener('dragover', e => {
      e.preventDefault();
      this._overlay.style.display = 'block';
    });
    this.addEventListener('dragleave', () => {
      this._overlay.style.display = 'none';
    });
    this.addEventListener('drop', e => {
      e.preventDefault();
      this._overlay.style.display = 'none';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this._load(file);
    });
  }

  _load(file) {
    const url = URL.createObjectURL(file);
    if (this._img) {
      this._img.src = url;
    } else {
      this._img = document.createElement('img');
      Object.assign(this._img.style, {
        position: 'absolute', inset: '0',
        width: '100%', height: '100%',
        objectFit: 'cover',
      });
      this.insertBefore(this._img, this._label);
    }
    this._label.style.display = 'none';
  }
}

customElements.define('image-slot', ImageSlot);
