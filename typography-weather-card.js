// Typography Weather Card v5
// Bold: giant temp, color-driven, forecast range bars

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

const W_ICONS = {
  'clear-night': '🌙', 'cloudy': '☁️', 'fog': '🌫️', 'hail': '🌨️',
  'lightning': '⚡', 'lightning-rainy': '⛈️', 'partlycloudy': '⛅',
  'pouring': '🌧️', 'rainy': '🌧️', 'snowy': '❄️', 'snowy-rainy': '🌨️',
  'sunny': '☀️', 'windy': '💨', 'windy-variant': '💨', 'exceptional': '⚠️'
};

const WDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Temperature to color: cold blue → green → warm amber → hot red
function tempColor(f) {
  if (f <= 32) return '#448AFF';
  if (f <= 50) return '#29B6F6';
  if (f <= 65) return '#26C6DA';
  if (f <= 75) return '#00E676';
  if (f <= 85) return '#FFB300';
  if (f <= 95) return '#FF7043';
  return '#FF5252';
}

function tempColorRGB(f) {
  if (f <= 32) return [68, 138, 255];
  if (f <= 50) return [41, 182, 246];
  if (f <= 65) return [38, 198, 218];
  if (f <= 75) return [0, 230, 118];
  if (f <= 85) return [255, 179, 0];
  if (f <= 95) return [255, 112, 67];
  return [255, 82, 82];
}

class TypographyWeatherCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
    else this._update();
    if (!this._subscribed && this._hass.connection) this._subscribeForecast();
  }

  setConfig(config) {
    if (!config.entity) throw new Error('Please define a weather entity');
    this._config = config;
    this._built = false;
    this._forecast = null;
    this._subscribed = false;
    this._unsub = null;
  }

  getCardSize() { return 4; }

  disconnectedCallback() {
    if (this._unsub) { this._unsub(); this._unsub = null; this._subscribed = false; }
  }

  async _subscribeForecast() {
    if (this._subscribed) return;
    this._subscribed = true;
    try {
      this._unsub = await this._hass.connection.subscribeMessage(
        (msg) => { if (msg.forecast) { this._forecast = msg.forecast; this._renderForecast(); } },
        { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: this._config.entity }
      );
    } catch (e) {
      this._subscribed = false;
    }
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
          position: relative;
          padding: 16px 18px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        /* Subtle gradient glow behind card based on temp */
        .glow {
          position: absolute;
          top: -40px;
          right: -30px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.12;
          pointer-events: none;
          transition: background 1s ease;
        }
        .hero {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .hero-left {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .temp {
          font-family: var(--font);
          font-size: 4.5rem;
          font-weight: 700;
          line-height: 0.85;
          transition: color 1s ease;
        }
        .degree {
          font-family: var(--font);
          font-size: 2rem;
          font-weight: 300;
          color: #8A8A8E;
          line-height: 0.85;
        }
        .hero-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          padding-bottom: 4px;
        }
        .cond-text {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: capitalize;
        }
        .hi-lo {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 300;
          color: #555;
        }
        /* Forecast rows */
        .forecast {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fc-row {
          display: flex;
          align-items: center;
          gap: 0;
          height: 18px;
        }
        .fc-day {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 400;
          color: #8A8A8E;
          width: 28px;
          flex-shrink: 0;
          letter-spacing: 0.03em;
        }
        .fc-icon {
          font-size: 0.85rem;
          width: 22px;
          flex-shrink: 0;
          text-align: center;
        }
        .fc-lo-label {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 300;
          color: #555;
          width: 24px;
          text-align: right;
          flex-shrink: 0;
          padding-right: 6px;
        }
        .fc-bar-wrap {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.04);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }
        .fc-bar {
          position: absolute;
          top: 0;
          height: 100%;
          border-radius: 2px;
          transition: left 0.5s ease, width 0.5s ease, background 0.5s ease;
        }
        /* Today marker */
        .fc-bar.today {
          height: 6px;
          top: -1px;
        }
        .fc-hi-label {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 700;
          color: #fff;
          width: 24px;
          text-align: left;
          flex-shrink: 0;
          padding-left: 6px;
        }
        .forecast-loading {
          font-family: var(--font);
          font-size: 0.6rem;
          color: #333;
          text-align: center;
          padding: 4px 0;
        }
      </style>
      <div class="card">
        <div class="glow"></div>
        <div class="hero">
          <div class="hero-left">
            <span class="temp"></span>
            <span class="degree">°F</span>
          </div>
          <div class="hero-right">
            <span class="cond-text"></span>
            <span class="hi-lo"></span>
          </div>
        </div>
        <div class="forecast"><span class="forecast-loading">…</span></div>
      </div>
    `;

    this._tempEl = this.shadowRoot.querySelector('.temp');
    this._condEl = this.shadowRoot.querySelector('.cond-text');
    this._hiLoEl = this.shadowRoot.querySelector('.hi-lo');
    this._glowEl = this.shadowRoot.querySelector('.glow');
    this._forecastEl = this.shadowRoot.querySelector('.forecast');

    this.shadowRoot.querySelector('.card').addEventListener('click', () => {
      this._fireMoreInfo(this._config.entity);
    });

    this._built = true;
    this._update();
    if (this._forecast) this._renderForecast();
  }

  _update() {
    if (!this._built || !this._hass) return;
    const state = this._hass.states[this._config.entity];
    if (!state) return;

    const temp = Math.round(parseFloat(state.attributes.temperature));
    const condition = state.state;

    this._tempEl.textContent = isNaN(temp) ? '—' : temp;
    this._condEl.textContent = condition.replace(/-/g, ' ').replace('partlycloudy', 'partly cloudy');

    // Color the temp based on value
    const color = tempColor(temp);
    this._tempEl.style.color = color;

    // Glow effect
    const rgb = tempColorRGB(temp);
    this._glowEl.style.background = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

    // Hi/Lo from today's forecast
    if (this._forecast && this._forecast[0]) {
      const today = this._forecast[0];
      const hi = Math.round(today.temperature);
      const lo = today.templow !== undefined ? Math.round(today.templow) : null;
      this._hiLoEl.textContent = lo !== null ? `H:${hi}° L:${lo}°` : `H:${hi}°`;
    }
  }

  _renderForecast() {
    if (!this._built || !this._forecastEl || !this._forecast) return;

    const days = this._forecast.slice(0, this._config.forecast_days || 5);
    if (!days.length) return;

    // Find overall min/max for the week to scale bars
    let weekMin = Infinity, weekMax = -Infinity;
    for (const day of days) {
      const hi = day.temperature;
      const lo = day.templow !== undefined ? day.templow : hi;
      if (lo < weekMin) weekMin = lo;
      if (hi > weekMax) weekMax = hi;
    }
    const range = weekMax - weekMin || 1;

    this._forecastEl.innerHTML = '';

    days.forEach((day, idx) => {
      const d = new Date(day.datetime);
      const hi = Math.round(day.temperature);
      const lo = day.templow !== undefined ? Math.round(day.templow) : hi;

      // Bar position as percentage of the week's range
      const leftPct = ((lo - weekMin) / range) * 100;
      const widthPct = Math.max(2, ((hi - lo) / range) * 100);

      // Color the bar based on the day's average temp
      const avg = (hi + lo) / 2;
      const barColor = tempColor(avg);

      const row = document.createElement('div');
      row.className = 'fc-row';
      row.innerHTML = `
        <span class="fc-day">${WDAY[d.getDay()]}</span>
        <span class="fc-icon">${W_ICONS[day.condition] || '🌡️'}</span>
        <span class="fc-lo-label">${lo}°</span>
        <div class="fc-bar-wrap">
          <div class="fc-bar ${idx === 0 ? 'today' : ''}" style="left:${leftPct}%;width:${widthPct}%;background:${barColor}"></div>
        </div>
        <span class="fc-hi-label">${hi}°</span>
      `;
      this._forecastEl.appendChild(row);
    });

    this._update(); // refresh hi/lo
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-weather-card', TypographyWeatherCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-weather-card',
  name: 'Typography Weather Card',
  description: 'Bold weather with temp-driven colors and forecast range bars'
});
