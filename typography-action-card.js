// Ensure Space Grotesk is available globally
if (!document.querySelector('#typo-fonts')) {
  const style = document.createElement('style');
  style.id = 'typo-fonts';
  style.textContent = `
    @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
    @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
  `;
  document.head.appendChild(style);
}

class TypographyActionCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
  }

  setConfig(config) {
    if (!config.actions) throw new Error('Please define actions');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return 2;
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const cols = this._config.columns || 4;

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .container {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 8px;
        }
        .action {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s;
        }
        .action.fired {
          background: rgba(255, 255, 255, 0.20);
          transition: background 0.05s;
        }
        .action.fired .action-name {
          color: #00E676;
          transition: color 0.05s;
        }
        .action-icon {
          font-size: 1.6rem;
          margin-bottom: 8px;
          color: var(--icon-color, #8A8A8E);
        }
        .action-name {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 500;
          color: #FFFFFF;
          text-align: center;
          line-height: 1.2;
        }
        .action-sub {
          font-family: var(--font);
          font-size: 0.65rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 2px;
        }
      </style>
      <div class="container"></div>
    `;

    const container = this.shadowRoot.querySelector('.container');

    for (const action of this._config.actions) {
      const btn = document.createElement('div');
      btn.className = 'action';

      const iconColor = action.icon_color || '#8A8A8E';
      btn.innerHTML = `
        <div class="action-icon" style="color:${iconColor}">${action.icon || ''}</div>
        <div class="action-name">${action.name || ''}</div>
        ${action.secondary ? `<div class="action-sub">${action.secondary}</div>` : ''}
      `;

      btn.addEventListener('click', () => {
        // Visual feedback
        btn.classList.add('fired');
        setTimeout(() => btn.classList.remove('fired'), 600);

        if (action.entity) {
          const domain = action.entity.split('.')[0];
          if (domain === 'script') {
            this._hass.callService('script', 'turn_on', { entity_id: action.entity });
          } else {
            this._hass.callService('homeassistant', 'toggle', { entity_id: action.entity });
          }
        } else if (action.service) {
          const [domain, service] = action.service.split('.');
          this._hass.callService(domain, service, action.service_data || {});
        }
      });

      container.appendChild(btn);
    }

    this._built = true;
  }
}

customElements.define('typography-action-card', TypographyActionCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-action-card',
  name: 'Typography Action Card',
  description: 'Clean action buttons in a grid layout'
});
