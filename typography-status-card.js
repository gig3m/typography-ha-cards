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

class TypographyStatusCard extends HTMLElement {
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
    if (!config.entities || !config.entities.length) throw new Error('Please define entities');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return 4;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const cols = this._config.columns || 3;
    const hasHero = !!this._config.hero;

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .card {
          padding: 18px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .card-icon {
          font-size: 1.3rem;
        }
        .card-title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        /* Hero section */
        .hero {
          margin-bottom: 16px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .hero-value {
          font-family: var(--font);
          font-size: 3rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .hero-label {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 2px;
        }
        .hero-detail {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 300;
          color: #555;
          margin-top: 2px;
        }
        /* Divider */
        .divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin-bottom: 14px;
        }
        /* Metrics grid */
        .metrics {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 14px 12px;
        }
        .metric {
          display: flex;
          flex-direction: column;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .metric:active { opacity: 0.7; }
        .metric-value {
          font-family: var(--font);
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          display: flex;
          align-items: baseline;
          gap: 3px;
        }
        .metric-unit {
          font-size: 0.7rem;
          font-weight: 300;
          color: #8A8A8E;
        }
        .metric-label {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 2px;
        }
        /* Status dot for binary entities */
        .metric-value .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 2px;
          flex-shrink: 0;
        }
        .metric-value .status-text {
          font-size: 1rem;
          font-weight: 400;
        }
      </style>
      <div class="card">
        ${this._config.title || this._config.icon ? `
          <div class="card-header">
            ${this._config.icon ? `<span class="card-icon">${this._config.icon}</span>` : ''}
            ${this._config.title ? `<span class="card-title">${this._config.title}</span>` : ''}
          </div>
        ` : ''}
        ${hasHero ? `<div class="hero"><div class="hero-value"></div><div class="hero-label"></div><div class="hero-detail"></div></div><div class="divider"></div>` : ''}
        <div class="metrics"></div>
      </div>
    `;

    // Build metric slots
    const metricsEl = this.shadowRoot.querySelector('.metrics');
    this._slots = {};

    for (const ent of this._config.entities) {
      const metric = document.createElement('div');
      metric.className = 'metric';
      metric.innerHTML = `
        <div class="metric-value"></div>
        <div class="metric-label">${ent.name || ''}</div>
      `;
      metric.addEventListener('click', () => this._fireMoreInfo(ent.entity));
      metricsEl.appendChild(metric);

      this._slots[ent.entity] = {
        el: metric,
        valueEl: metric.querySelector('.metric-value'),
        labelEl: metric.querySelector('.metric-label'),
        config: ent
      };
    }

    // Hero click
    if (hasHero) {
      const heroEl = this.shadowRoot.querySelector('.hero');
      heroEl.addEventListener('click', () => this._fireMoreInfo(this._config.hero.entity));
      this._heroValueEl = this.shadowRoot.querySelector('.hero-value');
      this._heroLabelEl = this.shadowRoot.querySelector('.hero-label');
      this._heroDetailEl = this.shadowRoot.querySelector('.hero-detail');
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    // Update hero
    if (this._config.hero) {
      const h = this._config.hero;
      const state = this._hass.states[h.entity];
      if (state) {
        const val = state.state;
        const color = this._resolveColor(val, h.color_map) || '#fff';
        this._heroValueEl.textContent = val;
        this._heroValueEl.style.color = color;
        this._heroLabelEl.textContent = h.name || state.attributes.friendly_name || '';

        // Optional detail entity
        if (h.detail_entity) {
          const detailState = this._hass.states[h.detail_entity];
          this._heroDetailEl.textContent = detailState ? detailState.state : '';
          this._heroDetailEl.style.display = '';
        } else {
          this._heroDetailEl.style.display = 'none';
        }
      }
    }

    // Update metrics
    for (const ent of this._config.entities) {
      const s = this._slots[ent.entity];
      if (!s) continue;

      const state = this._hass.states[ent.entity];
      if (!state) {
        s.valueEl.innerHTML = '<span style="color:#555">—</span>';
        continue;
      }

      const val = state.state;
      const unit = ent.unit || state.attributes.unit_of_measurement || '';
      const domain = ent.entity.split('.')[0];

      if (domain === 'update') {
        const isOn = val === 'on';
        const color = isOn ? '#FFB300' : '#00E676';
        const label = isOn ? (ent.label_on || 'Update') : (ent.label_off || 'Current');
        s.valueEl.innerHTML = `<span class="status-dot" style="background:${color};box-shadow:0 0 6px ${color}60"></span><span class="status-text" style="color:${color}">${label}</span>`;
      } else if (domain === 'media_player') {
        const colorMap = { 'playing': '#00E676', 'paused': '#FFB300', 'idle': '#8A8A8E', 'off': '#555', 'unavailable': '#555' };
        const color = ent.color_map ? (this._resolveColor(val, ent.color_map) || colorMap[val] || '#8A8A8E') : (colorMap[val] || '#8A8A8E');
        const display = val.charAt(0).toUpperCase() + val.slice(1);
        s.valueEl.innerHTML = `<span class="status-dot" style="background:${color};box-shadow:0 0 6px ${color}60"></span><span class="status-text" style="color:${color}">${display}</span>`;
      } else if (domain === 'binary_sensor' || domain === 'automation' || domain === 'switch') {
        const isOn = val === 'on';
        const onColor = ent.color_on || '#00E676';
        const offColor = ent.color_off || (domain === 'automation' ? '#8A8A8E' : '#FF5252');
        const color = isOn ? onColor : offColor;
        const defaultOn = domain === 'automation' ? 'On' : 'Yes';
        const defaultOff = domain === 'automation' ? 'Off' : 'No';
        const label = isOn ? (ent.label_on || defaultOn) : (ent.label_off || defaultOff);
        s.valueEl.innerHTML = `<span class="status-dot" style="background:${color};box-shadow:0 0 6px ${color}60"></span><span class="status-text" style="color:${color}">${label}</span>`;
      } else if (val === 'unavailable' || val === 'unknown') {
        s.valueEl.innerHTML = '<span style="color:#555">—</span>';
      } else {
        const num = parseFloat(val);
        let display;
        if (!isNaN(num)) {
          display = Number.isInteger(num) ? num.toString() : num.toFixed(1);
        } else {
          display = val;
        }
        const color = this._resolveColor(val, ent.color_map) || '#fff';
        s.valueEl.innerHTML = `<span style="color:${color}">${display}</span>${unit ? `<span class="metric-unit">${unit}</span>` : ''}`;
      }

      // Update label
      s.labelEl.textContent = ent.name || state.attributes.friendly_name || ent.entity;
    }
  }

  _resolveColor(value, colorMap) {
    if (!colorMap) return null;
    // colorMap is an object: { "Ready": "#00E676", "Running": "#FFB300", ... }
    // Also supports "_default" key
    if (colorMap[value]) return colorMap[value];
    if (colorMap._default) return colorMap._default;
    return null;
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-status-card', TypographyStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-status-card',
  name: 'Typography Status Card',
  description: 'Multi-entity status panel with hero value and metric grid'
});
