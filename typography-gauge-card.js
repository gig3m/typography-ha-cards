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

class TypographyGaugeCard extends HTMLElement {
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
    if (!config.entity) throw new Error('Please define entity');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return 3;
  }

  _getColor(value) {
    const segments = this._config.segments;
    if (!segments || !segments.length) return this._config.color || '#00E676';
    // Segments should be sorted ascending by 'from'
    let color = segments[0].color || '#00E676';
    for (const seg of segments) {
      if (value >= seg.from) color = seg.color;
    }
    return color;
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
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .gauge-wrap {
          position: relative;
          width: 160px;
          height: 90px;
          overflow: hidden;
        }
        svg {
          width: 160px;
          height: 90px;
        }
        .track {
          fill: none;
          stroke: rgba(255,255,255,0.06);
        }
        .arc {
          fill: none;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s ease-out, stroke 0.3s ease;
        }
        .center-value {
          position: absolute;
          bottom: 2px;
          left: 0;
          right: 0;
          text-align: center;
        }
        .big-num {
          font-family: var(--font);
          font-size: 2.4rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .big-unit {
          font-family: var(--font);
          font-size: 0.9rem;
          font-weight: 300;
          color: #8A8A8E;
        }
        .label {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 6px;
          text-align: center;
        }
        .range-labels {
          display: flex;
          justify-content: space-between;
          width: 160px;
          margin-top: 2px;
        }
        .range-label {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 300;
          color: #444;
        }
      </style>
      <div class="card">
        <div class="gauge-wrap">
          <svg viewBox="0 0 160 90">
            <path class="track" />
            <path class="arc" />
          </svg>
          <div class="center-value">
            <span class="big-num"></span><span class="big-unit"></span>
          </div>
        </div>
        <div class="label"></div>
        <div class="range-labels">
          <span class="range-label range-min"></span>
          <span class="range-label range-max"></span>
        </div>
      </div>
    `;

    // Arc geometry: semicircle from left to right
    const cx = 80, cy = 82;
    const r = 68;
    const strokeWidth = this._config.stroke_width || 10;

    // Semicircle arc path (180 degrees, left to right)
    const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    const arcLength = Math.PI * r;

    const track = this.shadowRoot.querySelector('.track');
    track.setAttribute('d', arcPath);
    track.setAttribute('stroke-width', strokeWidth);

    const arc = this.shadowRoot.querySelector('.arc');
    arc.setAttribute('d', arcPath);
    arc.setAttribute('stroke-width', strokeWidth);
    arc.setAttribute('stroke-dasharray', arcLength);
    arc.setAttribute('stroke-dashoffset', arcLength);

    this._arcLength = arcLength;
    this._arc = arc;
    this._bigNum = this.shadowRoot.querySelector('.big-num');
    this._bigUnit = this.shadowRoot.querySelector('.big-unit');
    this._label = this.shadowRoot.querySelector('.label');
    this._rangeMin = this.shadowRoot.querySelector('.range-min');
    this._rangeMax = this.shadowRoot.querySelector('.range-max');

    // Click opens more-info
    this.shadowRoot.querySelector('.card').addEventListener('click', () => {
      this._fireMoreInfo(this._config.entity);
    });

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    const state = this._hass.states[this._config.entity];
    if (!state) return;

    const min = this._config.min !== undefined ? this._config.min : 0;
    const max = this._config.max !== undefined ? this._config.max : 100;
    const unit = this._config.unit || state.attributes.unit_of_measurement || '';
    const name = this._config.name || state.attributes.friendly_name || this._config.entity;

    let val = parseFloat(state.state);
    if (isNaN(val)) {
      this._bigNum.textContent = '—';
      this._bigUnit.textContent = '';
      this._label.textContent = name;
      this._arc.setAttribute('stroke-dashoffset', this._arcLength);
      return;
    }

    // Clamp for display
    const clamped = Math.max(min, Math.min(max, val));
    const pct = (clamped - min) / (max - min);
    const offset = this._arcLength * (1 - pct);
    const color = this._getColor(val);

    this._arc.setAttribute('stroke-dashoffset', offset);
    this._arc.setAttribute('stroke', color);

    // Display value
    const display = Number.isInteger(val) ? val : val.toFixed(1);
    this._bigNum.textContent = display;
    this._bigUnit.textContent = unit ? ` ${unit}` : '';
    this._label.textContent = name;

    // Range labels
    if (this._config.show_range !== false) {
      this._rangeMin.textContent = min;
      this._rangeMax.textContent = max;
    } else {
      this._rangeMin.textContent = '';
      this._rangeMax.textContent = '';
    }
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-gauge-card', TypographyGaugeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-gauge-card',
  name: 'Typography Gauge Card',
  description: 'Bold semicircle gauge with big typography value'
});
