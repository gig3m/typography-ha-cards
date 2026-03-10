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

class TypographyStatuspageCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
    }
    this._updateCurrentState();
    this._maybeRefreshHistory();
  }

  setConfig(config) {
    if (!config.services || !config.services.length) throw new Error('Please define services');
    this._config = config;
    this._built = false;
    this._lastFetch = 0;
    this._historyData = null;
  }

  getCardSize() {
    return 2 + (this._config ? this._config.services.length : 3);
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const days = this._config.days || 30;
    const services = this._config.services;

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
          margin-bottom: 16px;
        }
        .card-icon { font-size: 1rem; }
        .card-title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #00E676;
          margin-left: auto;
        }
        .summary.degraded { color: #FFB300; }
        .summary.down { color: #FF5252; }
        .service {
          display: grid;
          grid-template-columns: 100px 1fr 52px;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .service:active { opacity: 0.7; }
        .service-name {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #CCCCCC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bar-container {
          display: flex;
          gap: 1.5px;
          height: 24px;
          align-items: stretch;
        }
        .day-segment {
          flex: 1;
          border-radius: 2px;
          min-width: 0;
          position: relative;
          transition: opacity 0.15s;
        }
        .day-segment:hover {
          opacity: 0.75;
        }
        .uptime-pct {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 700;
          color: #FFFFFF;
          text-align: right;
          white-space: nowrap;
        }
        .uptime-pct.perfect { color: #00E676; }
        .uptime-pct.good { color: #00E676; }
        .uptime-pct.warn { color: #FFB300; }
        .uptime-pct.bad { color: #FF5252; }
        .days-label {
          display: flex;
          justify-content: space-between;
          padding: 4px 0 0;
          margin-left: 110px;
          margin-right: 52px;
        }
        .days-label span {
          font-family: var(--font);
          font-size: 0.6rem;
          font-weight: 300;
          color: #555;
        }
        .tooltip {
          display: none;
          position: fixed;
          background: rgba(30,30,30,0.95);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 6px 10px;
          pointer-events: none;
          z-index: 999;
          white-space: nowrap;
        }
        .tooltip.visible { display: block; }
        .tooltip-date {
          font-family: var(--font);
          font-size: 0.65rem;
          font-weight: 300;
          color: #8A8A8E;
        }
        .tooltip-status {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 700;
          margin-top: 2px;
        }
      </style>
      <div class="card">
        <div class="card-header">
          ${this._config.icon ? `<span class="card-icon">${this._config.icon}</span>` : ''}
          <span class="card-title">${this._config.title || 'Status'}</span>
          <span class="summary" id="summary"></span>
        </div>
        <div class="services" id="services">
          ${services.map((s, i) => `
            <div class="service" data-entity="${s.entity}" data-idx="${i}">
              <div class="service-name">${s.name || s.entity}</div>
              <div class="bar-container" id="bar-${i}">
                ${Array.from({length: days}, (_, d) => `<div class="day-segment" data-day="${d}" style="background: #1A1A1A;"></div>`).join('')}
              </div>
              <div class="uptime-pct" id="pct-${i}">—</div>
            </div>
          `).join('')}
        </div>
        <div class="days-label">
          <span>${days}d ago</span>
          <span>Today</span>
        </div>
      </div>
      <div class="tooltip" id="tooltip">
        <div class="tooltip-date" id="tip-date"></div>
        <div class="tooltip-status" id="tip-status"></div>
      </div>
    `;

    // Click to open more-info
    this.shadowRoot.querySelectorAll('.service').forEach(el => {
      el.addEventListener('click', () => {
        const evt = new Event('hass-more-info', { bubbles: true, composed: true });
        evt.detail = { entityId: el.dataset.entity };
        this.dispatchEvent(evt);
      });
    });

    // Hover tooltips on day segments
    const tooltip = this.shadowRoot.getElementById('tooltip');
    const tipDate = this.shadowRoot.getElementById('tip-date');
    const tipStatus = this.shadowRoot.getElementById('tip-status');

    this.shadowRoot.querySelectorAll('.day-segment').forEach(seg => {
      seg.addEventListener('mouseenter', (e) => {
        const dayIdx = parseInt(seg.dataset.day);
        const date = new Date();
        date.setHours(0,0,0,0);
        date.setDate(date.getDate() - (this._config.days || 30) + 1 + dayIdx);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const upPct = seg.dataset.uptime;
        tipDate.textContent = dateStr;
        if (upPct !== undefined && upPct !== 'null') {
          const pct = parseFloat(upPct);
          tipStatus.textContent = pct.toFixed(1) + '% uptime';
          tipStatus.style.color = pct >= 99.5 ? '#00E676' : pct >= 95 ? '#FFB300' : '#FF5252';
        } else {
          tipStatus.textContent = 'No data';
          tipStatus.style.color = '#555';
        }
        tooltip.classList.add('visible');
      });
      seg.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 40) + 'px';
      });
      seg.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });

    this._built = true;
  }

  _updateCurrentState() {
    if (!this._built || !this._hass) return;

    const services = this._config.services;
    let allUp = true;
    let anyDown = false;

    services.forEach((s, i) => {
      // Update uptime % from the uptime entity if provided
      if (s.uptime_entity) {
        const uptimeState = this._hass.states[s.uptime_entity];
        if (uptimeState) {
          const pct = parseFloat(uptimeState.state);
          const el = this.shadowRoot.getElementById(`pct-${i}`);
          if (el && !isNaN(pct)) {
            el.textContent = pct >= 99.95 ? '100%' : pct.toFixed(1) + '%';
            el.className = 'uptime-pct ' + (pct >= 99.5 ? 'perfect' : pct >= 98 ? 'good' : pct >= 95 ? 'warn' : 'bad');
          }
        }
      }

      // Track overall status
      const state = this._hass.states[s.entity];
      if (state) {
        const v = state.state.toLowerCase();
        if (v !== 'up' && v !== 'on' && v !== 'running') {
          allUp = false;
          if (v === 'down' || v === 'off') anyDown = true;
        }
      }
    });

    const summary = this.shadowRoot.getElementById('summary');
    if (summary) {
      if (allUp) {
        summary.textContent = 'All Operational';
        summary.className = 'summary';
      } else if (anyDown) {
        summary.textContent = 'Outage Detected';
        summary.className = 'summary down';
      } else {
        summary.textContent = 'Degraded';
        summary.className = 'summary degraded';
      }
    }
  }

  _maybeRefreshHistory() {
    const now = Date.now();
    const interval = (this._config.update_interval || 600) * 1000; // default 10 min
    if (now - this._lastFetch < interval) return;
    this._lastFetch = now;
    this._fetchHistory();
  }

  async _fetchHistory() {
    if (!this._hass) return;

    const days = this._config.days || 30;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const entityIds = this._config.services.map(s => s.entity);

    try {
      const result = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: entityIds,
        minimal_response: true,
        significant_changes_only: false
      });

      // Process history into day buckets per service
      this._config.services.forEach((s, sIdx) => {
        const history = result[s.entity] || [];
        const dayBuckets = this._bucketByDay(history, start, days);

        dayBuckets.forEach((bucket, dayIdx) => {
          const seg = this.shadowRoot.querySelector(`#bar-${sIdx} .day-segment[data-day="${dayIdx}"]`);
          if (!seg) return;

          if (bucket.total === 0) {
            seg.style.background = '#1A1A1A';
            seg.dataset.uptime = null;
          } else {
            const upPct = (bucket.up / bucket.total) * 100;
            seg.dataset.uptime = upPct;
            if (upPct >= 99.5) {
              seg.style.background = '#00E676';
            } else if (upPct >= 95) {
              seg.style.background = '#FFB300';
            } else if (upPct > 0) {
              seg.style.background = '#FF5252';
            } else {
              seg.style.background = '#FF5252';
            }
          }
        });

        // Calculate overall uptime % from history if no uptime_entity
        if (!s.uptime_entity) {
          let totalTime = 0;
          let upTime = 0;
          dayBuckets.forEach(b => { totalTime += b.total; upTime += b.up; });
          const el = this.shadowRoot.getElementById(`pct-${sIdx}`);
          if (el && totalTime > 0) {
            const pct = (upTime / totalTime) * 100;
            el.textContent = pct >= 99.95 ? '100%' : pct.toFixed(1) + '%';
            el.className = 'uptime-pct ' + (pct >= 99.5 ? 'perfect' : pct >= 98 ? 'good' : pct >= 95 ? 'warn' : 'bad');
          }
        }
      });
    } catch (e) {
      console.error('Typography statuspage fetch error:', e);
    }
  }

  _bucketByDay(history, start, days) {
    const buckets = Array.from({length: days}, () => ({ up: 0, total: 0 }));
    const startMs = start.getTime();
    const dayMs = 86400000;

    if (!history.length) return buckets;

    // Build state timeline: [{time, state}, ...]
    const timeline = history.map(entry => ({
      time: new Date(entry.lu ? entry.lu * 1000 : entry.last_changed).getTime(),
      state: (entry.s !== undefined ? entry.s : entry.state || '').toLowerCase()
    })).sort((a, b) => a.time - b.time);

    // For each day, calculate time spent in "up" states
    for (let d = 0; d < days; d++) {
      const dayStart = startMs + d * dayMs;
      const dayEnd = dayStart + dayMs;
      const now = Date.now();
      const effectiveEnd = Math.min(dayEnd, now);
      if (dayStart > now) break;

      // Find the state at dayStart (last state before dayStart)
      let currentState = null;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (timeline[i].time <= dayStart) {
          currentState = timeline[i].state;
          break;
        }
      }

      // Walk through state changes within this day
      let cursor = dayStart;
      for (const entry of timeline) {
        if (entry.time <= dayStart) continue;
        if (entry.time >= effectiveEnd) break;

        const duration = entry.time - cursor;
        if (duration > 0 && currentState !== null) {
          buckets[d].total += duration;
          if (this._isUp(currentState)) buckets[d].up += duration;
        }
        currentState = entry.state;
        cursor = entry.time;
      }

      // Fill remaining time in day
      const remaining = effectiveEnd - cursor;
      if (remaining > 0 && currentState !== null) {
        buckets[d].total += remaining;
        if (this._isUp(currentState)) buckets[d].up += remaining;
      }
    }

    return buckets;
  }

  _isUp(state) {
    return state === 'up' || state === 'on' || state === 'running' || state === 'connected' || state === 'home';
  }
}

customElements.define('typography-statuspage-card', TypographyStatuspageCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-statuspage-card',
  name: 'Typography Status Page Card',
  description: 'Uptime history bars inspired by statuspage.io'
});
