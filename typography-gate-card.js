// Ensure Space Grotesk is available globally
if (!document.querySelector('#typo-fonts')) {
  var style = document.createElement('style');
  style.id = 'typo-fonts';
  style.textContent = "\n    @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }\n    @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }\n  ";
  document.head.appendChild(style);
}

class TypographyGateCard extends HTMLElement {
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

  getCardSize() {
    return 3;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    var title = this._config.title || 'GATE';
    var icon = this._config.icon || '';
    var holdOptions = this._config.hold_options || [1, 2, 4, 8];

    this.shadowRoot.innerHTML = [
      '<style>',
      "@font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }",
      "@font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }",
      "@font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }",
      ":host { display: block; --font: 'Space Grotesk', sans-serif; }",
      '.card { padding: 18px; border-radius: 14px; background: rgba(255, 255, 255, 0.03); position: relative; }',
      '.card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }',
      '.card-icon { font-size: 1.3rem; }',
      ".card-title { font-family: var(--font); font-size: 0.85rem; font-weight: 400; color: #8A8A8E; text-transform: uppercase; letter-spacing: 0.05em; }",
      // Hero line — single adaptive status string
      '.hero { cursor: pointer; -webkit-tap-highlight-color: transparent; margin-bottom: 14px; }',
      '.hero:active { opacity: 0.7; }',
      ".hero-text { font-family: var(--font); font-size: 2.2rem; font-weight: 700; line-height: 1.1; color: #fff; }",
      // Actions row
      '.actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }',
      '.action { display: flex; align-items: center; justify-content: center; padding: 10px 6px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.15s; }',
      '.action.fired { background: rgba(255, 255, 255, 0.20); transition: background 0.05s; }',
      '.action.fired .action-name { color: #00E676; transition: color 0.05s; }',
      ".action-name { font-family: var(--font); font-size: 0.75rem; font-weight: 500; color: #FFFFFF; line-height: 1; }",
      '.action.disabled { opacity: 0.25; pointer-events: none; }',
      // Modal
      '.modal-overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.85); border-radius: 14px; z-index: 10; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }',
      '.modal-overlay.visible { display: flex; }',
      ".modal-title { font-family: var(--font); font-size: 0.75rem; font-weight: 400; color: #8A8A8E; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }",
      '.modal-options { display: flex; gap: 8px; }',
      ".modal-opt { font-family: var(--font); font-size: 1.1rem; font-weight: 700; color: #fff; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: rgba(255,255,255,0.06); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.15s, color 0.15s; }",
      '.modal-opt:active { background: rgba(0,230,118,0.2); color: #00E676; }',
      '.modal-opt.fired { background: rgba(0,230,118,0.25); color: #00E676; transition: background 0.05s; }',
      ".modal-cancel { font-family: var(--font); font-size: 0.7rem; font-weight: 400; color: #555; cursor: pointer; margin-top: 4px; -webkit-tap-highlight-color: transparent; }",
      '.modal-cancel:active { color: #8A8A8E; }',
      '</style>',
      '<div class="card">',
      '  <div class="card-header">',
      icon ? '    <span class="card-icon">' + icon + '</span>' : '',
      '    <span class="card-title">' + title + '</span>',
      '  </div>',
      '  <div class="hero"><div class="hero-text"></div></div>',
      '  <div class="actions">',
      '    <div class="action" id="btn-trigger"><span class="action-name">Open</span></div>',
      '    <div class="action" id="btn-hold"><span class="action-name">Hold</span></div>',
      '    <div class="action" id="btn-close"><span class="action-name">Close</span></div>',
      '  </div>',
      '  <div class="modal-overlay">',
      '    <div class="modal-title">Hold open for</div>',
      '    <div class="modal-options"></div>',
      '    <div class="modal-cancel">Cancel</div>',
      '  </div>',
      '</div>'
    ].join('\n');

    // Cache refs
    this._heroText = this.shadowRoot.querySelector('.hero-text');
    this._btnTrigger = this.shadowRoot.querySelector('#btn-trigger');
    this._btnHold = this.shadowRoot.querySelector('#btn-hold');
    this._btnClose = this.shadowRoot.querySelector('#btn-close');
    this._modal = this.shadowRoot.querySelector('.modal-overlay');
    this._modalOptions = this.shadowRoot.querySelector('.modal-options');
    this._modalCancel = this.shadowRoot.querySelector('.modal-cancel');

    var self = this;

    // Build hold duration buttons
    for (var i = 0; i < holdOptions.length; i++) {
      var h = holdOptions[i];
      var opt = document.createElement('div');
      opt.className = 'modal-opt';
      opt.textContent = h + 'h';
      opt.setAttribute('data-hours', h);
      opt.addEventListener('click', function() {
        var hours = parseInt(this.getAttribute('data-hours'));
        this.classList.add('fired');
        var btn = this;
        setTimeout(function() { btn.classList.remove('fired'); }, 600);
        self._hass.callService('rest_command', 'cellgate_hold_open', { hours: hours });
        setTimeout(function() { self._modal.classList.remove('visible'); }, 400);
      });
      this._modalOptions.appendChild(opt);
    }

    this._modalCancel.addEventListener('click', function() {
      self._modal.classList.remove('visible');
    });

    this.shadowRoot.querySelector('.hero').addEventListener('click', function() {
      self._fireMoreInfo(self._config.entity);
    });

    this._btnTrigger.addEventListener('click', function() {
      self._fireAction(self._btnTrigger, 'rest_command', 'cellgate_trigger', {});
    });
    this._btnHold.addEventListener('click', function() {
      self._modal.classList.add('visible');
    });
    this._btnClose.addEventListener('click', function() {
      self._fireAction(self._btnClose, 'rest_command', 'cellgate_close', {});
    });

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._built || !this._hass) return;

    var state = this._hass.states[this._config.entity];
    if (!state) {
      this._heroText.textContent = '\u2014';
      this._heroText.style.color = '#555';
      return;
    }

    var val = state.state;
    var attrs = state.attributes || {};
    var holdSec = attrs.hold_seconds_remaining;
    var color;
    var text;

    if (val === 'unavailable' || val === 'unknown') {
      color = '#555';
      text = 'Unavailable';
    } else if (val === 'closed') {
      color = '#FF5252';
      text = 'Closed';
    } else if (holdSec && holdSec > 0 && attrs.hold_open_until) {
      var mins = Math.ceil(holdSec / 60);
      if (mins > 120) {
        // More than 2 hours — show the closing time
        var untilDate = new Date(attrs.hold_open_until);
        var untilStr = untilDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        text = 'Open until ' + untilStr;
        color = '#00E676';
      } else if (mins >= 60) {
        // 1-2 hours — show hours and minutes
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        var dur = m > 0 ? h + ' hr ' + m + ' min' : h + ' hour' + (h > 1 ? 's' : '');
        text = 'Open for ' + dur;
        color = mins > 60 ? '#00E676' : '#FFB300';
      } else {
        // Under an hour — show minutes
        text = 'Open for ' + mins + ' min';
        color = '#FFB300';
      }
    } else {
      // Open but no hold
      color = '#FFB300';
      text = 'Open';
    }

    this._heroText.textContent = text;
    this._heroText.style.color = color;

    // Button states
    if (val === 'closed') {
      this._btnClose.classList.add('disabled');
      this._btnTrigger.classList.remove('disabled');
      this._btnHold.classList.remove('disabled');
    } else if (holdSec && holdSec > 0) {
      this._btnClose.classList.remove('disabled');
      this._btnTrigger.classList.add('disabled');
      this._btnHold.classList.add('disabled');
    } else {
      this._btnClose.classList.remove('disabled');
      this._btnTrigger.classList.remove('disabled');
      this._btnHold.classList.remove('disabled');
    }
  }

  _fireAction(btn, domain, service, data) {
    btn.classList.add('fired');
    setTimeout(function() { btn.classList.remove('fired'); }, 600);
    this._hass.callService(domain, service, data);
  }

  _fireMoreInfo(entity) {
    var evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-gate-card', TypographyGateCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-gate-card',
  name: 'Typography Gate Card',
  description: 'Gate status and control with action buttons'
});
