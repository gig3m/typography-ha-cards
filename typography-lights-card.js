// Ensure Space Grotesk is available globally (for shadow DOM access)
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

class TypographyLightsCard extends HTMLElement {
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
    const cols = this._config.columns || 1;
    return cols > 1 ? Math.ceil(this._config.lights.length / cols) * 2 : this._config.lights.length;
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

    const cols = this._config.columns || 1;
    const isGrid = cols > 1;

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
          display: ${isGrid ? 'grid' : 'flex'};
          ${isGrid ? `grid-template-columns: repeat(${cols}, 1fr);` : 'flex-direction: column;'}
          gap: 8px;
        }
        .light {
          position: relative;
          display: flex;
          overflow: hidden;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          border-radius: 14px;
        }
        .light.hidden { display: none; }
        /* List layout (columns=1) */
        .light.list-mode {
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }
        /* Grid layout (columns>1) */
        .light.grid-mode {
          flex-direction: column;
          justify-content: space-between;
          padding: 12px 14px;
          min-height: 72px;
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
        /* Grid mode: top row with dot + status */
        .grid-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }
        .grid-bottom {
          position: relative;
          z-index: 1;
          margin-top: 4px;
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
        .name.grid {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .status {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 300;
          margin-top: 1px;
        }
        .status.grid {
          font-size: 0.7rem;
          font-weight: 400;
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
        .value.on { font-size: 2.5rem; }
        .value.off {
          font-size: 1.1rem;
          font-weight: 400;
          color: #555;
        }
        .value.grid-on { font-size: 1.6rem; }
        .value.grid-off {
          font-size: 0.85rem;
          font-weight: 400;
          color: #555;
        }
        .unit {
          font-family: var(--font);
          font-size: 1rem;
          font-weight: 300;
          color: #8A8A8E;
        }
        .unit.grid {
          font-size: 0.7rem;
        }
        .value-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
      </style>
      <div class="container"></div>
    `;

    const container = this.shadowRoot.querySelector('.container');
    this._rows = {};

    for (const light of this._config.lights) {
      const row = document.createElement('div');
      row.className = isGrid ? 'light grid-mode' : 'light list-mode';
      row.dataset.entity = light.entity;

      const fill = document.createElement('div');
      fill.className = 'fill';
      row.appendChild(fill);

      if (isGrid) {
        // Grid layout: top (dot + status), bottom (name + value)
        row.innerHTML += `
          <div class="grid-top">
            <div class="dot"></div>
            <div class="status grid"></div>
          </div>
          <div class="grid-bottom">
            <div class="name grid">${light.name || light.entity}</div>
            <div class="value-row">
              <span class="value"></span>
              <span class="unit grid"></span>
            </div>
          </div>
        `;
      } else {
        // List layout: left (dot + info), right (value)
        row.innerHTML += `
          <div class="left">
            <div class="dot"></div>
            <div class="info">
              <div class="name">${light.name || light.entity}</div>
              <div class="status"></div>
            </div>
          </div>
          <div class="right">
            <span class="value"></span>
            <span class="unit"></span>
          </div>
        `;
      }

      container.appendChild(row);

      this._rows[light.entity] = {
        el: row,
        fill: row.querySelector('.fill'),
        dot: row.querySelector('.dot'),
        status: row.querySelector('.status'),
        value: row.querySelector('.value'),
        unitEl: row.querySelector('.unit'),
        config: light,
        _swiping: false,
        _color: [255, 180, 80],
        _pendingPct: null
      };

      this._bindGestures(row, light.entity);
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._rows || !this._hass) return;
    const isGrid = (this._config.columns || 1) > 1;

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
        ? `rgba(${cr},${cg},${cb},0.15)`
        : 'rgba(255,255,255,0.03)';

      r.fill.style.width = isOn ? pct + '%' : '0%';
      r.fill.style.background = isOn
        ? `rgba(${cr},${cg},${cb},0.12)`
        : 'transparent';
      r.fill.classList.remove('dragging');

      r.dot.style.background = isOn ? `rgb(${cr},${cg},${cb})` : '#333';
      r.dot.style.boxShadow = isOn ? `0 0 8px rgba(${cr},${cg},${cb},0.6)` : 'none';

      r.status.style.color = isOn ? `rgba(${cr},${cg},${cb},0.8)` : '#555';
      r.status.textContent = isOn ? (pct >= 100 ? 'Full' : 'Dimmed') : 'Off';

      if (isGrid) {
        r.value.className = isOn ? 'value grid-on' : 'value grid-off';
      } else {
        r.value.className = isOn ? 'value on' : 'value off';
      }
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
      if (!e.buttons) return; // ignore moves without button held

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      // If vertical movement dominates, it's a scroll, not our gesture
      if (gesture === 'none' && dy > 10 && dy > dx) {
        gesture = 'tap';
        return;
      }

      // Start swipe once horizontal threshold met
      if (gesture === 'none' && dx > 8) {
        gesture = 'swipe';
        r._swiping = true;
        r.fill.classList.add('dragging');
      }

      if (gesture === 'swipe') {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Center-focused: 15% dead zone on each side
        const pad = 0.15;
        const raw = (x / rect.width - pad) / (1 - 2 * pad);
        let pct = Math.round(raw * 100);
        pct = Math.max(0, Math.min(100, pct));

        const c = r._color;
        r.fill.style.width = pct + '%';
        r.fill.style.background = `rgba(${c[0]},${c[1]},${c[2]},0.12)`;
        const isGrid = (self._config.columns || 1) > 1;
        r.value.className = isGrid ? 'value grid-on' : 'value on';
        r.value.textContent = pct;
        r.unitEl.textContent = '%';
        r.status.textContent = pct >= 100 ? 'Full' : pct <= 0 ? 'Off' : 'Dimmed';
        r._pendingPct = pct;
      }
    });

    el.addEventListener('pointerup', (e) => {
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

customElements.define('typography-lights-card', TypographyLightsCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-lights-card',
  name: 'Typography Lights Card',
  description: 'Data-forward light controls with swipe brightness, grid or list layout'
});
