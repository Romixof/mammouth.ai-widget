# Mammouth AI - Quota Tracker

A Tampermonkey userscript for tracking your Mammouth AI quota usage in real-time.

## Preview

![Mammouth Quota Tracker Widget](public/screenshot.png)

*The widget appears in the bottom-right corner of mammouth.ai. Click the minimize button to toggle the compact ring view.*

## Features

- **Real-time quota tracking** — Shows actual quota percentage from API + DOM
- **Sliding 3-hour window** — Tracks requests with individual costs
- **Auto-calibration** — Learns your total quota from API usage vs DOM percentage
- **Minimized widget** — Independent ring + text modes (time remaining / quota used / quota remaining)
- **Real cost measurement** — Measures actual API cost per request via `currentUsage` endpoint
- **Notifications** — Browser notifications at 70%, 90%, 100% quota
- **7-day history** — Visual chart of quota consumption
- **Export/Import** — Backup and restore all settings + data
- **Auto-update** — Checks for updates via GitHub (configure `@updateURL`)

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click [here to install](https://raw.githubusercontent.com/Romixof/mammouth.ai-widget/main/mammouth-plugin.user.js) (or manually create a new script and paste the code)
3. Visit [mammouth.ai](https://mammouth.ai/app) — widget appears bottom-right

## Usage

### Widget Overview
| Element | Description |
|---------|-------------|
| **Quota Réel** | Current quota % (red ≥90%, amber ≥70%, green <70%) |
| **Rafraîchir ♻️** | Force API + DOM scan, triggers calibration |
| **Fenêtre glissante** | 3h sliding window countdown |
| **⚙️ Settings** | Toggle auto-scan, thresholds, notifications, minimized modes |
| **Calibrer** | Navigate to settings page for fresh calibration |

### Minimized Modes (Independent)
- **Texte minimisé** — Center text: Time remaining / Quota used / Quota remaining
- **Anneau minimisé** — Ring progress: Time elapsed / Quota used / Quota remaining

### Calibration
The script automatically calibrates when you visit **Settings → Account**:
1. Reads quota % from the page's quota bar (`aria-valuenow`)
2. Fetches raw usage (cents) from `recentUsage` API
3. Computes: `total_quota = raw_used / (dom_percent / 100)`
4. Locks calibration — future quota % calculated from API usage

Manual calibration: Click **Rafraîchir ♻️** on any page, or **Calibrer** in settings.

## Configuration

All settings persisted in `localStorage` (survives browser restarts):

| Setting | Default | Description |
|---------|---------|-------------|
| Scan API auto | Enabled | Poll `recentUsage` every 5 min |
| Seuil requête (¢) | 1.0¢ | Ignore micro-requests below this |
| Notifications | Enabled | Browser notifications at thresholds |
| Texte minimisé | Temps restant | Center text in minimized ring |
| Anneau minimisé | Temps restant | Ring progress meaning |

## API Endpoints Used

- `GET /api/user/recentUsage` — Quota % + raw usage by brand + models
- `GET /api/user/currentUsage` — Current spend in cents (for cost measurement)

## Auto-Update Setup

Edit the script header with your GitHub repo:

```javascript
// @updateURL    https://raw.githubusercontent.com/Romixof/mammouth.ai-widget/main/mammouth-plugin.js
// @downloadURL  https://raw.githubusercontent.com/Romixof/mammouth.ai-widget/main/mammouth-plugin.js
```

Tampermonkey checks `@updateURL` every 24h. Bump `@version` on each release.

## Revert to Previous Version

In Tampermonkey dashboard → Installed scripts → Mammouth AI - Quota Tracker → Versions tab → Click "Install" on any previous version.

## License

MIT License — see [LICENSE](LICENSE)

## Author

**Romixo** — [GitHub](https://github.com/Romixof)