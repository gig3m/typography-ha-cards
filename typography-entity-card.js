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

class TypographyEntityCard extends HTMLElement {
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
    if (!config.entities) throw new Error('Please define entities');
    this._config = config;
    this._built = false;
  }

  getCardSize() {
    return Math.ceil(this._config.entities.length / (this._config.columns || 1));
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const cols = this._config.columns || 1;
    const layout = this._config.layout || 'list'; // 'list' or 'grid'

    this.shadowRoot.innerHTML = `
      <style>
        @font-face { font-family: 'Space Grotesk'; font-weight: 700; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 400; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf') format('truetype'); }
        @font-face { font-family: 'Space Grotesk'; font-weight: 300; src: url('/local/fonts/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UUsj.ttf') format('truetype'); }
        :host {
          display: block;
          --font: 'Space Grotesk', sans-serif;
        }
        .container {
          display: ${layout === 'grid' ? 'grid' : 'flex'};
          ${layout === 'grid' ? `grid-template-columns: repeat(${cols}, 1fr);` : 'flex-direction: column;'}
          gap: 8px;
        }
        .entity {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .entity:active { opacity: 0.8; }
        .entity.active {
          background: var(--active-bg, rgba(0, 230, 118, 0.10));
        }
        .left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .name {
          font-family: var(--font);
          font-size: 1rem;
          font-weight: 500;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .secondary {
          font-family: var(--font);
          font-size: 0.75rem;
          font-weight: 400;
          color: #8A8A8E;
          margin-top: 1px;
        }
        .value {
          font-family: var(--font);
          font-size: 1.6rem;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1;
          flex-shrink: 0;
          margin-left: 8px;
        }
        .value .val-unit {
          font-size: 0.8rem;
          font-weight: 300;
          color: #8A8A8E;
        }
      </style>
      <div class="container"></div>
    `;

    const container = this.shadowRoot.querySelector('.container');
    this._rows = {};

    for (const ent of this._config.entities) {
      const row = document.createElement('div');
      row.className = 'entity';
      row.dataset.entity = ent.entity;

      row.innerHTML = `
        <div class="left">
          <span class="icon"></span>
          <div class="info">
            <div class="name"></div>
            <div class="secondary"></div>
          </div>
        </div>
        <div class="value"></div>
      `;

      row.addEventListener('click', () => {
        if (ent.tap_action === 'toggle') {
          this._hass.callService('homeassistant', 'toggle', { entity_id: ent.entity });
        } else if (ent.tap_action === 'call-service' && ent.service) {
          const [domain, service] = ent.service.split('.');
          this._hass.callService(domain, service, ent.service_data || {});
        } else {
          this._fireMoreInfo(ent.entity);
        }
      });

      container.appendChild(row);

      this._rows[ent.entity] = {
        el: row,
        icon: row.querySelector('.icon'),
        name: row.querySelector('.name'),
        secondary: row.querySelector('.secondary'),
        value: row.querySelector('.value'),
        config: ent
      };
    }

    this._built = true;
    this._update();
  }

  _update() {
    if (!this._rows || !this._hass) return;

    for (const ent of this._config.entities) {
      const r = this._rows[ent.entity];
      if (!r) continue;

      const state = this._hass.states[ent.entity];
      if (!state) continue;

      const isOn = ['on', 'home'].includes(state.state);
      const iconColor = ent.icon_color || '#8A8A8E';

      // Icon
      r.icon.textContent = ent.icon || '';
      r.icon.style.color = isOn ? iconColor : '#555';

      // Name
      r.name.textContent = ent.name || state.attributes.friendly_name || ent.entity;

      // Active background for toggleable/person entities
      if (ent.tap_action === 'toggle' || ent.format === 'person') {
        r.el.style.setProperty('--active-bg', isOn ? `${iconColor}18` : 'rgba(255,255,255,0.04)');
        r.el.classList.toggle('active', isOn);
      }

      // Secondary text
      if (ent.format === 'person') {
        r.secondary.textContent = isOn ? 'Home' : state.state;
        r.secondary.style.display = '';
        r.secondary.style.color = isOn ? iconColor : '#8A8A8E';
      } else if (ent.tap_action === 'toggle' && ent.show_state) {
        const label = isOn ? 'On' : 'Off';
        r.secondary.textContent = label;
        r.secondary.style.display = '';
        r.secondary.style.color = isOn ? iconColor : '#555';
      } else if (ent.secondary) {
        r.secondary.textContent = ent.secondary;
        r.secondary.style.display = '';
        r.secondary.style.color = '#8A8A8E';
      } else if (ent.show_state) {
        r.secondary.textContent = state.state;
        r.secondary.style.display = '';
        r.secondary.style.color = '#8A8A8E';
      } else {
        r.secondary.style.display = 'none';
      }

      // Value — format the state for display
      if (ent.show_value !== false) {
        const val = state.state;
        const unit = ent.unit || state.attributes.unit_of_measurement || '';
        if (val === 'unavailable' || val === 'unknown') {
          r.value.innerHTML = '<span style="font-size:0.9rem;color:#555">—</span>';
        } else if (ent.format === 'person') {
          r.value.innerHTML = '';
        } else if (!isNaN(parseFloat(val))) {
          const num = parseFloat(val);
          const display = Number.isInteger(num) ? num : num.toFixed(1);
          r.value.innerHTML = `${display}${unit ? `<span class="val-unit">${unit}</span>` : ''}`;
        } else {
          r.value.innerHTML = `<span style="font-size:1rem;font-weight:400">${val}</span>`;
        }
      } else {
        r.value.innerHTML = '';
      }
    }
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-entity-card', TypographyEntityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-entity-card',
  name: 'Typography Entity Card',
  description: 'Data-forward entity display for conditions, people, sensors'
});
