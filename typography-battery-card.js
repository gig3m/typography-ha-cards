// Typography Battery Card v2 - Sorted battery levels with color bars
if (!document.querySelector('#typo-fonts')) {
  const style = document.createElement('style');
  style.id = 'typo-fonts';
  style.textContent = "\n    @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }\n  ";
  document.head.appendChild(style);
}

class TypographyBatteryCard extends HTMLElement {
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
    if (!config.entities || !config.entities.length) throw new Error('Please define entities');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    if (!this._config || !this._config.entities) return 4;
    return 2 + Math.ceil(this._config.entities.length / 2);
  }

  _levelColor(level) {
    if (level <= 10) return '#FF5252';
    if (level <= 25) return '#FF9100';
    if (level <= 50) return '#FFB300';
    if (level <= 75) return '#69F0AE';
    return '#00E676';
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    var title = this._config.title || 'BATTERIES';
    var icon = this._config.icon || '🔋';

    this.shadowRoot.innerHTML = '<style>\n' +
      "@font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }\n" +
      "@font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }\n" +
      "@font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }\n" +
      ":host { display: block; --font: 'Space Grotesk', sans-serif; }\n" +
      ".card { padding: 18px; border-radius: 14px; background: rgba(255,255,255,0.03); }\n" +
      ".header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }\n" +
      ".card-icon { font-size: 1.3rem; }\n" +
      ".card-title { font-family: var(--font); font-size: 0.85rem; font-weight: 400; color: #8A8A8E; text-transform: uppercase; letter-spacing: 0.05em; }\n" +
      ".summary { display: flex; gap: 16px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-family: var(--font); font-size: 0.75rem; }\n" +
      ".summary-count { font-weight: 700; font-size: 1.1rem; margin-right: 4px; }\n" +
      ".battery-list { display: flex; flex-direction: column; gap: 8px; }\n" +
      ".battery-item { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 0; -webkit-tap-highlight-color: transparent; }\n" +
      ".battery-item:active { opacity: 0.7; }\n" +
      ".bar-wrap { flex: 1; min-width: 0; }\n" +
      ".battery-name { font-family: var(--font); font-size: 0.7rem; font-weight: 400; color: #8A8A8E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }\n" +
      ".bar-bg { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; }\n" +
      ".bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }\n" +
      ".battery-pct { font-family: var(--font); font-size: 0.85rem; font-weight: 700; min-width: 36px; text-align: right; }\n" +
      '</style>\n' +
      '<div class="card">' +
      '<div class="header"><span class="card-icon">' + icon + '</span><span class="card-title">' + title + '</span></div>' +
      '<div class="summary" id="summary"></div>' +
      '<div class="battery-list" id="list"></div>' +
      '</div>';

    this._summaryEl = this.shadowRoot.getElementById('summary');
    this._listEl = this.shadowRoot.getElementById('list');
    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    var batteries = [];
    for (var i = 0; i < this._config.entities.length; i++) {
      var ent = this._config.entities[i];
      var state = this._hass.states[ent.entity];
      if (!state) continue;
      var val = parseFloat(state.state);
      var name = ent.name || state.attributes.friendly_name || ent.entity;
      if (!isNaN(val) && val >= 0 && val <= 100) {
        batteries.push({ name: name, level: val, entity: ent.entity });
      }
    }

    batteries.sort(function(a, b) { return a.level - b.level; });

    var critical = batteries.filter(function(b) { return b.level <= 25; }).length;
    var low = batteries.filter(function(b) { return b.level > 25 && b.level <= 50; }).length;
    var good = batteries.filter(function(b) { return b.level > 50; }).length;

    var summaryHtml = '';
    if (critical > 0) summaryHtml += '<span><span class="summary-count" style="color:#FF5252">' + critical + '</span><span style="color:#FF5252">critical</span></span>';
    if (low > 0) summaryHtml += '<span><span class="summary-count" style="color:#FFB300">' + low + '</span><span style="color:#FFB300">low</span></span>';
    summaryHtml += '<span><span class="summary-count" style="color:#00E676">' + good + '</span><span style="color:#00E676">good</span></span>';
    this._summaryEl.innerHTML = summaryHtml;

    var listHtml = '';
    for (var j = 0; j < batteries.length; j++) {
      var b = batteries[j];
      var color = this._levelColor(b.level);
      listHtml += '<div class="battery-item" data-entity="' + b.entity + '">' +
        '<div class="bar-wrap">' +
        '<div class="battery-name">' + b.name + '</div>' +
        '<div class="bar-bg"><div class="bar-fill" style="width:' + b.level + '%;background:' + color + '"></div></div>' +
        '</div>' +
        '<span class="battery-pct" style="color:' + color + '">' + Math.round(b.level) + '%</span>' +
        '</div>';
    }
    this._listEl.innerHTML = listHtml;

    var self = this;
    this._listEl.querySelectorAll('.battery-item').forEach(function(el) {
      el.addEventListener('click', function() { self._fireMoreInfo(el.dataset.entity); });
    });
  }

  _fireMoreInfo(entity) {
    var evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-battery-card', TypographyBatteryCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'typography-battery-card', name: 'Typography Battery Card', description: 'Battery levels sorted by lowest with color bars' });
