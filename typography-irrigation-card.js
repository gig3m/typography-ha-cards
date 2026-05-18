// Typography Irrigation Card v2
// Radix-powered irrigation dashboard — Hydrawise as comms layer only

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

const IRR_STYLES = `
  @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
  @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
  @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
  :host {
    display: block;
    --font: 'Space Grotesk', sans-serif;
    --green: #00E676;
    --blue: #448AFF;
    --amber: #FFB300;
    --red: #FF5252;
    --grey: #555;
    --dim: #8A8A8E;
    --bg: #111;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    background: #000;
    border-radius: 16px;
    padding: 16px;
    font-family: var(--font);
    color: #fff;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-icon { font-size: 1.2rem; }
  .header-title {
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--dim);
  }
  .header-badges {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    font-family: var(--font);
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge.shadow {
    background: rgba(255, 179, 0, 0.15);
    color: var(--amber);
  }
  .badge.active {
    background: rgba(0, 230, 118, 0.15);
    color: var(--green);
  }
  .badge.idle {
    background: rgba(138, 138, 142, 0.15);
    color: var(--dim);
  }

  /* Summary stats */
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat {
    background: var(--bg);
    border-radius: 10px;
    padding: 10px 8px;
    text-align: center;
  }
  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.1;
  }
  .stat-unit {
    font-size: 0.65rem;
    font-weight: 300;
    color: var(--dim);
    margin-left: 1px;
  }
  .stat-label {
    font-size: 0.6rem;
    font-weight: 400;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 3px;
  }

  /* Section labels */
  .section-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 14px 0 6px;
  }

  /* Zone rows */
  .zones { display: flex; flex-direction: column; gap: 3px; }
  .zone {
    display: grid;
    grid-template-columns: 8px 1fr auto auto auto;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    background: var(--bg);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;
  }
  .zone:active { background: #1a1a1a; }
  .zone.running {
    background: rgba(0, 230, 118, 0.08);
    border: 1px solid rgba(0, 230, 118, 0.2);
  }
  .zone.needs-water {
    background: rgba(68, 138, 255, 0.06);
  }
  .zone-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .zone-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .zone-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .zone-detail {
    font-size: 0.65rem;
    font-weight: 400;
    color: var(--dim);
  }
  .zone-deficit {
    text-align: right;
    min-width: 44px;
  }
  .zone-deficit-value {
    font-size: 0.85rem;
    font-weight: 700;
  }
  .zone-deficit-label {
    font-size: 0.55rem;
    color: var(--dim);
    text-transform: uppercase;
  }
  .zone-next {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--dim);
    text-align: right;
    white-space: nowrap;
    min-width: 50px;
  }
  .zone-actions {
    display: flex;
    gap: 3px;
  }
  .zone-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: #222;
    color: #fff;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, transform 0.1s;
  }
  .zone-btn:active { transform: scale(0.9); }
  .zone-btn.run { background: rgba(0, 230, 118, 0.15); color: var(--green); }
  .zone-btn.stop { background: rgba(255, 82, 82, 0.15); color: var(--red); }
  .zone-btn.suspend { background: rgba(255, 179, 0, 0.12); color: var(--amber); }
  .zone-btn.suspended { background: rgba(255, 179, 0, 0.3); color: var(--amber); }

  /* Deficit bar */
  .deficit-bar {
    width: 100%;
    height: 3px;
    background: #222;
    border-radius: 2px;
    margin-top: 3px;
    overflow: hidden;
  }
  .deficit-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  /* Quick actions */
  .quick-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
  .action-btn {
    flex: 1;
    padding: 9px;
    border: none;
    border-radius: 8px;
    font-family: var(--font);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s, transform 0.1s;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .action-btn:active { transform: scale(0.97); }
  .action-btn.stop-all { background: rgba(255, 82, 82, 0.15); color: var(--red); }
  .action-btn.suspend-all { background: rgba(255, 179, 0, 0.15); color: var(--amber); }
  .action-btn.flash { opacity: 0.5; }
`;

class TypographyIrrigationCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  setConfig(config) {
    if (!config.zones) throw new Error('Please define zones');
    this._config = config;
  }

  getCardSize() { return 8; }

  _getState(entityId) {
    const s = this._hass.states[entityId];
    return s ? s.state : 'unknown';
  }

  _getNumeric(entityId) {
    const v = parseFloat(this._getState(entityId));
    return isNaN(v) ? null : v;
  }

  _deficitColor(pct) {
    if (pct === null || pct <= 20) return 'var(--green)';
    if (pct <= 40) return 'var(--amber)';
    if (pct <= 60) return '#FF9100';
    return 'var(--red)';
  }

  _formatNextCycle(val) {
    if (!val || val === 'unknown' || val === 'unavailable' || val === 'None') return '—';
    // Could be ISO date or relative string from Radix
    const d = new Date(val);
    if (isNaN(d.getTime())) return val; // Already a label from Radix
    const now = new Date();
    const diffMs = d - now;
    if (diffMs < 0) return 'Due';
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    if (diffD > 1) return `${diffD}d`;
    if (diffH > 0) return `${diffH}h`;
    return `${Math.floor(diffMs / (1000 * 60))}m`;
  }

  async _runZone(runSwitchId) {
    await this._hass.callService('switch', 'turn_on', {}, { entity_id: runSwitchId });
  }

  async _stopZone(runSwitchId) {
    await this._hass.callService('switch', 'turn_off', {}, { entity_id: runSwitchId });
  }

  async _stopAll() {
    await this._hass.callService('button', 'press', {}, { entity_id: 'button.radix_stop_all_zones' });
  }

  async _suspendZone(binarySensorId, days) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const untilStr = until.toISOString().slice(0, 19).replace('T', ' ');
    await this._hass.callService('hydrawise', 'suspend', { until: untilStr }, { entity_id: binarySensorId });
  }

  async _resumeZone(binarySensorId) {
    await this._hass.callService('hydrawise', 'resume', {}, { entity_id: binarySensorId });
  }

  _render() {
    const hass = this._hass;
    if (!hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    // Global Radix sensors
    const et0 = this._getNumeric('sensor.radix_et0_today');
    const solar = this._getNumeric('sensor.radix_solar_radiation');
    const shadowMode = this._getState('sensor.radix_shadow_mode');
    const zonesNeeding = this._getState('sensor.radix_zones_needing_water');
    const rainToday = this._getNumeric(this._config.rain_today || 'sensor.arrington_home_rain_today');
    const rainMonth = this._getNumeric(this._config.rain_month || 'sensor.arrington_home_rain_this_month');

    // Build zone data
    const zones = this._config.zones.map(z => {
      const radixPrefix = `sensor.radix_${z.radix_id}`;
      const deficit = this._getNumeric(`${radixPrefix}_moisture_deficit`);
      const deficitMm = this._getNumeric(`${radixPrefix}_deficit_mm`);
      const soilVwc = this._getNumeric(`${radixPrefix}_soil_vwc`);
      const status = this._getState(`${radixPrefix}_status`);
      const lastDecision = this._getState(`${radixPrefix}_last_decision`);
      const nextRun = this._getState(`${radixPrefix}_next_run`);
      const vegType = this._getState(`${radixPrefix}_vegetation_type`);

      // Valve status — check Radix run switch first, fall back to Hydrawise
      const runSwitch = hass.states[z.run_switch];
      const isRunning = (runSwitch && runSwitch.state === 'on') ||
        (hass.states[z.watering_entity] && hass.states[z.watering_entity].state === 'on');
      const isSuspended = hass.states[z.auto_switch] && hass.states[z.auto_switch].state === 'off';
      const hydrawiseNext = hass.states[z.next_cycle_entity] ? hass.states[z.next_cycle_entity].state : null;

      return {
        ...z, deficit, deficitMm, soilVwc, status, lastDecision, nextRun, vegType,
        isRunning, isSuspended, hydrawiseNext
      };
    });

    const anyRunning = zones.some(z => z.isRunning);
    const runningCount = zones.filter(z => z.isRunning).length;
    const isShadow = shadowMode === 'ON' || shadowMode === 'on' || shadowMode === 'true';

    // Group zones
    const groups = {};
    for (const z of zones) {
      const g = z.group || 'Zones';
      if (!groups[g]) groups[g] = [];
      groups[g].push(z);
    }

    // Render zone rows
    const zoneRows = Object.entries(groups).map(([group, gzones]) => {
      const rows = gzones.map(z => {
        const dotColor = z.isRunning ? 'var(--green)' :
          (z.status === 'needs_water' ? 'var(--blue)' :
          (z.isSuspended ? 'var(--amber)' : 'var(--grey)'));
        const dotShadow = z.isRunning ? '0 0 6px var(--green)' : 'none';

        const defColor = this._deficitColor(z.deficit);
        const defDisplay = z.deficit !== null ? z.deficit.toFixed(0) : '—';

        // Detail line: status + last decision from Radix
        let detailText = z.status !== 'unknown' ? z.status : 'idle';
        if (z.lastDecision && z.lastDecision !== 'unknown') {
          detailText = z.lastDecision;
        }
        if (z.vegType && z.vegType !== 'unknown') {
          detailText += ` · ${z.vegType}`;
        }

        // Next run: prefer Radix, fall back to Hydrawise
        const nextDisplay = (z.nextRun && z.nextRun !== 'unknown' && z.nextRun !== 'None')
          ? this._formatNextCycle(z.nextRun)
          : this._formatNextCycle(z.hydrawiseNext);

        const zoneClass = z.isRunning ? 'zone running' :
          (z.status === 'needs_water' ? 'zone needs-water' : 'zone');

        // Deficit bar
        const barWidth = z.deficit !== null ? Math.min(z.deficit, 100) : 0;

        const runBtn = z.isRunning
          ? `<button class="zone-btn stop" data-action="stop" data-zone="${z.name}" title="Stop">◼</button>`
          : `<button class="zone-btn run" data-action="run" data-zone="${z.name}" title="Run 10min">▶</button>`;

        return `
          <div class="${zoneClass}" data-entity="${z.watering_entity}">
            <div class="zone-dot" style="background:${dotColor};box-shadow:${dotShadow}"></div>
            <div class="zone-info">
              <div class="zone-name">${z.name}</div>
              <div class="zone-detail">${detailText}</div>
              <div class="deficit-bar"><div class="deficit-fill" style="width:${barWidth}%;background:${defColor}"></div></div>
            </div>
            <div class="zone-deficit">
              <div class="zone-deficit-value" style="color:${defColor}">${defDisplay}<span style="font-size:0.55rem;color:var(--dim)">%</span></div>
              <div class="zone-deficit-label">deficit</div>
            </div>
            <div class="zone-next">${nextDisplay}</div>
            <div class="zone-actions">${runBtn}</div>
          </div>
        `;
      }).join('');

      return `<div class="section-label">${group}</div><div class="zones">${rows}</div>`;
    }).join('');

    // Status badges
    let badges = '';
    if (isShadow) badges += '<span class="badge shadow">Shadow</span>';
    if (anyRunning) badges += `<span class="badge active">${runningCount} Running</span>`;
    if (!anyRunning && !isShadow) badges += '<span class="badge idle">Idle</span>';

    this.shadowRoot.innerHTML = `
      <style>${IRR_STYLES}</style>
      <div class="card">
        <div class="header">
          <div class="header-left">
            <span class="header-icon">💧</span>
            <span class="header-title">Radix</span>
          </div>
          <div class="header-badges">${badges}</div>
        </div>

        <div class="summary">
          <div class="stat">
            <div class="stat-value" style="color:var(--green)">${et0 !== null ? et0.toFixed(1) : '—'}<span class="stat-unit">mm</span></div>
            <div class="stat-label">ET₀ Today</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:var(--amber)">${solar !== null ? Math.round(solar) : '—'}<span class="stat-unit">W/m²</span></div>
            <div class="stat-label">Solar</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:var(--blue)">${rainToday !== null ? rainToday : '—'}<span class="stat-unit">in</span></div>
            <div class="stat-label">Rain Today</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:var(--blue)">${rainMonth !== null ? rainMonth : '—'}<span class="stat-unit">in</span></div>
            <div class="stat-label">Rain / Month</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:${zonesNeeding !== '0' && zonesNeeding !== 'unknown' ? 'var(--amber)' : 'var(--green)'}">${zonesNeeding !== 'unknown' ? zonesNeeding : '—'}</div>
            <div class="stat-label">Need Water</div>
          </div>
        </div>

        ${zoneRows}

        <div class="quick-actions">
          <button class="action-btn stop-all" data-action="stop-all">Stop All Zones</button>
        </div>
      </div>
    `;

    // Bind events
    this.shadowRoot.querySelectorAll('.zone-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const zoneName = btn.dataset.zone;
        const zone = this._config.zones.find(z => z.name === zoneName);
        if (!zone) return;
        btn.style.transform = 'scale(0.8)';
        setTimeout(() => btn.style.transform = '', 200);
        if (action === 'run') this._runZone(zone.run_switch);
        else if (action === 'stop') this._stopZone(zone.run_switch);
      });
    });

    this.shadowRoot.querySelectorAll('.zone').forEach(el => {
      el.addEventListener('click', () => {
        const evt = new Event('hass-more-info', { bubbles: true, composed: true });
        evt.detail = { entityId: el.dataset.entity };
        this.dispatchEvent(evt);
      });
    });

    this.shadowRoot.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 600);
        if (action === 'stop-all') {
          this._stopAll();
        }
      });
    });
  }
}

customElements.define('typography-irrigation-card', TypographyIrrigationCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-irrigation-card',
  name: 'Typography Irrigation Card',
  description: 'Radix-powered irrigation dashboard with zone controls'
});
