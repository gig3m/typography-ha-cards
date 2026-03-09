# Typography HA Cards

A suite of custom Home Assistant Lovelace cards with a data-forward, typographic design. Built for the Space Grotesk font family with high-contrast dark themes.

## Cards

| Card | Description |
|------|-------------|
| `typography-lights-card` | Light controls with swipe brightness, list or grid layout |
| `typography-light-grid-card` | Grid tile lights with vertical swipe brightness |
| `typography-climate-card` | Climate zone display with colored backgrounds |
| `typography-weather-card` | Weather with temperature-colored text and range bars |
| `typography-status-card` | Multi-entity status grid with smart domain defaults |
| `typography-media-card` | Media players with volume sliders |
| `typography-graph-card` | SVG history graphs with WebSocket data |
| `typography-gauge-card` | SVG semicircle gauges |
| `typography-cover-card` | Cover/shade controls with swipe position |
| `typography-action-card` | Script/scene buttons with tap feedback |
| `typography-entity-card` | Entity toggles and person cards |
| `typography-alert-card` | Conditional alert display |

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

MIT
