repo: Geminsim/dmforge
branch: main

## Last sync

date: 2026-08-14T04:05:00Z

### Updated in this project

- Synced the new upstream live-stream surface: `09-presenter.html` recreates the `/presenter` page with all five scenes (战斗 / 地图 / 队伍 / 剧情 / 暂停), caption bar and font scale.
- Added the DM-side presentation control block to the settings modal, and `Slider` to the component library (the product's first range input).
- Extended the campaign fixtures with the public-snapshot fields the presenter needs: AC, speed, turn-order rolls, public events.
- Presenter runs in the player type register (EB Garamond / Cinzel / Alegreya Sans SC) since it is audience-facing.

## Screen map

| Screen | Built from |
| --- | --- |
| `ui_kits/dm-console/01-tactical-map.html` | `src/components/MapSystem.jsx`, `src/components/CampaignWorkspace.jsx` |
| `ui_kits/dm-console/02-roster.html` | `src/components/CharacterList.jsx` |
| `ui_kits/dm-console/03-dice-and-log.html` | `src/components/DiceRoller.jsx`, `src/components/ActionLog.jsx` |
| `ui_kits/dm-console/04-item-hub.html` | `src/components/ItemManager.jsx` |
| `ui_kits/dm-console/05-sheet-import.html` | `src/components/ExcelImporter.jsx` |
| `ui_kits/dm-console/06-settings.html` | `src/App.jsx` (settings modal) + `src/components/PresentationControls.jsx` |
| `ui_kits/dm-console/07-player-view.html` | `src/App.jsx` (`isPlayerViewMode`) |
| `ui_kits/dm-console/08-floating-notes.html` | `src/components/FloatingNote.jsx`, `src/components/ActionLog.jsx` |
| `ui_kits/dm-console/09-presenter.html` | `src/components/PresenterPage.jsx`, `src/components/PresenterPage.css`, `src/utils/presentation.js`, `src/main.jsx` (route) |
| `ui_kits/dm-console/data.js` | `campaign_state.json`, `src/utils/presentation.js` (public snapshot shape) |
| `tokens/*.css` | `src/index.css` (structure and metrics only — palette intentionally replaced) |

## Sync history

### 2026-08-14T02:30:00Z — initial build

- Built the design system from scratch: three switchable themes, 26 components, an 8-screen console kit.
- Fonts and iconography substituted (flagged in readme.md).
