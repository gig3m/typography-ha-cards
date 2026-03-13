// Typography Media Card v1
// Media player list with status dots and volume sliders

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

class TypographyMediaCard extends HTMLElement {
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
    return Math.max(2, this._config.entities.length + 1);
  }

  _build() {
    if (!this._hass) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

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
          margin-bottom: 14px;
        }
        .card-icon { font-size: 1.3rem; }
        .card-title {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #8A8A8E;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .player {
          position: relative;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .player:last-child { border-bottom: none; }
        .player-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .player-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .player-name {
          font-family: var(--font);
          font-size: 0.9rem;
          font-weight: 400;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .player-status {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 300;
          color: #8A8A8E;
          flex-shrink: 0;
        }
        .player-source {
          font-family: var(--font);
          font-size: 0.65rem;
          font-weight: 300;
          color: #555;
          margin-left: 16px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Volume slider */
        .vol-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 0 0 16px;
        }
        .vol-icon {
          font-size: 0.75rem;
          color: #555;
          flex-shrink: 0;
          width: 16px;
          text-align: center;
        }
        .vol-track {
          position: relative;
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          touch-action: none;
        }
        .vol-track::before {
          content: '';
          position: absolute;
          left: 0; right: 0;
          top: -10px; bottom: -10px;
        }
        .vol-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          border-radius: 2px;
          background: #00E676;
          transition: width 0.15s ease;
          pointer-events: none;
        }
        .vol-thumb {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          transform: translate(-50%, -50%);
          transition: left 0.15s ease;
          pointer-events: none;
        }
        .vol-track.dragging .vol-fill,
        .vol-track.dragging .vol-thumb {
          transition: none;
        }
        .vol-pct {
          font-family: var(--font);
          font-size: 0.7rem;
          font-weight: 700;
          color: #8A8A8E;
          width: 28px;
          text-align: right;
          flex-shrink: 0;
        }
        .player.unavailable .player-name { color: #555; }
        .player.unavailable .vol-row { opacity: 0.3; pointer-events: none; }
      </style>
      <div class="card">
        ${this._config.title || this._config.icon ? `
          <div class="card-header">
            ${this._config.icon ? `<span class="card-icon">${this._config.icon}</span>` : ''}
            ${this._config.title ? `<span class="card-title">${this._config.title}</span>` : ''}
          </div>
        ` : ''}
        <div class="players"></div>
      </div>
    `;

    const container = this.shadowRoot.querySelector('.players');
    this._slots = {};

    for (const ent of this._config.entities) {
      const entityId = typeof ent === 'string' ? ent : ent.entity;
      const name = (typeof ent === 'object' ? ent.name : null);

      const player = document.createElement('div');
      player.className = 'player';
      player.innerHTML = `
        <div class="player-top">
          <div class="player-left">
            <span class="status-dot"></span>
            <span class="player-name"></span>
          </div>
          <span class="player-status"></span>
        </div>
        <div class="player-source"></div>
        <div class="vol-row">
          <span class="vol-icon">🔊</span>
          <div class="vol-track">
            <div class="vol-fill"></div>
            <div class="vol-thumb"></div>
          </div>
          <span class="vol-pct"></span>
        </div>
      `;

      // Click name area to open more-info
      player.querySelector('.player-top').addEventListener('click', () => {
        this._fireMoreInfo(entityId);
      });

      // Volume slider interaction
      const track = player.querySelector('.vol-track');
      this._bindVolumeSlider(track, entityId);

      container.appendChild(player);

      this._slots[entityId] = {
        el: player,
        dot: player.querySelector('.status-dot'),
        nameEl: player.querySelector('.player-name'),
        statusEl: player.querySelector('.player-status'),
        sourceEl: player.querySelector('.player-source'),
        fill: player.querySelector('.vol-fill'),
        thumb: player.querySelector('.vol-thumb'),
        pct: player.querySelector('.vol-pct'),
        track: track,
        configName: name,
        entityId: entityId
      };
    }

    this._built = true;
    this._update();
  }

  _bindVolumeSlider(track, entityId) {
    let dragging = false;

    const setVolume = (e) => {
      const rect = track.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const pad = 0.15;
      const pct = Math.max(0, Math.min(1, (x / rect.width - pad) / (1 - 2 * pad)));
      // Update visual immediately
      const slot = this._slots[entityId];
      if (slot) {
        slot.fill.style.width = `${pct * 100}%`;
        slot.thumb.style.left = `${pct * 100}%`;
        slot.pct.textContent = `${Math.round(pct * 100)}%`;
      }
      return pct;
    };

    const commit = (pct) => {
      this._hass.callService('media_player', 'volume_set', {
        entity_id: entityId,
        volume_level: Math.round(pct * 100) / 100
      });
    };

    track.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      track.classList.add('dragging');
      track.setPointerCapture(e.pointerId);
      setVolume(e);
    });

    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      setVolume(e);
    });

    track.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      const pct = setVolume(e);
      commit(pct);
    });

    track.addEventListener('pointercancel', () => {
      dragging = false;
      track.classList.remove('dragging');
    });
  }

  _update() {
    if (!this._built || !this._hass) return;

    const STATUS_COLORS = {
      'playing': '#00E676', 'paused': '#FFB300', 'idle': '#8A8A8E',
      'standby': '#8A8A8E', 'off': '#555', 'unavailable': '#333'
    };

    for (const ent of this._config.entities) {
      const entityId = typeof ent === 'string' ? ent : ent.entity;
      const slot = this._slots[entityId];
      if (!slot) continue;

      const state = this._hass.states[entityId];
      if (!state) {
        slot.el.className = 'player unavailable';
        slot.nameEl.textContent = slot.configName || entityId;
        slot.statusEl.textContent = 'Unavailable';
        slot.dot.style.background = '#333';
        slot.sourceEl.textContent = '';
        slot.fill.style.width = '0%';
        slot.thumb.style.left = '0%';
        slot.pct.textContent = '—';
        continue;
      }

      const val = state.state;
      const color = STATUS_COLORS[val] || '#8A8A8E';
      const name = slot.configName || state.attributes.friendly_name || entityId;
      const isUnavailable = val === 'unavailable' || val === 'off';

      slot.el.className = isUnavailable ? 'player unavailable' : 'player';
      slot.nameEl.textContent = name;
      slot.statusEl.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      slot.statusEl.style.color = color;
      slot.dot.style.background = color;
      slot.dot.style.boxShadow = `0 0 6px ${color}60`;

      // Source / now playing
      const media = state.attributes.media_title || state.attributes.media_content_id || '';
      const source = state.attributes.source || '';
      slot.sourceEl.textContent = media ? media : (source ? source : '');

      // Volume (only update if not dragging)
      if (!slot.track.classList.contains('dragging')) {
        const vol = state.attributes.volume_level;
        if (vol !== undefined && vol !== null) {
          const pct = Math.round(vol * 100);
          slot.fill.style.width = `${pct}%`;
          slot.thumb.style.left = `${pct}%`;
          slot.pct.textContent = `${pct}%`;
        } else {
          slot.fill.style.width = '0%';
          slot.thumb.style.left = '0%';
          slot.pct.textContent = '—';
        }
      }
    }
  }

  _fireMoreInfo(entity) {
    const evt = new Event('hass-more-info', { bubbles: true, composed: true });
    evt.detail = { entityId: entity };
    this.dispatchEvent(evt);
  }
}

customElements.define('typography-media-card', TypographyMediaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-media-card',
  name: 'Typography Media Card',
  description: 'Media player list with status indicators and volume sliders'
});
