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

const ALERT_STYLES = {
  error:   { bg: 'rgba(255, 82, 82, 0.12)', border: '#FF5252', detail: '#FF8A80' },
  warning: { bg: 'rgba(255, 183, 77, 0.12)', border: '#FFB74D', detail: '#FFE0B2' }
};

class TypographyAlertCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  setConfig(config) {
    if (!config.alerts) throw new Error('Please define alerts');
    this._config = config;
  }

  getCardSize() {
    return 1;
  }

  _render() {
    const hass = this._hass;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const active = [];
    for (const alert of this._config.alerts) {
      const state = hass.states[alert.entity];
      if (!state) continue;

      let triggered = false;
      if (alert.condition === 'not_equals') {
        triggered = state.state !== alert.condition_value;
      } else if (alert.condition === 'equals') {
        triggered = state.state === alert.condition_value;
      }

      if (triggered) {
        const s = ALERT_STYLES[alert.type || 'error'];
        const detail = alert.detail || state.state;
        active.push({ ...alert, detail, style: s });
      }
    }

    // Hide card entirely when no alerts
    this.style.display = active.length ? 'block' : 'none';

    if (!active.length) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const rows = active.map(a => `
      <div class="alert" style="background:${a.style.bg}; border-left-color:${a.style.border};" data-entity="${a.entity}">
        <span class="alert-icon">${a.icon}</span>
        <div class="alert-text">
          <div class="alert-name">${a.name}</div>
          <div class="alert-detail" style="color:${a.style.detail}">${a.detail}</div>
        </div>
      </div>
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .alert {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          border-left: 3px solid;
          gap: 10px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .alert:active { opacity: 0.8; }
        .alert-icon { font-size: 1.2rem; }
        .alert-text { display: flex; flex-direction: column; }
        .alert-name {
          font-family: var(--font);
          font-size: 1.05rem;
          font-weight: 700;
          color: #FFFFFF;
        }
        .alert-detail {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 500;
        }
      </style>
      <div class="container">${rows}</div>
    `;

    this.shadowRoot.querySelectorAll('.alert').forEach(el => {
      el.addEventListener('click', () => {
        const evt = new Event('hass-more-info', { bubbles: true, composed: true });
        evt.detail = { entityId: el.dataset.entity };
        this.dispatchEvent(evt);
      });
    });
  }
}

customElements.define('typography-alert-card', TypographyAlertCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-alert-card',
  name: 'Typography Alert Card',
  description: 'Conditional alerts with color-coded severity'
});
