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

class TypographyLightGridCard extends HTMLElement {
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
    if (!config.lights) throw new Error('Please define lights');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    const cols = this._config.columns || 2;
    return Math.ceil(this._config.lights.length / cols) * 2;
  }

  _getColor(state) {
    if (state.state !== 'on') return null;
    const rgb = state.attributes.rgb_color;
    if (rgb) return rgb;
    return [255, 180, 80];
  }

  _isVisible(light) {
    if (!light.visibility || !this._hass) return true;
    for (const cond of light.visibility) {
      const state = this._hass.states[cond.entity];
      if (!state) return false;
      if (cond.condition === 'state' && state.state !== cond.state) return false;
    }
    return true;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const cols = this._config.columns || 2;

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 8px;
        }
        .tile {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          border-radius: 14px;
          min-height: 100px;
          overflow: hidden;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .tile.hidden { display: none; }
        .fill {
          position: absolute;
          left: 0; bottom: 0; right: 0;
          border-radius: 14px;
          pointer-events: none;
          transition: height 0.15s ease-out;
        }
        .fill.dragging { transition: none; }
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-text {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          color: #8A8A8E;
        }
        .bottom {
          position: relative;
          z-index: 1;
          margin-top: 8px;
        }
        .name {
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 500;
          color: #FFFFFF;
        }
        .value-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-top: 2px;
        }
        .value {
          font-family: var(--font);
          font-weight: 700;
          line-height: 1;
          color: #fff;
        }
        .value.on { font-size: 1.8rem; }
        .value.off {
          font-size: 0.9rem;
          font-weight: 400;
          color: #555;
        }
        .unit {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 300;
          color: #8A8A8E;
        }
      </style>
      <div class="grid"></div>
    `;

    const grid = this.shadowRoot.querySelector('.grid');
    this._rows = {};

    for (const light of this._config.lights) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.entity = light.entity;

      const fill = document.createElement('div');
      fill.className = 'fill';

      tile.innerHTML = `
        <div class="top">
          <div class="dot"></div>
          <div class="status-text"></div>
        </div>
        <div class="bottom">
          <div class="name">${light.name || light.entity}</div>
          <div class="value-row">
            <span class="value"></span>
            <span class="unit"></span>
          </div>
        </div>
      `;

      // Insert fill before other content
      tile.insertBefore(fill, tile.firstChild);

      grid.appendChild(tile);

      this._rows[light.entity] = {
        el: tile,
        fill: fill,
        dot: tile.querySelector('.dot'),
        statusText: tile.querySelector('.status-text'),
        value: tile.querySelector('.value'),
        unitEl: tile.querySelector('.unit'),
        config: light,
        _swiping: false,
        _color: [255, 180, 80],
        _pendingPct: null
      };

      this._bindGestures(tile, light.entity);
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._rows || !this._hass) return;

    for (const light of this._config.lights) {
      const r = this._rows[light.entity];
      if (!r) continue;

      // Conditional visibility
      const visible = this._isVisible(light);
      r.el.classList.toggle('hidden', !visible);
      if (!visible) continue;

      if (r._swiping) continue;

      const state = this._hass.states[light.entity];
      if (!state) continue;

      const isOn = state.state === 'on';
      const bri = state.attributes.brightness;
      const pct = isOn && bri != null ? Math.round((bri / 255) * 100) : 0;
      const color = this._getColor(state);
      const cr = color ? color[0] : 100;
      const cg = color ? color[1] : 100;
      const cb = color ? color[2] : 100;

      r.el.style.background = isOn
        ? `rgba(${cr},${cg},${cb},0.12)`
        : 'rgba(255,255,255,0.03)';

      // Vertical fill from bottom
      r.fill.style.height = isOn ? pct + '%' : '0%';
      r.fill.style.background = isOn
        ? `rgba(${cr},${cg},${cb},0.10)`
        : 'transparent';
      r.fill.classList.remove('dragging');

      r.dot.style.background = isOn ? `rgb(${cr},${cg},${cb})` : '#333';
      r.dot.style.boxShadow = isOn ? `0 0 8px rgba(${cr},${cg},${cb},0.6)` : 'none';

      r.statusText.textContent = isOn ? (pct >= 100 ? 'Full' : 'Dimmed') : 'Off';
      r.statusText.style.color = isOn ? `rgba(${cr},${cg},${cb},0.7)` : '#555';

      r.value.className = isOn ? 'value on' : 'value off';
      r.value.textContent = isOn ? pct : 'OFF';
      r.unitEl.textContent = isOn ? '%' : '';

      r._color = [cr, cg, cb];
    }
  }

  _bindGestures(el, entity) {
    const self = this;
    const r = this._rows[entity];
    let startX, startY, startTime;
    let gesture = 'none';

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

      // Vertical swipe for grid tiles (swipe up = brighter)
      if (gesture === 'none' && dx > 10 && dx > dy) {
        gesture = 'tap';
        return;
      }

      if (gesture === 'none' && dy > 8) {
        gesture = 'swipe';
        r._swiping = true;
        r.fill.classList.add('dragging');
      }

      if (gesture === 'swipe') {
        const rect = el.getBoundingClientRect();
        // Invert: top of tile = 100%, bottom = 0%
        const y = e.clientY - rect.top;
        const pad = 0.15;
        const raw = (1 - y / rect.height - pad) / (1 - 2 * pad);
        let pct = Math.round(raw * 100);
        pct = Math.max(0, Math.min(100, pct));

        const c = r._color;
        r.fill.style.height = pct + '%';
        r.fill.style.background = `rgba(${c[0]},${c[1]},${c[2]},0.10)`;
        r.value.className = 'value on';
        r.value.textContent = pct;
        r.unitEl.textContent = '%';
        r.statusText.textContent = pct >= 100 ? 'Full' : pct <= 0 ? 'Off' : 'Dimmed';
        r._pendingPct = pct;
      }
    });

    el.addEventListener('pointerup', () => {
      if (gesture === 'swipe' && r._pendingPct != null) {
        const pct = r._pendingPct;
        if (pct <= 0) {
          self._hass.callService('light', 'turn_off', { entity_id: entity });
        } else {
          const brightness = Math.round((pct / 100) * 255);
          self._hass.callService('light', 'turn_on', {
            entity_id: entity, brightness: brightness
          });
        }
        r._pendingPct = null;
      } else if (gesture !== 'swipe') {
        const elapsed = Date.now() - startTime;
        if (elapsed < 400) {
          self._toggle(entity);
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

  _toggle(entity) {
    const state = this._hass.states[entity];
    if (!state) return;
    const service = state.state === 'on' ? 'turn_off' : 'turn_on';
    this._hass.callService('light', service, { entity_id: entity });
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-light-grid-card', TypographyLightGridCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-light-grid-card',
  name: 'Typography Light Grid Card',
  description: 'Compact light tiles in a grid with vertical brightness swipe and conditional visibility'
});
