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

class TypographyGraphCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
    }
    this._updateValue();
    this._maybeRefreshHistory();
  }

  setConfig(config) {
    if (!config.series || !config.series.length) throw new Error('Please define series');
    this._config = config;
    this._built = false;
    this._lastFetch = 0;
    this._historyData = null;
  }

  getCardSize() {
    return this._config.show_value !== false ? 6 : 5;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const showValue = this._config.show_value !== false;
    const valueEntity = this._config.value_entity || (this._config.series[0] && this._config.series[0].entity);

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
          padding: 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .header-left {
          display: flex;
          flex-direction: column;
        }
        .title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
        }
        .val-label {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 2px;
        }
        .big-value {
          font-family: var(--font);
          font-size: 2.8rem;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1.1;
          margin-top: 2px;
        }
        .big-unit {
          font-size: 1.2rem;
          font-weight: 300;
          color: #8A8A8E;
        }
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding-top: 4px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .legend-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .legend-name {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          color: #8A8A8E;
        }
        .graph-container {
          position: relative;
        }
        svg {
          width: 100%;
          display: block;
        }
        .grid-line {
          stroke: rgba(255,255,255,0.06);
          stroke-width: 0.5;
        }
        .axis-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 9px;
          font-weight: 300;
          fill: #555;
        }
        .data-line {
          fill: none;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .tooltip-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          cursor: crosshair;
        }
        .tooltip {
          display: none;
          position: absolute;
          background: rgba(30,30,30,0.95);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 10px;
          pointer-events: none;
          z-index: 10;
        }
        .tooltip.visible { display: block; }
        .tooltip-time {
          font-family: var(--font);
          font-size: 0.65rem;
          font-weight: 300;
          color: #8A8A8E;
          margin-bottom: 4px;
        }
        .tooltip-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .tooltip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .tooltip-name {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 400;
          color: #aaa;
        }
        .tooltip-val {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          margin-left: auto;
        }
        .cursor-line {
          display: none;
          position: absolute;
          top: 0;
          width: 1px;
          background: rgba(255,255,255,0.15);
          pointer-events: none;
        }
        .cursor-line.visible { display: block; }
        .loading {
          font-family: var(--font);
          font-size: 0.8rem;
          color: #555;
          text-align: center;
          padding: 40px 0;
        }
      </style>
      <div class="card">
        <div class="header">
          <div class="header-left">
            ${this._config.title ? `<div class="title">${this._config.title}</div>` : ''}
            ${showValue ? `<div class="big-value"><span class="val-num"></span><span class="big-unit"></span></div><div class="val-label"></div>` : ''}
          </div>
          <div class="legend"></div>
        </div>
        <div class="graph-container">
          <div class="loading">Loading...</div>
          <div class="cursor-line"></div>
          <div class="tooltip">
            <div class="tooltip-time"></div>
            <div class="tooltip-rows"></div>
          </div>
          <div class="tooltip-overlay"></div>
        </div>
      </div>
    `;

    // Build legend
    const legend = this.shadowRoot.querySelector('.legend');
    const defaultColors = ['#00E676', '#448AFF', '#FF5252', '#FFB300', '#BB86FC', '#00BCD4', '#FF7043', '#8BC34A'];
    this._config.series.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const color = s.color || defaultColors[i % defaultColors.length];
      item.innerHTML = `<div class="legend-dot" style="background:${color}"></div><span class="legend-name">${s.name || s.entity}</span>`;
      legend.appendChild(item);
    });

    this._bindTooltip();
    this._built = true;
  }

  _updateValue() {
    if (!this._built || !this._hass) return;
    if (this._config.show_value === false) return;

    const valueEntity = this._config.value_entity || (this._config.series[0] && this._config.series[0].entity);
    if (!valueEntity) return;

    const state = this._hass.states[valueEntity];
    if (!state) return;

    const valNum = this.shadowRoot.querySelector('.val-num');
    const valUnit = this.shadowRoot.querySelector('.big-unit');
    const valLabel = this.shadowRoot.querySelector('.val-label');
    if (!valNum) return;

    // Set label from config or entity friendly name
    if (valLabel) {
      const labelText = this._config.value_label || state.attributes.friendly_name || valueEntity;
      valLabel.textContent = labelText;
    }

    const attr = this._config.value_attribute;
    let val = attr ? state.attributes[attr] : state.state;
    const unit = this._config.unit || state.attributes.unit_of_measurement || '';

    if (val !== 'unavailable' && val !== 'unknown' && !isNaN(parseFloat(val))) {
      const num = parseFloat(val);
      valNum.textContent = Number.isInteger(num) ? num : num.toFixed(1);
    } else {
      valNum.textContent = val;
    }
    valUnit.textContent = unit ? ` ${unit}` : '';
  }

  _maybeRefreshHistory() {
    const now = Date.now();
    const interval = (this._config.update_interval || 300) * 1000; // default 5 min
    if (now - this._lastFetch < interval) return;
    this._lastFetch = now;
    this._fetchHistory();
  }

  async _fetchHistory() {
    if (!this._hass) return;

    const span = this._parseSpan(this._config.graph_span || '24h');
    const end = new Date();
    const start = new Date(end.getTime() - span);

    const defaultColors = ['#00E676', '#448AFF', '#FF5252', '#FFB300', '#BB86FC', '#00BCD4', '#FF7043', '#8BC34A'];
    const entityIds = this._config.series.map(s => s.entity);

    try {
      const result = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: entityIds,
        minimal_response: true,
        significant_changes_only: false
      });

      const seriesData = this._config.series.map((s, i) => {
        const entityHistory = result[s.entity] || [];
        const attr = s.attribute;
        const points = [];

        for (const entry of entityHistory) {
          const ts = new Date(entry.lu ? entry.lu * 1000 : entry.last_changed).getTime();
          let val;
          if (attr) {
            val = entry.a ? entry.a[attr] : undefined;
          } else {
            val = entry.s !== undefined ? entry.s : entry.state;
          }
          const num = parseFloat(val);
          if (!isNaN(num) && ts >= start.getTime()) {
            points.push({ t: ts, v: num });
          }
        }

        return {
          name: s.name || s.entity,
          color: s.color || defaultColors[i % defaultColors.length],
          points: points
        };
      });

      this._historyData = {
        series: seriesData,
        start: start.getTime(),
        end: end.getTime()
      };

      this._renderGraph();
    } catch (e) {
      console.error('Typography graph fetch error:', e);
    }
  }

  _renderGraph() {
    if (!this._historyData || !this._built) return;

    const container = this.shadowRoot.querySelector('.graph-container');
    const loading = container.querySelector('.loading');
    if (loading) loading.remove();

    // Remove old SVG
    const oldSvg = container.querySelector('svg');
    if (oldSvg) oldSvg.remove();

    const { series, start, end } = this._historyData;

    // Dimensions
    const width = 600;
    const height = this._config.height || 160;
    const padding = { top: 8, right: 8, bottom: 22, left: 32 };
    const gw = width - padding.left - padding.right;
    const gh = height - padding.top - padding.bottom;

    // Find value range across all series
    let allVals = [];
    for (const s of series) {
      for (const p of s.points) allVals.push(p.v);
    }
    if (allVals.length === 0) return;

    let yMin = this._config.y_min !== undefined ? this._config.y_min : Math.min(...allVals);
    let yMax = this._config.y_max !== undefined ? this._config.y_max : Math.max(...allVals);
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const yPad = (yMax - yMin) * 0.08;
    if (this._config.y_min === undefined) yMin -= yPad;
    if (this._config.y_max === undefined) yMax += yPad;

    const xScale = (t) => padding.left + ((t - start) / (end - start)) * gw;
    const yScale = (v) => padding.top + gh - ((v - yMin) / (yMax - yMin)) * gh;

    // Build SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    // Grid lines (2 horizontal)
    const gridLines = 2;
    for (let i = 0; i <= gridLines; i++) {
      const yVal = yMin + (yMax - yMin) * (i / gridLines);
      const y = yScale(yVal);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('x2', width - padding.right);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'grid-line');
      svg.appendChild(line);

      // Y-axis label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', padding.left - 4);
      label.setAttribute('y', y + 3);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('class', 'axis-label');
      label.textContent = Math.round(yVal);
      svg.appendChild(label);
    }

    // Time labels (bottom)
    const spanMs = end - start;
    const hourMs = 3600000;
    let tickInterval;
    if (spanMs <= 6 * hourMs) tickInterval = 2 * hourMs;
    else if (spanMs <= 24 * hourMs) tickInterval = 8 * hourMs;
    else if (spanMs <= 72 * hourMs) tickInterval = 24 * hourMs;
    else tickInterval = 48 * hourMs;

    const firstTick = Math.ceil(start / tickInterval) * tickInterval;
    for (let t = firstTick; t <= end; t += tickInterval) {
      const x = xScale(t);
      const d = new Date(t);
      let label;
      if (tickInterval >= 24 * hourMs) {
        label = `${d.getMonth() + 1}/${d.getDate()}`;
      } else {
        const h = d.getHours();
        const ampm = h >= 12 ? 'p' : 'a';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        label = `${h12}${ampm}`;
      }

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', height - 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'axis-label');
      text.textContent = label;
      svg.appendChild(text);
    }

    // Data lines
    this._graphMeta = { xScale, yScale, start, end, yMin, yMax, series, padding, gw, gh, width, height };

    for (const s of series) {
      if (s.points.length < 2) continue;

      // Sort by time
      s.points.sort((a, b) => a.t - b.t);

      // Build step-after polyline (more accurate for sensor data)
      let pathD = '';
      for (let i = 0; i < s.points.length; i++) {
        const x = xScale(s.points[i].t);
        const y = yScale(s.points[i].v);
        if (i === 0) {
          pathD += `M ${x} ${y}`;
        } else {
          // Line to this point
          pathD += ` L ${x} ${y}`;
        }
      }
      // Extend last point to now
      const lastY = yScale(s.points[s.points.length - 1].v);
      pathD += ` L ${xScale(end)} ${lastY}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('class', 'data-line');
      path.setAttribute('stroke', s.color);
      svg.appendChild(path);
    }

    // Insert SVG before overlay elements
    const overlay = container.querySelector('.tooltip-overlay');
    container.insertBefore(svg, overlay);

    // Size cursor line
    const cursorLine = container.querySelector('.cursor-line');
    cursorLine.style.height = `${height}px`;
  }

  _bindTooltip() {
    const container = this.shadowRoot.querySelector('.graph-container');
    const overlay = container.querySelector('.tooltip-overlay');
    const tooltip = container.querySelector('.tooltip');
    const cursorLine = container.querySelector('.cursor-line');
    const tooltipTime = tooltip.querySelector('.tooltip-time');
    const tooltipRows = tooltip.querySelector('.tooltip-rows');

    const show = (clientX) => {
      if (!this._graphMeta) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = x / rect.width;
      const { start, end, series, yMin, yMax } = this._graphMeta;
      const t = start + pct * (end - start);

      // Time label
      const d = new Date(t);
      const h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      tooltipTime.textContent = `${h12}:${m} ${ampm}`;

      // Find nearest value for each series
      tooltipRows.innerHTML = '';
      for (const s of series) {
        if (!s.points.length) continue;
        // Binary search for nearest point
        let closest = s.points[0];
        let minDist = Math.abs(s.points[0].t - t);
        for (const p of s.points) {
          const dist = Math.abs(p.t - t);
          if (dist < minDist) { minDist = dist; closest = p; }
        }

        const row = document.createElement('div');
        row.className = 'tooltip-row';
        row.innerHTML = `
          <div class="tooltip-dot" style="background:${s.color}"></div>
          <span class="tooltip-name">${s.name}</span>
          <span class="tooltip-val">${closest.v.toFixed(1)}</span>
        `;
        tooltipRows.appendChild(row);
      }

      // Position tooltip
      cursorLine.style.left = x + 'px';
      cursorLine.classList.add('visible');

      const tooltipW = 140;
      let tx = x + 12;
      if (tx + tooltipW > rect.width) tx = x - tooltipW - 12;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = '8px';
      tooltip.classList.add('visible');
    };

    const hide = () => {
      tooltip.classList.remove('visible');
      cursorLine.classList.remove('visible');
    };

    overlay.addEventListener('pointermove', (e) => show(e.clientX));
    overlay.addEventListener('pointerleave', hide);
    overlay.addEventListener('pointerdown', (e) => {
      overlay.setPointerCapture(e.pointerId);
      show(e.clientX);
    });
    overlay.addEventListener('pointerup', (e) => {
      overlay.releasePointerCapture(e.pointerId);
    });
  }

  _parseSpan(str) {
    const match = str.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 3600000;
    const val = parseInt(match[1]);
    switch (match[2]) {
      case 'h': return val * 3600000;
      case 'd': return val * 86400000;
      case 'w': return val * 7 * 86400000;
      case 'm': return val * 30 * 86400000;
      default: return 24 * 3600000;
    }
  }
}

customElements.define('typography-graph-card', TypographyGraphCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-graph-card',
  name: 'Typography Graph Card',
  description: 'SVG line graph with big typography value display'
});
