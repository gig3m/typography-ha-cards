// Typography Mesh Card v2 - Zigbee mesh health sorted by signal strength
if (!document.querySelector('#typo-fonts')) {
  var style = document.createElement('style');
  style.id = 'typo-fonts';
  style.textContent = "\n    @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }\n  ";
  document.head.appendChild(style);
}

class TypographyMeshCard extends HTMLElement {
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
    return 2 + Math.ceil(this._config.entities.length / 3);
  }

  _lqiColor(lqi) {
    if (lqi < 50) return '#FF5252';
    if (lqi < 80) return '#FF9100';
    if (lqi < 120) return '#FFB300';
    if (lqi < 170) return '#69F0AE';
    return '#00E676';
  }

  _signalBars(lqi) {
    var bars = lqi >= 170 ? 4 : lqi >= 120 ? 3 : lqi >= 80 ? 2 : lqi >= 50 ? 1 : 0;
    var color = this._lqiColor(lqi);
    var svg = '<svg width="16" height="12" viewBox="0 0 16 12">';
    for (var i = 0; i < 4; i++) {
      var h = 3 + i * 3;
      var y = 12 - h;
      var fill = i < bars ? color : 'rgba(255,255,255,0.1)';
      svg += '<rect x="' + (i * 4) + '" y="' + y + '" width="3" height="' + h + '" rx="0.5" fill="' + fill + '"/>';
    }
    svg += '</svg>';
    return svg;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    var title = this._config.title || 'ZIGBEE MESH';
    var icon = this._config.icon || '📡';

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
      ".device-list { display: flex; flex-direction: column; gap: 4px; }\n" +
      ".device-item { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 3px 0; -webkit-tap-highlight-color: transparent; }\n" +
      ".device-item:active { opacity: 0.7; }\n" +
      ".device-icon { font-size: 0.75rem; width: 18px; text-align: center; }\n" +
      ".device-name { flex: 1; font-family: var(--font); font-size: 0.7rem; font-weight: 400; color: #8A8A8E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n" +
      ".device-signal { display: flex; align-items: center; gap: 6px; }\n" +
      ".device-lqi { font-family: var(--font); font-size: 0.75rem; font-weight: 700; min-width: 28px; text-align: right; }\n" +
      '</style>\n' +
      '<div class="card">' +
      '<div class="header"><span class="card-icon">' + icon + '</span><span class="card-title">' + title + '</span></div>' +
      '<div class="summary" id="summary"></div>' +
      '<div class="device-list" id="list"></div>' +
      '</div>';

    this._summaryEl = this.shadowRoot.getElementById('summary');
    this._listEl = this.shadowRoot.getElementById('list');
    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    var typeIcons = { bulb: '💡', sensor: '🌡️', switch: '🔌', dimmer: '🎛️', plug: '🔌', strip: '💡', device: '📟' };

    var devices = [];
    for (var i = 0; i < this._config.entities.length; i++) {
      var ent = this._config.entities[i];
      var state = this._hass.states[ent.entity];
      if (!state) continue;
      var lqi = parseFloat(state.state);
      var name = ent.name || (state.attributes.friendly_name || '').replace(' Linkquality', '');
      var type = ent.type || 'device';
      if (!isNaN(lqi)) {
        devices.push({ name: name, lqi: lqi, entity: ent.entity, type: type });
      }
    }

    devices.sort(function(a, b) { return a.lqi - b.lqi; });

    var weak = devices.filter(function(d) { return d.lqi < 80; }).length;
    var fair = devices.filter(function(d) { return d.lqi >= 80 && d.lqi < 120; }).length;
    var strong = devices.filter(function(d) { return d.lqi >= 120; }).length;

    var summaryHtml = '';
    if (weak > 0) summaryHtml += '<span><span class="summary-count" style="color:#FF9100">' + weak + '</span><span style="color:#FF9100">weak</span></span>';
    if (fair > 0) summaryHtml += '<span><span class="summary-count" style="color:#FFB300">' + fair + '</span><span style="color:#FFB300">fair</span></span>';
    summaryHtml += '<span><span class="summary-count" style="color:#00E676">' + strong + '</span><span style="color:#00E676">strong</span></span>';
    summaryHtml += '<span style="margin-left:auto;color:#555">' + devices.length + ' devices</span>';
    this._summaryEl.innerHTML = summaryHtml;

    var listHtml = '';
    var self = this;
    for (var j = 0; j < devices.length; j++) {
      var d = devices[j];
      var color = this._lqiColor(d.lqi);
      var dIcon = typeIcons[d.type] || typeIcons['device'];
      listHtml += '<div class="device-item" data-entity="' + d.entity + '">' +
        '<span class="device-icon">' + dIcon + '</span>' +
        '<span class="device-name">' + d.name + '</span>' +
        '<div class="device-signal">' +
        '<span>' + this._signalBars(d.lqi) + '</span>' +
        '<span class="device-lqi" style="color:' + color + '">' + Math.round(d.lqi) + '</span>' +
        '</div></div>';
    }
    this._listEl.innerHTML = listHtml;

    this._listEl.querySelectorAll('.device-item').forEach(function(el) {
      el.addEventListener('click', function() { self._fireMoreInfo(el.dataset.entity); });
    });
  }

  _fireMoreInfo(entity) {
    var evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-mesh-card', TypographyMeshCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'typography-mesh-card', name: 'Typography Mesh Card', description: 'Zigbee mesh health with signal strength bars' });
