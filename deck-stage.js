/**
 * deck-stage.js — presentation stage for Claude Design decks
 *
 * Attributes (inherited from x-import):
 *   width   – native slide width in px  (default 1920)
 *   height  – native slide height in px (default 1080)
 *
 * Children: <section data-label="…" data-speaker-notes="…"> slides
 *
 * Keyboard:
 *   →  ↓  Space  – next slide
 *   ←  ↑         – previous slide
 *   N            – toggle speaker notes panel
 *   F            – toggle full-screen
 */
class DeckStage extends HTMLElement {
  constructor() {
    super();
    this._slide = 0;
    this._notesVisible = false;
  }

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;

    this._W = parseInt(this.getAttribute('width') || '1920', 10);
    this._H = parseInt(this.getAttribute('height') || '1080', 10);
    this._slides = Array.from(this.querySelectorAll(':scope > section'));

    this._build();
    this._goto(0);
    this._bindKeys();
    window.addEventListener('resize', () => this._scale());
  }

  /* ------------------------------------------------------------------ layout */

  _build() {
    Object.assign(this.style, {
      display: 'block',
      position: 'fixed',
      inset: '0',
      background: '#0d0d0d',
      overflow: 'hidden',
    });

    // Slide viewport
    this._viewport = document.createElement('div');
    Object.assign(this._viewport.style, {
      position: 'absolute',
      top: '50%', left: '50%',
      transformOrigin: 'center center',
      width: this._W + 'px',
      height: this._H + 'px',
    });
    this.appendChild(this._viewport);

    this._slides.forEach(s => {
      s.style.display = 'none';
      s.style.width = this._W + 'px';
      s.style.height = this._H + 'px';
      this._viewport.appendChild(s);
    });

    this._scale();

    // ── Navigation bar ──────────────────────────────────────────────────────
    this._nav = document.createElement('div');
    Object.assign(this._nav.style, {
      position: 'fixed',
      bottom: '0', left: '0', right: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '12px 20px',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      zIndex: '100',
      transition: 'opacity .3s',
    });
    this.appendChild(this._nav);

    // Prev button
    const prev = this._btn('←', () => this._prev());
    this._nav.appendChild(prev);

    // Dot indicators
    this._dots = this._slides.map((s, i) => {
      const dot = document.createElement('button');
      const label = s.dataset.label || `Slide ${i + 1}`;
      Object.assign(dot.style, {
        width: '8px', height: '8px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        transition: 'transform .2s, background .2s',
        flexShrink: '0',
      });
      dot.title = label;
      dot.addEventListener('click', () => this._goto(i));
      this._nav.appendChild(dot);
      return dot;
    });

    // Next button
    const next = this._btn('→', () => this._next());
    this._nav.appendChild(next);

    // Spacer + slide counter
    this._counter = document.createElement('span');
    Object.assign(this._counter.style, {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '12px',
      color: 'rgba(255,255,255,0.55)',
      letterSpacing: '0.1em',
      minWidth: '60px',
      textAlign: 'center',
    });
    this._nav.appendChild(this._counter);

    // Notes toggle
    const notesBtn = this._btn('📝', () => this._toggleNotes(), 'Speaker notes (N)');
    this._nav.appendChild(notesBtn);

    // Fullscreen toggle
    const fsBtn = this._btn('⛶', () => this._toggleFS(), 'Full screen (F)');
    this._nav.appendChild(fsBtn);

    // Auto-hide nav
    let hideTimer;
    const showNav = () => {
      this._nav.style.opacity = '1';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { this._nav.style.opacity = '0'; }, 2500);
    };
    document.addEventListener('mousemove', showNav);
    document.addEventListener('keydown', showNav);
    showNav();

    // ── Speaker notes panel ─────────────────────────────────────────────────
    this._notesPanel = document.createElement('div');
    Object.assign(this._notesPanel.style, {
      position: 'fixed',
      bottom: '56px', left: '0', right: '0',
      maxHeight: '160px',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.80)',
      backdropFilter: 'blur(8px)',
      color: 'rgba(255,255,255,0.85)',
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: '15px',
      lineHeight: '1.6',
      padding: '16px 28px',
      display: 'none',
      zIndex: '99',
      boxSizing: 'border-box',
    });
    const notesLabel = document.createElement('div');
    Object.assign(notesLabel.style, {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '11px',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: '6px',
    });
    notesLabel.textContent = 'Speaker notes';
    this._notesText = document.createElement('div');
    this._notesPanel.appendChild(notesLabel);
    this._notesPanel.appendChild(this._notesText);
    this.appendChild(this._notesPanel);

    // ── Slide label (top-left) ───────────────────────────────────────────────
    this._slideLabel = document.createElement('div');
    Object.assign(this._slideLabel.style, {
      position: 'fixed',
      top: '14px', left: '20px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '12px',
      letterSpacing: '0.14em',
      color: 'rgba(255,255,255,0.5)',
      zIndex: '100',
      transition: 'opacity .3s',
      opacity: '0',
      pointerEvents: 'none',
    });
    this.appendChild(this._slideLabel);
    document.addEventListener('mousemove', () => {
      this._slideLabel.style.opacity = '1';
      clearTimeout(this._lblTimer);
      this._lblTimer = setTimeout(() => { this._slideLabel.style.opacity = '0'; }, 2500);
    });
  }

  _btn(label, onClick, title = '') {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    Object.assign(b.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: '6px',
      color: 'rgba(255,255,255,0.8)',
      padding: '5px 12px',
      cursor: 'pointer',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '14px',
    });
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------------------------------------------------------------- scale */

  _scale() {
    const scale = Math.min(
      window.innerWidth / this._W,
      window.innerHeight / this._H,
    );
    this._viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this._currentScale = scale;
  }

  /* ---------------------------------------------------------------- navigation */

  _goto(i) {
    this._slides[this._slide].style.display = 'none';
    this._slide = Math.max(0, Math.min(i, this._slides.length - 1));
    const s = this._slides[this._slide];
    s.style.display = '';

    // dots
    this._dots.forEach((d, j) => {
      d.style.background = j === this._slide
        ? '#fff'
        : 'rgba(255,255,255,0.3)';
      d.style.transform = j === this._slide ? 'scale(1.5)' : 'scale(1)';
    });

    // counter
    this._counter.textContent = `${this._slide + 1} / ${this._slides.length}`;

    // label
    this._slideLabel.textContent = s.dataset.label || '';

    // notes
    this._notesText.textContent = s.dataset.speakerNotes || '—';
  }

  _next() { this._goto(this._slide + 1); }
  _prev() { this._goto(this._slide - 1); }

  _toggleNotes() {
    this._notesVisible = !this._notesVisible;
    this._notesPanel.style.display = this._notesVisible ? 'block' : 'none';
  }

  _toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ---------------------------------------------------------------- keyboard */

  _bindKeys() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ':
          e.preventDefault(); this._next(); break;
        case 'ArrowLeft': case 'ArrowUp':
          e.preventDefault(); this._prev(); break;
        case 'n': case 'N':
          this._toggleNotes(); break;
        case 'f': case 'F':
          this._toggleFS(); break;
      }
    });
  }
}

customElements.define('deck-stage', DeckStage);
