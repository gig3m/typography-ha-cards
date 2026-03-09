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

const CLIMATE_COLORS = {
  cooling: { bg: 'rgba(68, 138, 255, 0.18)', text: '#448AFF', icon: '❄️' },
  heating: { bg: 'rgba(255, 82, 82, 0.18)', text: '#FF5252', icon: '🔥' },
  fan:     { bg: 'rgba(255, 255, 255, 0.08)', text: '#AAAAAA', icon: '💨' },
  idle:    { bg: 'rgba(255, 255, 255, 0.06)', text: '#8A8A8E', icon: '●' },
  off:     { bg: 'rgba(255, 255, 255, 0.03)', text: '#555555', icon: '○' }
};

class TypographyClimateCard extends HTMLElement {
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
    if (!config.zones) throw new Error('Please define zones');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return this._config ? this._config.zones.length : 5;
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
          gap: 4px;
        }
        .zone {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .zone:active {
          opacity: 0.8;
        }
        .row {
          display: flex;
          align-items: center;
        }
        .icon {
          margin-right: 10px;
          font-size: 1.3rem;
        }
        .left {
          display: flex;
          flex-direction: column;
        }
        .name {
          font-family: var(--font);
          font-size: 1.1rem;
          font-weight: 500;
          color: #FFFFFF;
        }
        .status {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 2px;
        }
        .right {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .temp {
          font-family: var(--font);
          font-size: 2.4rem;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1;
        }
        .unit {
          font-family: var(--font);
          font-size: 1rem;
          font-weight: 300;
          color: #8A8A8E;
        }
      </style>
      <div class="container"></div>
    `;

    const container = this.shadowRoot.querySelector('.container');
    this._rows = {};

    for (const zone of this._config.zones) {
      const row = document.createElement('div');
      row.className = 'zone';
      row.dataset.entity = zone.entity;

      row.innerHTML = `
        <div class="row">
          <span class="icon"></span>
          <div class="left">
            <div class="name">${zone.name || zone.entity}</div>
            <div class="status"></div>
          </div>
        </div>
        <div class="right">
          <span class="temp"></span>
          <span class="unit">°F</span>
        </div>
      `;

      row.addEventListener('click', () => this._fireMoreInfo(zone.entity));
      container.appendChild(row);

      this._rows[zone.entity] = {
        el: row,
        icon: row.querySelector('.icon'),
        status: row.querySelector('.status'),
        temp: row.querySelector('.temp')
      };
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._rows || !this._hass) return;

    for (const zone of this._config.zones) {
      const r = this._rows[zone.entity];
      if (!r) continue;

      const state = this._hass.states[zone.entity];
      if (!state) continue;

      const currentTemp = Math.round(state.attributes.current_temperature || 0);
      const targetTemp = Math.round(state.attributes.temperature || 0);
      const action = state.attributes.hvac_action || state.state;
      const mode = state.state;

      let statusKey = 'idle';
      let statusText = 'Idle';
      if (action === 'cooling') { statusKey = 'cooling'; statusText = 'Cooling'; }
      else if (action === 'heating') { statusKey = 'heating'; statusText = 'Heating'; }
      else if (action === 'fan') { statusKey = 'fan'; statusText = 'Fan'; }
      else if (mode === 'off') { statusKey = 'off'; statusText = 'Off'; }

      const c = CLIMATE_COLORS[statusKey];

      r.el.style.background = c.bg;
      r.icon.textContent = c.icon;
      r.icon.style.color = statusKey === 'idle' ? '#00E676' : c.text;
      r.status.style.color = c.text;
      r.status.textContent = statusText + ' → ' + targetTemp + '°';
      r.temp.textContent = currentTemp;
    }
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-climate-card', TypographyClimateCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-climate-card',
  name: 'Typography Climate Card',
  description: 'Data-forward climate zones with big temperature typography'
});
