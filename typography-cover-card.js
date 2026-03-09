// Ensure Space Grotesk is available globally
if (!document.querySelector('#typo-fonts')) {
  const style = document.createElement('style');
  style.id = 'typo-fonts';
  style.textContent = `
    @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
    @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
    @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
  `;
  document.head.appendChild(style);
}

class TypographyCoverCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
    } else {
      this._update();
    }
  }

  setConfig(config) {
    if (!config.covers) throw new Error('Please define covers');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return this._config ? this._config.covers.length : 4;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cover {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .fill {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          border-radius: 14px;
          pointer-events: none;
          transition: width 0.15s ease-out;
        }
        .fill.dragging { transition: none; }
        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          position: relative;
          z-index: 1;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .name {
          font-family: var(--font);
          font-size: 1.15rem;
          font-weight: 400;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 300;
          margin-top: 1px;
        }
        .right {
          display: flex;
          align-items: baseline;
          gap: 2px;
          flex-shrink: 0;
          margin-left: 12px;
          position: relative;
          z-index: 1;
        }
        .value {
          font-family: var(--font);
          font-weight: 700;
          line-height: 1;
          color: #fff;
        }
        .value.open {
          font-size: 1.6rem;
        }
        .value.closed {
          font-size: 1.1rem;
          font-weight: 400;
          color: #555;
        }
      </style>
      <div class="container"></div>
    `;

    const container = this.shadowRoot.querySelector('.container');
    this._rows = {};

    for (const cover of this._config.covers) {
      const row = document.createElement('div');
      row.className = 'cover';
      row.dataset.entity = cover.entity;

      const fill = document.createElement('div');
      fill.className = 'fill';

      const left = document.createElement('div');
      left.className = 'left';
      left.innerHTML = `
        <div class="dot"></div>
        <div class="info">
          <div class="name">${cover.name || cover.entity}</div>
          <div class="status"></div>
        </div>
      `;

      const right = document.createElement('div');
      right.className = 'right';
      right.innerHTML = `<span class="value"></span>`;

      row.appendChild(fill);
      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);

      this._rows[cover.entity] = {
        el: row,
        fill: fill,
        dot: left.querySelector('.dot'),
        status: left.querySelector('.status'),
        value: right.querySelector('.value'),
        unitEl: right.querySelector('.unit'),
        config: cover,
        _swiping: false,
        _pendingPct: null
      };

      this._bindGestures(row, cover.entity);
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._rows || !this._hass) return;

    for (const cover of this._config.covers) {
      const r = this._rows[cover.entity];
      if (!r || r._swiping) continue;

      const state = this._hass.states[cover.entity];
      if (!state) continue;

      const pos = state.attributes.current_position;
      const isOpen = state.state === 'open';
      const isClosed = state.state === 'closed';
      const pct = pos != null ? pos : (isOpen ? 100 : 0);
      const isPartial = isOpen && pct < 100;

      // Shade color - soft blue-white
      const cr = 160, cg = 190, cb = 220;

      r.el.style.background = isOpen
        ? `rgba(${cr},${cg},${cb},0.12)`
        : 'rgba(255,255,255,0.03)';

      r.fill.style.width = pct + '%';
      r.fill.style.background = isOpen
        ? `rgba(${cr},${cg},${cb},0.10)`
        : 'transparent';
      r.fill.classList.remove('dragging');

      r.dot.style.background = isOpen ? `rgb(${cr},${cg},${cb})` : '#333';
      r.dot.style.boxShadow = isOpen ? `0 0 8px rgba(${cr},${cg},${cb},0.5)` : 'none';

      r.status.textContent = isClosed ? '' : pct + '%';
      r.status.style.color = isOpen ? `rgba(${cr},${cg},${cb},0.8)` : '#555';

      r.value.className = isOpen ? 'value open' : 'value closed';
      r.value.textContent = isClosed ? 'Closed' : isPartial ? 'Partial' : 'Open';
    }
  }

  _bindGestures(el, entity) {
    const self = this;
    const r = this._rows[entity];
    let startX, startY, startTime;
    let gesture = 'none';

    const cr = 160, cg = 190, cb = 220;

    el.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      gesture = 'none';
      r._swiping = false;
      r._pendingPct = null;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (gesture === 'tap') return;
      if (!e.buttons) return;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (gesture === 'none' && dy > 10 && dy > dx) {
        gesture = 'tap';
        return;
      }

      if (gesture === 'none' && dx > 8) {
        gesture = 'swipe';
        r._swiping = true;
        r.fill.classList.add('dragging');
      }

      if (gesture === 'swipe') {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pad = 0.15;
        const raw = (x / rect.width - pad) / (1 - 2 * pad);
        let pct = Math.round(raw * 100);
        pct = Math.max(0, Math.min(100, pct));

        r.fill.style.width = pct + '%';
        r.fill.style.background = pct > 0 ? `rgba(${cr},${cg},${cb},0.10)` : 'transparent';
        r.value.className = pct > 0 ? 'value open' : 'value closed';
        r.value.textContent = pct === 0 ? 'Closed' : pct < 100 ? 'Partial' : 'Open';
        r.status.textContent = pct === 0 ? '' : pct + '%';
        r._pendingPct = pct;
      }
    });

    el.addEventListener('pointerup', () => {
      if (gesture === 'swipe' && r._pendingPct != null) {
        const pct = r._pendingPct;
        if (pct === 0) {
          self._hass.callService('cover', 'close_cover', { entity_id: entity });
        } else if (pct >= 100) {
          self._hass.callService('cover', 'open_cover', { entity_id: entity });
        } else {
          self._hass.callService('cover', 'set_cover_position', {
            entity_id: entity, position: pct
          });
        }
        r._pendingPct = null;
      } else if (gesture !== 'swipe') {
        const elapsed = Date.now() - startTime;
        if (elapsed < 400) {
          self._toggleCover(entity);
        } else {
          self._fireMoreInfo(entity);
        }
      }

      r._swiping = false;
      r.fill.classList.remove('dragging');
      gesture = 'none';
    });

    el.addEventListener('pointercancel', () => {
      r._swiping = false;
      r.fill.classList.remove('dragging');
      r._pendingPct = null;
      gesture = 'none';
    });

    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  _toggleCover(entity) {
    const state = this._hass.states[entity];
    if (!state) return;
    const service = state.state === 'open' ? 'close_cover' : 'open_cover';
    this._hass.callService('cover', service, { entity_id: entity });
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-cover-card', TypographyCoverCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-cover-card',
  name: 'Typography Cover Card',
  description: 'Shade/cover controls with swipe position and big typography'
});
