# Typography HA Cards

A suite of custom Home Assistant Lovelace cards with a data-forward, typographic design. Built for the Space Grotesk font family with high-contrast dark themes.

## Cards

Twenty-three cards. Each one registers itself in the dashboard card picker.

**Controls**

| Card | Description |
|------|-------------|
| `typography-lights-card` | Light controls with swipe brightness, list or grid layout |
| `typography-light-grid-card` | Grid tile lights with vertical swipe brightness and conditional visibility |
| `typography-cover-card` | Cover/shade controls with swipe position |
| `typography-media-card` | Media players with status indicators and volume sliders |
| `typography-action-card` | Script/scene buttons in a grid with tap feedback |
| `typography-gate-card` | Gate status and control with action buttons |

**Climate and weather**

| Card | Description |
|------|-------------|
| `typography-climate-card` | Climate zones with big temperature typography and colored backgrounds |
| `typography-zone-card` | HVAC zones as horizontal bars, showing deviation from setpoint |
| `typography-weather-card` | Weather with temperature-colored text and forecast range bars |

**Status and data**

| Card | Description |
|------|-------------|
| `typography-status-card` | Multi-entity status panel with a hero value and metric grid |
| `typography-entity-card` | Entity display for conditions, people and sensors |
| `typography-alert-card` | Conditional alerts with color-coded severity |
| `typography-clock-card` | Big clock with date and optional stat chips |
| `typography-graph-card` | SVG history graph with a big current value (WebSocket history) |
| `typography-sparkline-card` | Compact inline sparklines with current values |
| `typography-gauge-card` | SVG semicircle gauge with a big value |
| `typography-battery-card` | Battery levels, lowest first, with color bars |

**Infrastructure**

| Card | Description |
|------|-------------|
| `typography-mesh-card` | Zigbee mesh health with signal-strength bars |
| `typography-container-card` | Container status list with CPU and memory |
| `typography-statuspage-card` | Uptime history bars in the style of statuspage.io |
| `typography-printer-card` | Printer status with CMYK toner bars |

**Integration-specific**

| Card | Description |
|------|-------------|
| `typography-plex-card` | Plex music through Music Assistant, with Sonos speaker targeting |
| `typography-irrigation-card` | Irrigation dashboard with zone controls; reads the `sensor.radix_*` entities from a Radix irrigation controller. Optional `rain_today` / `rain_month` sensors fill the rain stats. |

## Installation

1. Copy all `.js` files to your Home Assistant `/config/www/` directory
2. Add each card as a Lovelace resource (Dashboard → Resources → Add):
   - URL: `/local/typography-<card>.js`
   - Type: JavaScript Module
3. Load Space Grotesk font via `extra_module_url` in `configuration.yaml`

## Design

- **Font**: Space Grotesk (Google Fonts)
- **Theme**: True black background, high contrast
- **Interaction**: Swipe/drag for brightness, volume, and position controls with center-focused dead zones
- **Shadow DOM**: Each card declares `@font-face` inside its shadow root for reliable font loading

## License

MIT — see [LICENSE](LICENSE).
