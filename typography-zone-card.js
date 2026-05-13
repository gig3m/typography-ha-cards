// Typography Zone Card v2 - Horizontal bar comparison with deviation from setpoint
// Thermostat current reading shown as primary bar, sensors below
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

class TypographyZoneCard extends HTMLElement {
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
    if (!config.thermostat) throw new Error('Please define thermostat');
    if (!config.sensors) config.sensors = [];
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return 3 + (this._config?.sensors?.length || 0);
  }

  _deviationColor(dev) {
    const abs = Math.abs(dev);
    if (abs <= 1) return '#00E676';
    if (abs <= 2) return '#69F0AE';
    if (abs <= 3) return '#FFB300';
    if (abs <= 4) return '#FF9100';
    return '#FF5252';
  }

  _buildRow(container, name, isPrimary, clickEntity) {
    const row = document.createElement('div');
    row.className = isPrimary ? 'sensor-row primary' : 'sensor-row';
    row.innerHTML = `
      <div class="sensor-top">
        <span class="sensor-name${isPrimary ? ' primary-name' : ''}">${name}</span>
        <span class="sensor-values">
          <span class="sensor-temp${isPrimary ? ' primary-temp' : ''}"></span>
          <span class="sensor-deviation"></span>
        </span>
      </div>
      <div class="bar-container${isPrimary ? ' primary-bar' : ''}">
        <div class="bar-fill"></div>
        <div class="setpoint-line"></div>
      </div>
    `;
    row.addEventListener('click', () => this._fireMoreInfo(clickEntity));
    container.appendChild(row);

    return {
      el: row,
      tempEl: row.querySelector('.sensor-temp'),
      devEl: row.querySelector('.sensor-deviation'),
      barFill: row.querySelector('.bar-fill'),
      setpointLine: row.querySelector('.setpoint-line'),
    };
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
        .card {
          padding: 18px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .zone-name {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mode {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .setpoint-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 16px;
        }
        .setpoint-temp {
          font-family: var(--font);
          font-size: 2.2rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .setpoint-label {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 300;
          color: #555;
        }
        .sensor-rows {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sensor-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sensor-row:active { opacity: 0.7; }
        .sensor-row.primary {
          margin-bottom: 4px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .sensor-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .sensor-name {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #8A8A8E;
        }
        .primary-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: #bbb;
        }
        .sensor-values {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .sensor-temp {
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }
        .primary-temp {
          font-size: 1.2rem;
        }
        .sensor-deviation {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 700;
        }
        .bar-container {
          position: relative;
          height: 6px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 3px;
          overflow: visible;
        }
        .bar-container.primary-bar {
          height: 10px;
          border-radius: 5px;
        }
        .bar-container.primary-bar .bar-fill {
          border-radius: 5px;
        }
        .bar-fill {
          position: absolute;
          top: 0;
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease, left 0.6s ease, background 0.6s ease;
        }
        .setpoint-line {
          position: absolute;
          top: -3px;
          width: 2px;
          height: 12px;
          background: #fff;
          border-radius: 1px;
          opacity: 0.5;
          transition: left 0.6s ease;
        }
        .primary-bar .setpoint-line {
          height: 16px;
        }
        .scale-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .scale-label {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 300;
          color: #444;
        }
      </style>
      <div class="card">
        <div class="header">
          <span class="zone-name">${this._config.name || 'Zone'}</span>
          <span class="mode" id="mode"></span>
        </div>
        <div class="setpoint-row">
          <span class="setpoint-temp" id="setpoint"></span>
          <span class="setpoint-label">target</span>
        </div>
        <div class="sensor-rows" id="sensors"></div>
        <div class="scale-labels">
          <span class="scale-label" id="scale-min"></span>
          <span class="scale-label" id="scale-max"></span>
        </div>
      </div>
    `;

    const container = this.shadowRoot.getElementById('sensors');
    this._allRows = [];

    // Primary row: thermostat current reading
    const thermoName = this._config.thermostat_name || this._config.name?.replace(' Zone', '') || 'Thermostat';
    this._primaryRow = this._buildRow(container, thermoName, true, this._config.thermostat);
    this._allRows.push({ ...this._primaryRow, isPrimary: true });

    // Sensor rows
    for (const sensor of this._config.sensors) {
      const row = this._buildRow(container, sensor.name || '', false, sensor.entity);
      this._allRows.push({ ...row, isPrimary: false, config: sensor });
    }

    // Setpoint click
    this.shadowRoot.getElementById('setpoint').addEventListener('click', () => {
      this._fireMoreInfo(this._config.thermostat);
    });

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    const thermoState = this._hass.states[this._config.thermostat];
    if (!thermoState) return;

    const setpoint = parseFloat(thermoState.attributes.temperature) || 0;
    const currentTemp = parseFloat(thermoState.attributes.current_temperature) || 0;
    const mode = thermoState.state;

    // Mode display
    const modeEl = this.shadowRoot.getElementById('mode');
    const modeColors = { cool: '#448AFF', heat: '#FF5252', heat_cool: '#FFB300', auto: '#00E676', off: '#555', fan_only: '#8A8A8E' };
    modeEl.textContent = mode;
    modeEl.style.color = modeColors[mode] || '#8A8A8E';

    // Setpoint display
    this.shadowRoot.getElementById('setpoint').textContent = `${Math.round(setpoint)}°`;

    // Collect all temps for scale (thermostat + sensors)
    const allTemps = [setpoint, currentTemp];
    const rowTemps = [currentTemp]; // primary first

    for (const sensor of this._config.sensors) {
      const state = this._hass.states[sensor.entity];
      if (state && state.state !== 'unavailable' && state.state !== 'unknown') {
        const t = parseFloat(state.state);
        if (!isNaN(t)) {
          allTemps.push(t);
          rowTemps.push(t);
        } else {
          rowTemps.push(null);
        }
      } else {
        rowTemps.push(null);
      }
    }

    // Scale
    const minTemp = Math.min(...allTemps.filter(t => !isNaN(t)));
    const maxTemp = Math.max(...allTemps.filter(t => !isNaN(t)));
    const spread = Math.max(maxTemp - minTemp, 4);
    const padding = Math.max(spread * 0.3, 2);
    const scaleMin = Math.floor(minTemp - padding);
    const scaleMax = Math.ceil(maxTemp + padding);
    const scaleRange = scaleMax - scaleMin;

    this.shadowRoot.getElementById('scale-min').textContent = `${scaleMin}°`;
    this.shadowRoot.getElementById('scale-max').textContent = `${scaleMax}°`;

    const setpointPct = ((setpoint - scaleMin) / scaleRange) * 100;

    // Update all rows
    for (let i = 0; i < this._allRows.length; i++) {
      const row = this._allRows[i];
      const temp = rowTemps[i];

      if (temp === null || isNaN(temp)) {
        row.tempEl.textContent = '—';
        row.devEl.textContent = '';
        row.barFill.style.width = '0%';
        row.setpointLine.style.left = `${setpointPct}%`;
        continue;
      }

      const deviation = temp - setpoint;
      const devRounded = Math.round(deviation * 10) / 10;
      const devDisplay = devRounded > 0 ? `+${devRounded}°` : devRounded === 0 ? '0°' : `${devRounded}°`;
      const devColor = this._deviationColor(deviation);

      row.tempEl.textContent = `${Math.round(temp)}°`;
      row.devEl.textContent = devDisplay;
      row.devEl.style.color = devColor;

      const tempPct = ((temp - scaleMin) / scaleRange) * 100;

      if (row.isPrimary) {
        // Primary: fill from left edge to current temp position
        row.barFill.style.left = '0%';
        row.barFill.style.width = `${tempPct}%`;
        row.barFill.style.background = '#fff';
        row.barFill.style.opacity = '0.4';
        row.barFill.style.borderRadius = '3px';
      } else if (Math.abs(deviation) < 0.5) {
        // At setpoint: show a small marker dot
        row.barFill.style.left = `${setpointPct - 0.5}%`;
        row.barFill.style.width = '1%';
        row.barFill.style.background = devColor;
        row.barFill.style.borderRadius = '3px';
        row.barFill.style.opacity = '1';
      } else if (temp >= setpoint) {
        row.barFill.style.left = `${setpointPct}%`;
        row.barFill.style.width = `${Math.max(tempPct - setpointPct, 1)}%`;
        row.barFill.style.background = devColor;
        row.barFill.style.borderRadius = '0 3px 3px 0';
        row.barFill.style.opacity = '1';
      } else {
        row.barFill.style.left = `${tempPct}%`;
        row.barFill.style.width = `${Math.max(setpointPct - tempPct, 1)}%`;
        row.barFill.style.background = devColor;
        row.barFill.style.borderRadius = '3px 0 0 3px';
        row.barFill.style.opacity = '1';
      }

      row.setpointLine.style.left = `${setpointPct}%`;
    }
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-zone-card', TypographyZoneCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-zone-card',
  name: 'Typography Zone Card',
  description: 'HVAC zone visualization with horizontal bar comparison and deviation from setpoint'
});
