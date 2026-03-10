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

class TypographyClockCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
    }
    this._updateStats();
  }

  setConfig(config) {
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return 4;
  }

  _build() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const stats = this._config.stats || [];
    const hasStats = stats.length > 0;

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
          padding: 16px 20px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .time {
          font-family: var(--font);
          font-size: 5.5rem;
          font-weight: 700;
          letter-spacing: -4px;
          line-height: 1;
          color: #FFFFFF;
        }
        .date {
          font-family: var(--font);
          font-size: 1.2rem;
          font-weight: 300;
          color: #8A8A8E;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .stats {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .stat:active { opacity: 0.7; }
        .stat-icon {
          font-size: 0.85rem;
        }
        .stat-value {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 700;
          color: #00E676;
        }
        .stat-label {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 300;
          color: #8A8A8E;
        }
      </style>
      <div class="card">
        <div class="time" id="time"></div>
        <div class="date" id="date"></div>
        ${hasStats ? `<div class="stats" id="stats">
          ${stats.map((s, i) => `
            <div class="stat" data-idx="${i}">
              ${s.icon ? `<span class="stat-icon">${s.icon}</span>` : ''}
              <span class="stat-value" id="stat-val-${i}">—</span>
              <span class="stat-label">${s.label || ''}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;

    // Start clock
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 1000);

    this._built = true;
  }

  _updateClock() {
    const timeEl = this.shadowRoot?.getElementById('time');
    const dateEl = this.shadowRoot?.getElementById('date');
    if (!timeEl || !dateEl) return;

    const now = new Date();
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = h + ':' + m + ' ' + ampm;

    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
  }

  _updateStats() {
    if (!this._built || !this._hass) return;
    const stats = this._config.stats || [];

    stats.forEach((s, i) => {
      const el = this.shadowRoot.getElementById(`stat-val-${i}`);
      if (!el) return;

      if (s.template) {
        // Count entities matching criteria
        const states = this._hass.states;
        let count = 0;
        if (s.template === 'lights_on') {
          count = Object.values(states).filter(e =>
            e.entity_id.startsWith('light.') && e.state === 'on'
          ).length;
          el.textContent = count;
        } else if (s.template === 'people_home') {
          count = Object.values(states).filter(e =>
            e.entity_id.startsWith('person.') && e.state === 'home'
          ).length;
          el.textContent = count;
        }
      } else if (s.entity) {
        const state = states[s.entity];
        if (state) el.textContent = state.state;
      }

      // Color
      if (s.color) el.style.color = s.color;
    });
  }

  disconnectedCallback() {
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }
}

customElements.define('typography-clock-card', TypographyClockCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-clock-card',
  name: 'Typography Clock Card',
  description: 'Big clock display with date and optional stat chips'
});
