// Typography Container Card v1
// Compact container status list with status dot, name, CPU%, and memory

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

class TypographyContainerCard extends HTMLElement {
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
    if (!config.containers || !config.containers.length) throw new Error('Please define containers');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return Math.max(2, Math.ceil((this._config.containers.length) / 2) + 1);
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const cols = this._config.columns || 1;

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
          margin-bottom: 12px;
        }
        .card-icon { font-size: 1.1rem; }
        .card-title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .card-summary {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          color: #00E676;
          margin-left: auto;
        }
        .card-summary.warn { color: #FFB300; }
        .card-summary.bad { color: #FF5252; }
        .container-grid {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: ${cols > 1 ? '2px 16px' : '2px 0'};
        }
        .row {
          display: grid;
          grid-template-columns: 8px 1fr 48px 56px;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .row:hover { background: rgba(255,255,255,0.02); border-radius: 4px; }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          justify-self: center;
        }
        .name {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #CCCCCC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cpu {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 700;
          color: #8A8A8E;
          text-align: right;
        }
        .mem {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 300;
          color: #555;
          text-align: right;
        }
        .col-headers {
          display: grid;
          grid-template-columns: 8px 1fr 48px 56px;
          gap: 8px;
          padding: 0 0 4px;
          margin-bottom: 2px;
        }
        .col-header {
          font-family: var(--font);
          font-size: 0.55rem;
          font-weight: 300;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .col-header.right { text-align: right; }
        .row.stopped .name { color: #555; }
      </style>
      <div class="card">
        ${this._config.title || this._config.icon ? `
          <div class="card-header">
            ${this._config.icon ? `<span class="card-icon">${this._config.icon}</span>` : ''}
            ${this._config.title ? `<span class="card-title">${this._config.title}</span>` : ''}
            <span class="card-summary" id="summary"></span>
          </div>
        ` : ''}
        <div class="col-headers">
          <span class="col-header"></span>
          <span class="col-header"></span>
          <span class="col-header right">CPU</span>
          <span class="col-header right">MEM</span>
        </div>
        <div class="container-grid" id="grid"></div>
      </div>
    `;

    const grid = this.shadowRoot.getElementById('grid');
    this._slots = {};

    for (const c of this._config.containers) {
      const prefix = c.prefix;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <span class="dot"></span>
        <span class="name">${c.name || prefix}</span>
        <span class="cpu"></span>
        <span class="mem"></span>
      `;

      row.addEventListener('click', () => {
        const evt = new Event('hass-more-info', { bubbles: true, composed: true });
        evt.detail = { entityId: `sensor.${prefix}_state` };
        this.dispatchEvent(evt);
      });

      grid.appendChild(row);

      this._slots[prefix] = {
        el: row,
        dot: row.querySelector('.dot'),
        nameEl: row.querySelector('.name'),
        cpuEl: row.querySelector('.cpu'),
        memEl: row.querySelector('.mem'),
        config: c
      };
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    let running = 0;
    let total = 0;

    for (const c of this._config.containers) {
      const slot = this._slots[c.prefix];
      if (!slot) continue;
      total++;

      const stateEntity = this._hass.states[`sensor.${c.prefix}_state`];
      const cpuEntity = this._hass.states[`sensor.${c.prefix}_cpu_usage_total`];
      const memEntity = this._hass.states[`sensor.${c.prefix}_memory_usage`];

      // State + dot
      const state = stateEntity ? stateEntity.state : 'unknown';
      const isRunning = state === 'running';
      if (isRunning) running++;

      const dotColor = isRunning ? '#00E676' : state === 'exited' ? '#FF5252' : '#555';
      slot.dot.style.background = dotColor;
      slot.dot.style.boxShadow = isRunning ? `0 0 4px ${dotColor}60` : 'none';
      slot.el.className = isRunning ? 'row' : 'row stopped';

      // CPU
      if (cpuEntity && cpuEntity.state !== 'unavailable' && cpuEntity.state !== 'unknown') {
        const cpu = parseFloat(cpuEntity.state);
        slot.cpuEl.textContent = cpu < 0.1 ? '<0.1%' : cpu.toFixed(1) + '%';
        slot.cpuEl.style.color = cpu > 80 ? '#FF5252' : cpu > 50 ? '#FFB300' : '#8A8A8E';
      } else {
        slot.cpuEl.textContent = '—';
        slot.cpuEl.style.color = '#555';
      }

      // Memory (in MB)
      if (memEntity && memEntity.state !== 'unavailable' && memEntity.state !== 'unknown') {
        const mem = parseFloat(memEntity.state);
        if (mem >= 1024) {
          slot.memEl.textContent = (mem / 1024).toFixed(1) + ' GB';
        } else {
          slot.memEl.textContent = Math.round(mem) + ' MB';
        }
      } else {
        slot.memEl.textContent = '—';
      }
    }

    // Summary
    const summary = this.shadowRoot.getElementById('summary');
    if (summary) {
      summary.textContent = `${running}/${total}`;
      summary.className = 'card-summary' + (running < total ? (running === 0 ? ' bad' : ' warn') : '');
    }
  }
}

customElements.define('typography-container-card', TypographyContainerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-container-card',
  name: 'Typography Container Card',
  description: 'Compact container status list with CPU and memory'
});
