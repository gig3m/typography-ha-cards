// Typography Plex Card v10
// Two-panel: search (left) + player/speakers (right)
// Uses Music Assistant for Plex playback on Sonos
// Sonos native grouping for synced multi-room playback

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

class TypographyPlexCard extends HTMLElement {
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
    if (!config.speakers || !config.speakers.length) throw new Error('Please define speakers');
    this._config = config;
    this._built = false;
    this._selectedSpeakers = new Set();
    this._searchResults = null;
    this._searchTimeout = null;
    this._lastActiveMA = null;
    this._lastCoordinator = null;
    this._activeFilter = 'all';
  }

  getCardSize() { return 8; }

  _getMAEntity(displayEntity) {
    const map = this._config.entity_map || {};
    if (map[displayEntity]) return map[displayEntity];
    return displayEntity + '_2';
  }

  // === STATE MODEL ===
  // Sonos entity = source of truth for: play state, position, duration
  // MA entity = source of truth for: track metadata (title, artist, album, art)
  // Transport commands go to Sonos entity (MA is always idle)

  // Is this Sonos speaker active with MA content? (playing, paused, or recently paused/idle)
  _isSonosActiveMA(entityId) {
    const st = this._hass?.states?.[entityId];
    if (!st) return false;
    const state = st.state;
    // Playing or paused — check content
    if (state === 'playing' || state === 'paused') {
      const contentId = st.attributes.media_content_id || '';
      if (contentId.includes(':8097/')) return true;
      const maId = this._getMAEntity(entityId);
      const maSt = this._hass?.states?.[maId];
      if (maSt && maSt.attributes.app_id === 'music_assistant' && maSt.attributes.media_content_id) return true;
    }
    // Idle but MA entity still has content (Sonos "paused" = idle)
    if (state === 'idle') {
      const maId = this._getMAEntity(entityId);
      const maSt = this._hass?.states?.[maId];
      if (maSt && maSt.attributes.app_id === 'music_assistant' && maSt.attributes.media_content_id) {
        // Only if Sonos still has position (recently was playing, not cleared)
        if (st.attributes.media_position !== undefined) return true;
      }
    }
    return false;
  }

  // Find the Sonos coordinator (display entity ID) that's playing MA content.
  // Returns the display entity, NOT the MA entity.
  _findCoordinator() {
    const speakers = this._config.speakers || [];
    // 1. Selected speaker that's a Sonos group coordinator and playing MA
    for (const eid of this._selectedSpeakers) {
      const st = this._hass?.states?.[eid];
      if (!st) continue;
      const gm = st.attributes.group_members || [];
      if (gm.length > 1 && gm[0] === eid && this._isSonosActiveMA(eid)) return eid;
    }
    // 2. Selected speaker playing MA content
    for (const eid of this._selectedSpeakers) {
      if (this._isSonosActiveMA(eid)) return eid;
    }
    // 3. Any config speaker playing MA content
    for (const spk of speakers) {
      const eid = typeof spk === 'string' ? spk : spk.entity;
      if (this._isSonosActiveMA(eid)) return eid;
    }
    // 4. Selected speaker whose MA entity has content (recently played)
    for (const eid of this._selectedSpeakers) {
      const maId = this._getMAEntity(eid);
      const maSt = this._hass?.states?.[maId];
      if (maSt && maSt.attributes.media_content_id && maSt.attributes.app_id === 'music_assistant') return eid;
    }
    return null;
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
          --green: #00E676;
          --amber: #FFB300;
        }
        * { box-sizing: border-box; }
        .card {
          padding: 20px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }
        .layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        /* === LEFT PANEL: Search === */
        .panel-left {
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.05);
          padding-right: 20px;
        }
        .panel-label {
          font-family: var(--font);
          font-size: 0.85rem;
          font-weight: 400;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }
        .search-wrap { position: relative; margin-bottom: 14px; }
        .search-input {
          width: 100%;
          font-family: var(--font);
          font-size: 1.05rem;
          font-weight: 400;
          color: #fff;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 40px 12px 38px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: #555; }
        .search-input:focus { border-color: rgba(0,230,118,0.3); }
        .search-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          font-size: 0.95rem; color: #555; pointer-events: none;
        }
        .search-clear {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          font-size: 0.9rem; color: #555; cursor: pointer;
          background: none; border: none; padding: 4px; display: none;
        }
        .search-clear.visible { display: block; }

        /* Filter tabs */
        .filter-tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .filter-tab {
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8A8A8E;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 6px;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .filter-tab:hover { background: rgba(255,255,255,0.07); }
        .filter-tab.active {
          color: #fff;
          background: rgba(0, 230, 118, 0.12);
          border-color: rgba(0, 230, 118, 0.3);
        }

        .results {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }
        .result-group-label {
          font-family: var(--font);
          font-size: 0.75rem; font-weight: 400; color: #555;
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 12px 0 5px;
        }
        .result-item {
          display: flex; align-items: center; gap: 12px;
          padding: 8px 10px; border-radius: 8px; cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .result-item:hover { background: rgba(255,255,255,0.06); }
        .result-item:active { background: rgba(0,230,118,0.1); }
        .result-art {
          width: 48px; height: 48px; border-radius: 6px;
          background: rgba(255,255,255,0.05); flex-shrink: 0; overflow: hidden;
        }
        .result-art img { width: 100%; height: 100%; object-fit: cover; }
        .result-info { flex: 1; min-width: 0; }
        .result-title {
          font-family: var(--font); font-size: 1rem; font-weight: 700; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .result-sub {
          font-family: var(--font); font-size: 0.85rem; font-weight: 300; color: #8A8A8E;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .result-type {
          font-family: var(--font); font-size: 0.7rem; font-weight: 400; color: #555;
          text-transform: uppercase; flex-shrink: 0;
        }
        .no-results, .searching {
          font-family: var(--font); font-size: 0.95rem; font-weight: 300;
          text-align: center; padding: 28px;
        }
        .no-results { color: #555; }
        .searching { color: var(--green); }
        .browse-hint {
          font-family: var(--font); font-size: 0.95rem; font-weight: 300;
          color: #333; text-align: center; padding: 44px 12px;
          line-height: 1.6;
        }

        /* === RIGHT PANEL: Player + Speakers === */
        .panel-right {
          display: flex;
          flex-direction: column;
        }

        /* Now Playing */
        .now-playing {
          display: flex; gap: 16px; align-items: center; margin-bottom: 14px;
        }
        .art-wrap {
          flex-shrink: 0; width: 96px; height: 96px; border-radius: 8px;
          overflow: hidden; background: rgba(255,255,255,0.05);
        }
        .art-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .art-placeholder {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 2.2rem; color: #333;
        }
        .track-info {
          flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
        }
        .track-source {
          font-family: var(--font); font-size: 0.75rem; font-weight: 400;
          color: #E29400; text-transform: uppercase; letter-spacing: 0.08em;
          display: flex; align-items: center; gap: 6px;
        }
        .plex-dot {
          width: 8px; height: 8px; border-radius: 50%; display: inline-block;
        }
        .track-title {
          font-family: var(--font); font-size: 1.4rem; font-weight: 700;
          color: #fff; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; line-height: 1.3;
        }
        .track-artist {
          font-family: var(--font); font-size: 1.05rem; font-weight: 400;
          color: var(--green); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .track-album {
          font-family: var(--font); font-size: 0.85rem; font-weight: 300;
          color: #8A8A8E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Transport */
        .transport {
          display: flex; align-items: center; justify-content: center;
          gap: 20px; margin-bottom: 10px;
        }
        .tbtn {
          background: none; border: none; color: #8A8A8E; cursor: pointer;
          padding: 8px; border-radius: 50%; transition: all 0.15s;
          -webkit-tap-highlight-color: transparent; line-height: 1;
          font-size: 1.4rem;
        }
        .tbtn:hover { color: #fff; }
        .tbtn.pp {
          font-size: 1.7rem; color: var(--green);
          background: rgba(0,230,118,0.1);
          width: 54px; height: 54px;
          display: flex; align-items: center; justify-content: center;
        }
        .tbtn.pp:hover { background: rgba(0,230,118,0.2); }
        .tbtn.active { color: var(--green); }

        /* Progress */
        .progress-wrap { margin-bottom: 18px; }
        .progress-bar {
          width: 100%; height: 4px;
          background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
        }
        .progress-fill {
          height: 100%; background: var(--green); border-radius: 2px;
          transition: width 1s linear;
        }
        .progress-times {
          display: flex; justify-content: space-between; margin-top: 5px;
        }
        .progress-time {
          font-family: var(--font); font-size: 0.75rem; font-weight: 300; color: #555;
        }

        /* Idle */
        .idle-state { text-align: center; padding: 28px 0; }
        .idle-icon { font-size: 2.4rem; margin-bottom: 10px; opacity: 0.3; }
        .idle-text {
          font-family: var(--font); font-size: 0.95rem; font-weight: 300; color: #555;
        }

        /* Speakers */
        .speaker-section {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 14px; margin-top: 18px;
        }
        .speaker-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .speaker-label {
          font-family: var(--font); font-size: 0.85rem; font-weight: 400;
          color: #8A8A8E; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .speakers-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
        }
        .speaker {
          font-family: var(--font); font-size: 0.85rem; font-weight: 400;
          color: #555;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px; padding: 10px 6px 8px;
          cursor: pointer; text-align: center;
          transition: all 0.15s ease;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          -webkit-tap-highlight-color: transparent; user-select: none;
        }
        .speaker:hover { background: rgba(255,255,255,0.06); }
        /* Selected but not playing — outlined, ready */
        .speaker.selected {
          color: #ccc;
          background: rgba(255,255,255,0.04);
          border-color: rgba(0, 230, 118, 0.3);
        }
        /* Selected + actively playing — filled green */
        .speaker.active {
          color: #fff;
          background: rgba(0, 230, 118, 0.15);
          border-color: rgba(0, 230, 118, 0.4);
        }
        .speaker .spk-name { display: block; }
        .speaker .spk-status {
          display: block; font-size: 0.65rem; font-weight: 300;
          color: #555; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis;
        }
        .speaker.selected .spk-status { color: #8A8A8E; }
        .speaker.active .spk-status { color: rgba(0,230,118,0.6); }
        .select-controls {
          display: flex; gap: 12px; margin-top: 8px; justify-content: center;
        }
        .select-link {
          font-family: var(--font); font-size: 0.75rem; font-weight: 300;
          color: #555; cursor: pointer; background: none; border: none;
          padding: 3px 8px; -webkit-tap-highlight-color: transparent;
        }
        .select-link:hover { color: #8A8A8E; }

        @media (max-width: 600px) {
          .layout { grid-template-columns: 1fr; }
          .panel-left { border-right: none; padding-right: 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 16px; }
        }
      </style>
      <div class="card">
        <div class="layout">
          <div class="panel-left">
            <div class="panel-label">SEARCH PLEX</div>
            <div class="search-wrap">
              <span class="search-icon">&#128269;</span>
              <input class="search-input" type="text" placeholder="Artists, albums, tracks..." />
              <button class="search-clear">&#10005;</button>
            </div>
            <div class="filter-tabs">
              <div class="filter-tab active" data-filter="all">All</div>
              <div class="filter-tab" data-filter="artist">Artists</div>
              <div class="filter-tab" data-filter="album">Albums</div>
              <div class="filter-tab" data-filter="track">Tracks</div>
              <div class="filter-tab" data-filter="playlist">Playlists</div>
            </div>
            <div class="results-area">
              <div class="browse-hint">Search your Plex music library<br/>Select speakers, then tap a result to play</div>
            </div>
          </div>
          <div class="panel-right">
            <div class="panel-label">NOW PLAYING</div>
            <div class="now-playing-area"></div>
            <div class="speaker-section">
              <div class="speaker-header">
                <span class="speaker-label">SPEAKERS</span>
              </div>
              <div class="speakers-grid"></div>
              <div class="select-controls">
                <button class="select-link select-all">All</button>
                <button class="select-link deselect-all">Clear</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._els = {
      searchInput: this.shadowRoot.querySelector('.search-input'),
      searchClear: this.shadowRoot.querySelector('.search-clear'),
      resultsArea: this.shadowRoot.querySelector('.results-area'),
      npArea: this.shadowRoot.querySelector('.now-playing-area'),
      speakersGrid: this.shadowRoot.querySelector('.speakers-grid'),
    };

    // Search
    this._els.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      this._els.searchClear.classList.toggle('visible', val.length > 0);
      clearTimeout(this._searchTimeout);
      if (val.length < 2) {
        this._searchResults = null;
        this._renderResults();
        return;
      }
      this._searchTimeout = setTimeout(() => this._doSearch(val), 400);
    });
    this._els.searchClear.addEventListener('click', () => {
      this._els.searchInput.value = '';
      this._els.searchClear.classList.remove('visible');
      this._searchResults = null;
      this._renderResults();
    });

    // Filter tabs
    this.shadowRoot.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._activeFilter = tab.dataset.filter;
        this.shadowRoot.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const query = this._els.searchInput.value.trim();
        if (query.length >= 2) {
          this._doSearch(query);
        } else if (this._searchResults) {
          this._renderResults();
        }
      });
    });

    // Speakers
    this._speakerEls = {};
    const speakers = this._config.speakers || [];
    for (const spk of speakers) {
      const entityId = typeof spk === 'string' ? spk : spk.entity;
      const name = typeof spk === 'object' ? spk.name : null;
      const btn = document.createElement('div');
      btn.className = 'speaker';
      btn.innerHTML = `<span class="spk-name"></span><span class="spk-status"></span>`;
      btn.addEventListener('click', () => this._toggleSpeaker(entityId));
      this._els.speakersGrid.appendChild(btn);
      this._speakerEls[entityId] = {
        el: btn,
        nameEl: btn.querySelector('.spk-name'),
        statusEl: btn.querySelector('.spk-status'),
        configName: name,
      };
    }

    this.shadowRoot.querySelector('.select-all').addEventListener('click', () => {
      const coordinator = this._findCoordinator();
      for (const spk of speakers) {
        this._selectedSpeakers.add(typeof spk === 'string' ? spk : spk.entity);
      }
      // If playing, group all to coordinator
      if (coordinator) {
        const others = [...this._selectedSpeakers].filter(eid => eid !== coordinator);
        if (others.length > 0) {
          this._hass.callService('media_player', 'join', {
            group_members: others,
          }, { entity_id: [coordinator] });
        }
      }
      this._updateSpeakers();
    });
    this.shadowRoot.querySelector('.deselect-all').addEventListener('click', () => {
      const coordinator = this._findCoordinator();
      if (coordinator) {
        const maId = this._getMAEntity(coordinator);
        this._hass.callService('media_player', 'media_stop', {}, { entity_id: [maId] });
      }
      for (const eid of this._selectedSpeakers) {
        this._hass.callService('media_player', 'unjoin', {}, { entity_id: [eid] });
      }
      this._selectedSpeakers.clear();
      this._updateSpeakers();
    });

    this._built = true;
    this._progressInterval = null;
    this._update();
  }

  // Find the Sonos coordinator — the display entity leading the group.
  // Coordinator is always first in Sonos group_members attribute.
  _findCoordinator() {
    // 1. Sonos group coordinator that's playing
    for (const eid of this._selectedSpeakers) {
      const st = this._hass?.states?.[eid];
      if (!st) continue;
      const gm = st.attributes.group_members || [];
      if (gm.length > 1 && gm[0] === eid && st.state === 'playing') return eid;
    }
    // 2. Selected speaker whose MA entity is playing/paused
    for (const eid of this._selectedSpeakers) {
      const maId = this._getMAEntity(eid);
      const maSt = this._hass?.states?.[maId];
      if (maSt && (maSt.state === 'playing' || maSt.state === 'paused')) return eid;
    }
    // 3. Selected speaker whose Sonos entity is playing MA content
    for (const eid of this._selectedSpeakers) {
      if (this._isSonosActiveMA(eid)) return eid;
    }
    // 4. Any config speaker whose Sonos entity is playing MA content
    for (const spk of this._config.speakers || []) {
      const eid = typeof spk === 'string' ? spk : spk.entity;
      if (this._isSonosActiveMA(eid)) return eid;
    }
    // 5. Any config speaker whose MA entity is playing/paused
    for (const spk of this._config.speakers || []) {
      const eid = typeof spk === 'string' ? spk : spk.entity;
      const maId = this._getMAEntity(eid);
      const maSt = this._hass?.states?.[maId];
      if (maSt && (maSt.state === 'playing' || maSt.state === 'paused')) return eid;
    }
    return null;
  }

  async _toggleSpeaker(entityId) {
    if (this._selectedSpeakers.has(entityId)) {
      // === DESELECTING ===
      const coordinator = this._findCoordinator();

      if (coordinator === entityId && this._selectedSpeakers.size > 1) {
        // Removing the coordinator while other speakers remain.
        // Transfer queue to another speaker via MA, then unjoin old coordinator.
        const remaining = [...this._selectedSpeakers].filter(eid => eid !== entityId);
        const newCoordinator = remaining[0];
        const newCoordMA = this._getMAEntity(newCoordinator);

        this._selectedSpeakers.delete(entityId);

        try {
          // Transfer MA queue to the new coordinator
          await this._hass.callService('music_assistant', 'transfer_queue', {}, {
            entity_id: [newCoordMA],
          });
          // Brief delay for transfer to take effect
          await new Promise(r => setTimeout(r, 2000));
          // Unjoin old coordinator from the Sonos group
          await this._hass.callService('media_player', 'unjoin', {}, { entity_id: [entityId] });
          // Regroup remaining speakers under new coordinator
          const others = remaining.filter(eid => eid !== newCoordinator);
          if (others.length > 0) {
            await this._hass.callService('media_player', 'join', {
              group_members: others,
            }, { entity_id: [newCoordinator] });
          }
        } catch (err) {
          console.warn('Coordinator transfer failed:', err);
          // Fallback: just unjoin
          await this._hass.callService('media_player', 'unjoin', {}, { entity_id: [entityId] });
        }
      } else {
        // Removing a non-coordinator member, or the last speaker
        this._selectedSpeakers.delete(entityId);
        try {
          await this._hass.callService('media_player', 'unjoin', {}, { entity_id: [entityId] });
        } catch (err) {
          console.warn('Failed to unjoin speaker:', err);
        }
      }
    } else {
      // === SELECTING ===
      this._selectedSpeakers.add(entityId);
      const coordinator = this._findCoordinator();
      if (coordinator && coordinator !== entityId) {
        try {
          await this._hass.callService('media_player', 'join', {
            group_members: [entityId],
          }, { entity_id: [coordinator] });
        } catch (err) {
          console.warn('Failed to join speaker to group:', err);
        }
      }
    }
    this._updateSpeakers();
  }

  _getMediaTypes() {
    const filterMap = {
      all: ['track', 'album', 'artist', 'playlist'],
      artist: ['artist'],
      album: ['album'],
      track: ['track'],
      playlist: ['playlist'],
    };
    return filterMap[this._activeFilter] || filterMap.all;
  }

  async _doSearch(query) {
    this._els.resultsArea.innerHTML = '<div class="searching">Searching...</div>';
    try {
      const configEntryId = this._config.config_entry_id;
      const fetchResp = await fetch('/api/services/music_assistant/search?return_response', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._hass.auth.data.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_entry_id: configEntryId,
          name: query,
          media_type: this._getMediaTypes(),
          limit: 10,
        }),
      });
      const fetchData = await fetchResp.json();
      this._searchResults = fetchData?.service_response || fetchData?.response || fetchData;
      this._renderResults();
    } catch (err) {
      console.error('MA search error:', err);
      this._els.resultsArea.innerHTML = '<div class="no-results">Search failed</div>';
    }
  }

  _renderResults() {
    const area = this._els.resultsArea;
    if (!this._searchResults) {
      area.innerHTML = '<div class="browse-hint">Search your Plex music library<br/>Select speakers, then tap a result to play</div>';
      return;
    }

    const sr = this._searchResults;
    const tracks = sr.tracks || [];
    const albums = sr.albums || [];
    const artists = sr.artists || [];
    const playlists = sr.playlists || [];
    const f = this._activeFilter;

    if (!tracks.length && !albums.length && !artists.length && !playlists.length) {
      area.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    let html = '';
    const isAll = f === 'all';
    const maxItems = isAll ? 4 : 12;
    const maxTracks = isAll ? 6 : 12;

    if (artists.length && (isAll || f === 'artist')) {
      html += '<div class="result-group-label">Artists</div>';
      for (const a of artists.slice(0, maxItems)) html += this._resultHTML(a, 'artist');
    }
    if (albums.length && (isAll || f === 'album')) {
      html += '<div class="result-group-label">Albums</div>';
      for (const a of albums.slice(0, maxItems)) html += this._resultHTML(a, 'album');
    }
    if (tracks.length && (isAll || f === 'track')) {
      html += '<div class="result-group-label">Tracks</div>';
      for (const t of tracks.slice(0, maxTracks)) html += this._resultHTML(t, 'track');
    }
    if (playlists.length && (isAll || f === 'playlist')) {
      html += '<div class="result-group-label">Playlists</div>';
      for (const p of playlists.slice(0, maxItems)) html += this._resultHTML(p, 'playlist');
    }

    area.innerHTML = `<div class="results">${html}</div>`;
    area.querySelectorAll('.result-item').forEach(el => {
      el.addEventListener('click', () => this._playResult(el.dataset.uri, el.dataset.type));
    });
  }

  _resultHTML(item, type) {
    const name = this._esc(item.name || '');
    const sub = type === 'track'
      ? this._esc(item.artists?.[0]?.name || '')
      : type === 'album'
        ? this._esc(item.artists?.[0]?.name || '')
        : '';
    const img = item.image ? `<img src="${item.image}" />` : '';
    return `
      <div class="result-item" data-uri="${this._esc(item.uri || '')}" data-type="${type}">
        <div class="result-art">${img}</div>
        <div class="result-info">
          <div class="result-title">${name}</div>
          ${sub ? `<div class="result-sub">${sub}</div>` : ''}
        </div>
        <span class="result-type">${type}</span>
      </div>`;
  }

  async _playResult(uri, type) {
    if (!uri) return;

    // Coordinator is the first selected speaker
    let coordinatorId;
    if (this._selectedSpeakers.size > 0) {
      coordinatorId = [...this._selectedSpeakers][0];
    } else {
      const first = this._config.speakers[0];
      coordinatorId = typeof first === 'string' ? first : first.entity;
      this._selectedSpeakers.add(coordinatorId);
      this._updateSpeakers();
    }

    const coordinatorMA = this._getMAEntity(coordinatorId);

    try {
      // Play to coordinator via MA
      await this._hass.callService('music_assistant', 'play_media', {
        media_id: uri,
        media_type: type,
        enqueue: 'replace',
      }, { entity_id: [coordinatorMA] });

      // Group other selected speakers to the coordinator via Sonos
      const others = [...this._selectedSpeakers].filter(eid => eid !== coordinatorId);
      if (others.length > 0) {
        // Delay to let playback start on coordinator before grouping
        setTimeout(async () => {
          try {
            await this._hass.callService('media_player', 'join', {
              group_members: others,
            }, { entity_id: [coordinatorId] });
          } catch (err) {
            console.warn('Failed to group speakers:', err);
          }
        }, 1500);
      }
    } catch (err) {
      console.error('MA play error:', err);
    }
  }

  _update() {
    if (!this._built || !this._hass) return;

    // Auto-select speakers that are playing MA content (state recovery on refresh)
    for (const spk of this._config.speakers || []) {
      const eid = typeof spk === 'string' ? spk : spk.entity;
      if (this._isSonosActiveMA(eid)) {
        this._selectedSpeakers.add(eid);
      }
    }

    const coord = this._findCoordinator();
    if (coord) this._lastCoordinator = coord;
    this._updateNowPlaying();
    this._updateSpeakers();
  }

  _updateNowPlaying() {
    const area = this._els.npArea;

    // Find coordinator — the Sonos speaker leading playback
    const coordinator = this._findCoordinator() || this._lastCoordinator;
    if (!coordinator) {
      area.innerHTML = `
        <div class="idle-state">
          <div class="idle-icon">&#127911;</div>
          <div class="idle-text">Select speakers and search to play</div>
        </div>`;
      if (this._progressInterval) { clearInterval(this._progressInterval); this._progressInterval = null; }
      return;
    }

    // Sonos entity = play state, position, duration
    const sonos = this._hass.states[coordinator];
    // MA entity = track metadata (title, artist, album, art)
    const maId = this._getMAEntity(coordinator);
    const ma = this._hass.states[maId];

    // Get track info: prefer MA metadata, fall back to Sonos
    const title = ma?.attributes?.media_title || sonos?.attributes?.media_title || '';
    const artist = ma?.attributes?.media_artist || sonos?.attributes?.media_artist || '';
    const album = ma?.attributes?.media_album_name || sonos?.attributes?.media_album_name || '';
    const artUrl = ma?.attributes?.entity_picture || sonos?.attributes?.entity_picture || '';

    if (!title) {
      area.innerHTML = `
        <div class="idle-state">
          <div class="idle-icon">&#127911;</div>
          <div class="idle-text">Select speakers and search to play</div>
        </div>`;
      if (this._progressInterval) { clearInterval(this._progressInterval); this._progressInterval = null; }
      return;
    }

    // Play state from Sonos (source of truth)
    // Note: Sonos goes to 'idle' when paused, not 'paused'
    const isPlaying = sonos?.state === 'playing';
    const isPaused = sonos?.state === 'paused' ||
      (sonos?.state === 'idle' && sonos?.attributes?.media_position !== undefined && title);
    const duration = sonos?.attributes?.media_duration || 0;
    const position = sonos?.attributes?.media_position || 0;
    const updatedAt = sonos?.attributes?.media_position_updated_at
      ? new Date(sonos.attributes.media_position_updated_at) : null;
    const shuffle = sonos?.attributes?.shuffle || ma?.attributes?.shuffle || false;

    let currentPos = position;
    if (updatedAt && isPlaying) {
      currentPos = Math.min(position + (Date.now() - updatedAt.getTime()) / 1000, duration);
    }
    const progress = duration > 0 ? (currentPos / duration) * 100 : 0;

    const stateColor = isPlaying ? '#00E676' : isPaused ? '#FFB300' : '#555';
    const stateText = isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'STOPPED';

    // Speaker names from Sonos group
    const activeNames = [];
    const gm = sonos?.attributes?.group_members || [coordinator];
    for (const memberId of gm) {
      const spk = this._config.speakers.find(s =>
        (typeof s === 'string' ? s : s.entity) === memberId);
      if (spk) {
        activeNames.push(typeof spk === 'object' ? spk.name : memberId.split('.')[1]);
      }
    }
    // Also add other selected speakers not in the Sonos group
    for (const eid of this._selectedSpeakers) {
      if (!gm.includes(eid)) {
        const sonosSt = this._hass.states[eid];
        if (sonosSt?.state === 'playing') {
          const spk = this._config.speakers.find(s =>
            (typeof s === 'string' ? s : s.entity) === eid);
          if (spk) activeNames.push(typeof spk === 'object' ? spk.name : eid.split('.')[1]);
        }
      }
    }
    const speakerName = activeNames.join(', ');

    area.innerHTML = `
      <div class="now-playing">
        <div class="art-wrap">
          ${artUrl ? `<img src="${artUrl}" alt="" />` : `<div class="art-placeholder">&#127925;</div>`}
        </div>
        <div class="track-info">
          <div class="track-source">
            <span class="plex-dot" style="background:${stateColor};box-shadow:0 0 6px ${stateColor}60"></span>
            ${stateText}${speakerName ? ` &mdash; ${this._esc(speakerName)}` : ''}
          </div>
          <div class="track-title">${this._esc(title)}</div>
          ${artist ? `<div class="track-artist">${this._esc(artist)}</div>` : ''}
          ${album ? `<div class="track-album">${this._esc(album)}</div>` : ''}
        </div>
      </div>
      <div class="transport">
        <button class="tbtn ${shuffle ? 'active' : ''}" data-action="shuffle">&#128256;</button>
        <button class="tbtn" data-action="prev">&#9198;</button>
        <button class="tbtn pp" data-action="play_pause">${isPlaying ? '&#10074;&#10074;' : '&#9654;'}</button>
        <button class="tbtn" data-action="next">&#9197;</button>
        <button class="tbtn" data-action="stop" style="font-size:1.1rem">&#9724;</button>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="progress-times">
          <span class="progress-time prog-cur">${this._fmtTime(currentPos)}</span>
          <span class="progress-time">${duration > 0 ? this._fmtTime(duration) : ''}</span>
        </div>
      </div>`;

    area.querySelectorAll('.tbtn').forEach(btn => {
      btn.addEventListener('click', () => this._transport(btn.dataset.action));
    });

    if (this._progressInterval) clearInterval(this._progressInterval);
    if (isPlaying && duration > 0) {
      this._progressInterval = setInterval(() => {
        const fill = this.shadowRoot?.querySelector('.progress-fill');
        const cur = this.shadowRoot?.querySelector('.prog-cur');
        if (!fill || !cur || !updatedAt) return;
        const c = Math.min(position + (Date.now() - updatedAt.getTime()) / 1000, duration);
        fill.style.width = `${(c / duration) * 100}%`;
        cur.textContent = this._fmtTime(c);
      }, 1000);
    }
  }

  async _transport(action) {
    // Transport commands go to the SONOS coordinator entity directly.
    // MA entities are always idle — sending commands to them does nothing.
    const coordinator = this._findCoordinator() || this._lastCoordinator;
    if (!coordinator) return;

    const sonosState = this._hass.states[coordinator]?.state;

    const svcMap = {
      play_pause: 'media_play_pause',
      next: 'media_next_track',
      prev: 'media_previous_track',
      stop: 'media_stop',
      shuffle: 'shuffle_set',
    };
    let svc = svcMap[action];
    if (!svc) return;

    // Sonos goes to 'idle' when paused (not 'paused').
    // media_play_pause on idle starts queue from top.
    // media_play on idle resumes from current position.
    if (action === 'play_pause' && sonosState === 'idle') {
      svc = 'media_play';
    }

    const data = {};
    if (action === 'shuffle') {
      data.shuffle = !(this._hass.states[coordinator]?.attributes?.shuffle || false);
    }
    await this._hass.callService('media_player', svc, data, { entity_id: [coordinator] });
  }

  _updateSpeakers() {
    const coordinator = this._findCoordinator();

    // Sync selected speakers from actual Sonos group membership
    if (coordinator) {
      const coordState = this._hass.states[coordinator];
      const groupMembers = coordState?.attributes?.group_members || [];
      if (groupMembers.length > 1) {
        for (const memberId of groupMembers) {
          if (this._speakerEls[memberId]) {
            this._selectedSpeakers.add(memberId);
          }
        }
      }
    }

    for (const spk of this._config.speakers || []) {
      const entityId = typeof spk === 'string' ? spk : spk.entity;
      const slot = this._speakerEls[entityId];
      if (!slot) continue;

      const sonos = this._hass.states[entityId];
      const baseName = slot.configName || sonos?.attributes?.friendly_name || entityId.split('.')[1];
      const isSelected = this._selectedSpeakers.has(entityId);
      const isCoord = coordinator === entityId;

      // Is this speaker actively playing? Check Sonos state directly.
      const sonosPlaying = sonos?.state === 'playing';
      const groupMembers = sonos?.attributes?.group_members || [];
      const isGrouped = groupMembers.length > 1;
      const groupCoordPlaying = isGrouped && this._hass.states[groupMembers[0]]?.state === 'playing';
      const isActive = sonosPlaying || groupCoordPlaying;
      // Sonos goes idle when paused — detect this
      const isSonosPaused = !isActive && this._isSonosActiveMA(entityId) && sonos?.state === 'idle';

      // Crown prefix for coordinator
      slot.nameEl.textContent = isCoord ? `♛ ${baseName}` : baseName;

      // Status line
      let status = '';
      if (isActive) status = isCoord ? 'Lead' : 'Synced';
      else if (isSonosPaused) status = 'Paused';
      else if (isSelected) status = 'Ready';
      slot.statusEl.textContent = status;

      // Three visual states: inactive (default), selected (outlined), active (filled)
      let cls = 'speaker';
      if (isActive) cls += ' active';
      else if (isSelected) cls += ' selected';
      slot.el.className = cls;
    }
  }

  _fmtTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  disconnectedCallback() {
    if (this._progressInterval) { clearInterval(this._progressInterval); this._progressInterval = null; }
  }
}

customElements.define('typography-plex-card', TypographyPlexCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'typography-plex-card',
  name: 'Typography Plex Card',
  description: 'Plex music via Music Assistant with Sonos speaker targeting'
});
