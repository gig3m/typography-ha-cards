// Typography Printer Card v1
// Compact printer status with CMYK toner bars

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

class TypographyPrinterCard extends HTMLElement {
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

  getCardSize() { return 2; }

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
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .card:active { opacity: 0.8; }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .icon { font-size: 1.1rem; }
        .title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .status {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          margin-left: auto;
        }
        .toner-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .toner-row:last-child { margin-bottom: 0; }
        .toner-label {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 700;
          width: 14px;
          text-align: center;
          flex-shrink: 0;
        }
        .toner-track {
          flex: 1;
          height: 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 5px;
          overflow: hidden;
        }
        .toner-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }
        .toner-pct {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 700;
          width: 30px;
          text-align: right;
          flex-shrink: 0;
        }
      </style>
      <div class="card" id="card">
        <div class="header">
          <span class="icon">${this._config.icon || '🖨️'}</span>
          <span class="title">${this._config.name || 'Printer'}</span>
          <span class="status" id="status"></span>
        </div>
        <div id="toners"></div>
      </div>
    `;

    const tonersEl = this.shadowRoot.getElementById('toners');
    const toners = this._config.toners || [];
    this._tonerSlots = {};

    for (const t of toners) {
      const row = document.createElement('div');
      row.className = 'toner-row';
      row.innerHTML = `
        <span class="toner-label" style="color: ${t.color}">${t.label}</span>
        <div class="toner-track">
          <div class="toner-fill" style="background: ${t.color}; width: 0%"></div>
        </div>
        <span class="toner-pct">—</span>
      `;
      tonersEl.appendChild(row);
      this._tonerSlots[t.entity] = {
        fill: row.querySelector('.toner-fill'),
        pct: row.querySelector('.toner-pct'),
        color: t.color
      };
    }

    this.shadowRoot.getElementById('card').addEventListener('click', () => {
      const evt = new Event('hass-more-info', { bubbles: true, composed: true });
      evt.detail = { entityId: this._config.entity };
      this.dispatchEvent(evt);
    });

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    // Status
    const statusEl = this.shadowRoot.getElementById('status');
    const state = this._hass.states[this._config.entity];
    if (state) {
      const v = state.state;
      const label = v.charAt(0).toUpperCase() + v.slice(1);
      statusEl.textContent = label;
      statusEl.style.color = v === 'idle' ? '#00E676' : v === 'printing' ? '#FFB300' : '#8A8A8E';
    } else {
      statusEl.textContent = 'Offline';
      statusEl.style.color = '#FF5252';
    }

    // Toners
    for (const [entityId, slot] of Object.entries(this._tonerSlots)) {
      const s = this._hass.states[entityId];
      if (s && s.state !== 'unavailable' && s.state !== 'unknown') {
        const pct = parseInt(s.state);
        slot.fill.style.width = `${pct}%`;
        slot.pct.textContent = `${pct}%`;
        // Dim the bar if low
        if (pct <= 10) {
          slot.fill.style.opacity = '1';
          slot.pct.style.color = '#FF5252';
        } else if (pct <= 25) {
          slot.fill.style.opacity = '1';
          slot.pct.style.color = '#FFB300';
        } else {
          slot.fill.style.opacity = '0.85';
          slot.pct.style.color = '#8A8A8E';
        }
      } else {
        slot.fill.style.width = '0%';
        slot.pct.textContent = '—';
        slot.pct.style.color = '#555';
      }
    }
  }
}

customElements.define('typography-printer-card', TypographyPrinterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-printer-card',
  name: 'Typography Printer Card',
  description: 'Compact printer status with CMYK toner bars'
});
