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

class TypographySparklineCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
    }
    this._updateValues();
    this._maybeRefreshHistory();
  }

  setConfig(config) {
    if (!config.lines || !config.lines.length) throw new Error('Please define lines');
    this._config = config;
    this._built = false;
    this._lastFetch = 0;
    this._historyData = null;
  }

  getCardSize() {
    return Math.max(1, Math.ceil((this._config ? this._config.lines.length : 1) * 0.8));
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const lines = this._config.lines;
    const compact = this._config.compact !== false;

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
          padding: ${compact ? '12px 16px' : '16px 18px'};
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: ${compact ? '8px' : '12px'};
        }
        .card-icon { font-size: 0.85rem; }
        .card-title {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .lines {
          display: flex;
          flex-direction: column;
          gap: ${compact ? '6px' : '10px'};
        }
        .line {
          display: grid;
          grid-template-columns: 90px 1fr 50px;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .line:active { opacity: 0.7; }
        .line-name {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #8A8A8E;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spark-container {
          height: 20px;
          position: relative;
        }
        .spark-container svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .line-value {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 700;
          text-align: right;
          white-space: nowrap;
        }
        .line-unit {
          font-weight: 300;
          font-size: 0.65rem;
          color: #8A8A8E;
        }
      </style>
      <div class="card">
        ${this._config.title ? `
        <div class="card-header">
          ${this._config.icon ? `<span class="card-icon">${this._config.icon}</span>` : ''}
          <span class="card-title">${this._config.title}</span>
        </div>` : ''}
        <div class="lines">
          ${lines.map((l, i) => `
            <div class="line" data-entity="${l.entity}" data-idx="${i}">
              <div class="line-name">${l.name || l.entity}</div>
              <div class="spark-container" id="spark-${i}">
                <svg viewBox="0 0 200 20" preserveAspectRatio="none"></svg>
              </div>
              <div class="line-value" id="val-${i}">—</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.shadowRoot.querySelectorAll('.line').forEach(el => {
      el.addEventListener('click', () => {
        const evt = new Event('hass-more-info', { bubbles: true, composed: true });
        evt.detail = { entityId: el.dataset.entity };
        this.dispatchEvent(evt);
      });
    });

    this._built = true;
  }

  _updateValues() {
    if (!this._built || !this._hass) return;
    const lines = this._config.lines;
    lines.forEach((l, i) => {
      const state = this._hass.states[l.entity];
      if (!state) return;
      const val = parseFloat(state.state);
      const el = this.shadowRoot.getElementById(`val-${i}`);
      if (!el || isNaN(val)) return;
      const unit = l.unit || state.attributes.unit_of_measurement || '';
      const color = this._getColor(val, l);
      el.innerHTML = `<span style="color:${color}">${Math.round(val)}</span> <span class="line-unit">${unit}</span>`;
    });
  }

  _getColor(val, line) {
    const thresholds = line.thresholds || this._config.thresholds || [
      { value: 0, color: '#00E676' },
      { value: 15, color: '#FFB300' },
      { value: 30, color: '#FF5252' }
    ];
    let color = thresholds[0].color;
    for (const t of thresholds) {
      if (val >= t.value) color = t.color;
    }
    return color;
  }

  _maybeRefreshHistory() {
    const now = Date.now();
    const interval = (this._config.update_interval || 300) * 1000;
    if (now - this._lastFetch < interval) return;
    this._lastFetch = now;
    this._fetchHistory();
  }

  async _fetchHistory() {
    if (!this._hass) return;

    const span = this._parseSpan(this._config.graph_span || '24h');
    const end = new Date();
    const start = new Date(end.getTime() - span);
    const entityIds = this._config.lines.map(l => l.entity);

    try {
      const result = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: entityIds,
        minimal_response: true,
        significant_changes_only: false
      });

      this._config.lines.forEach((l, i) => {
        const history = result[l.entity] || [];
        const points = [];
        for (const entry of history) {
          const ts = new Date(entry.lu ? entry.lu * 1000 : entry.last_changed).getTime();
          const val = parseFloat(entry.s !== undefined ? entry.s : entry.state);
          if (!isNaN(val) && ts >= start.getTime()) {
            points.push({ t: ts, v: val });
          }
        }
        this._renderSparkline(i, points, start.getTime(), end.getTime(), l);
      });
    } catch (e) {
      console.error('Typography sparkline fetch error:', e);
    }
  }

  _renderSparkline(idx, points, startMs, endMs, line) {
    const container = this.shadowRoot.getElementById(`spark-${idx}`);
    if (!container || !points.length) return;

    const svg = container.querySelector('svg');
    const w = 200;
    const h = 20;
    const pad = 1;

    // Determine Y range
    const values = points.map(p => p.v);
    const yMin = line.y_min !== undefined ? line.y_min : 0;
    const yMax = line.y_max !== undefined ? line.y_max : Math.max(...values, 1) * 1.2;
    const yRange = yMax - yMin || 1;
    const tRange = endMs - startMs || 1;

    // Build path points
    const coords = points.map(p => {
      const x = ((p.t - startMs) / tRange) * w;
      const y = h - pad - ((p.v - yMin) / yRange) * (h - pad * 2);
      return { x: Math.max(0, Math.min(w, x)), y: Math.max(pad, Math.min(h - pad, y)) };
    });

    if (coords.length < 2) return;

    // Smooth the path
    const pathD = this._smoothPath(coords);

    // Get color from current value
    const currentVal = points[points.length - 1].v;
    const color = this._getColor(currentVal, line);

    // Fill path (close to bottom)
    const fillD = pathD + ` L ${coords[coords.length - 1].x},${h} L ${coords[0].x},${h} Z`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="grad-${idx}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${fillD}" fill="url(#grad-${idx})" />
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    `;
  }

  _smoothPath(coords) {
    if (coords.length < 2) return '';
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  }

  _parseSpan(span) {
    const match = span.match(/^(\d+)(h|d|m|w)$/);
    if (!match) return 86400000;
    const val = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    return val * (multipliers[unit] || 3600000);
  }
}

customElements.define('typography-sparkline-card', TypographySparklineCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-sparkline-card',
  name: 'Typography Sparkline Card',
  description: 'Compact inline sparklines with current values'
});
