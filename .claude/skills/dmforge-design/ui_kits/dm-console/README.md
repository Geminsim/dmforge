# UI kit — DMForge 战役控制台 (DM Console)

Rendered in the **signature plate grammar** (see the root readme): corner-bracket plates, dotted-leader value rows, segmented meters, bracket tabs, coordinate rulers on the map, bottom status line. Default theme is `grimoire` (ink-black ground + aged-paper text + rubrication red); the header switcher swaps to `slate` or `terminal` without changing a single measurement. The header also carries a screen picker when the page passes `picker` (see `/Theme Preview.html`), so all eight screens can be browsed in one full-viewport page.

Recreation of the DMForge desktop console from `Geminsim/dmforge` (`src/App.jsx`, `src/components/*`), rebuilt on the new three-theme design system. Layout, tabs, panel inventory, control labels and tooltip copy are taken from the source; only the visual language is new.

## Screens

| File | Screen | Source |
| --- | --- | --- |
| `index.html` | Console entry (starting point) | `src/App.jsx` shell |
| `01-tactical-map.html` | 战术地图主视图 | `src/components/MapSystem.jsx` |
| `02-roster.html` | 角色名册与角色卡 | `src/components/CharacterList.jsx` |
| `03-dice-and-log.html` | 掷骰器与战役日志 | `src/components/DiceRoller.jsx`, `ActionLog.jsx` |
| `04-item-hub.html` | 物品流转中心 | `src/components/ItemManager.jsx` |
| `05-sheet-import.html` | 玩家卡与规则书导入 | `src/components/ExcelImporter.jsx` |
| `06-settings.html` | 战役系统设置 | `src/App.jsx` settings modal |
| `07-player-view.html` | 玩家展示端（只读） | `src/App.jsx` `isPlayerViewMode` |
| `08-floating-notes.html` | 浮动笔记工作台 | `src/components/FloatingNote.jsx` |
| `09-presenter.html` | 直播展示端（5 个场景） | `src/components/PresenterPage.jsx`, `PresenterPage.css`, `PresentationControls.jsx`, `src/utils/presentation.js` |

### Right rail: one pane at a time

The source app stacks the dice roller, the log feed and the note list in the right column simultaneously. That column is the densest part of the product and the stack forces every panel to fight for height. This kit replaces it with a single **`RightRail`** panel whose header carries a 3-way switch — 掷骰 / 日志 / 笔记 — so exactly one pane is on screen, full height, with its own scroll. Roll history is collapsed behind a count toggle rather than always expanded. If you rebuild the real app, this is the recommended pattern.

Every page carries the `ThemeSwitcher` in the header; the choice persists in `localStorage` under `dmforge-kit-theme`, so switching on one page carries to the others.

## Files

- `data.js` — campaign fixture. Characters, items, terrain, notes and logs come from the repo's `campaign_state.json`. Three roster rows (莉拉 / 巴克 / 独眼老汉) and a few log lines are plausible fill added so lists read realistically — they are not in the source data.
- `Side.jsx` — left roster column, expanded character sheet, and the right rail (`RightRail` + `DicePane` / `LogPane` / `NotesPane`).
- `Work.jsx` — map canvas + toolbar, item hub, sheet import, settings modal (including the presentation control block).
- `Presenter.jsx` — the `/presenter` live-stream surface: the five scenes, the active-character panel, party cards, public-event ticker, caption, and the DM-side `PresentationControls`. Geometry follows `PresenterPage.css` (36px presenter grid, 5.5rem initiative rail, `minmax(18rem,25%)` character panel, `minmax(19rem,1fr)` party grid); styling is ours.
- `Shell.jsx` — header, three-column shell, theme state, screen routing.

## Deliberately not recreated

- Real drag, zoom/pan (`react-zoom-pan-pinch`), pathfinding and xlsx parsing — these are cosmetic mocks.
- Map background images: the source ships none (`bgUrl` is empty in `campaign_state.json`), so the canvas shows the grid only.
