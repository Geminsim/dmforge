# DMForge Design System

DMForge (`DMForge 战役辅助台`) is a **local-first campaign console for tabletop RPG game masters** — a single-window desktop app a DM runs on their own machine during a session. It bundles a 1ft tactical map, character & item management, turn-based combat, a dice roller, a campaign log, floating notes, Excel character-sheet import, and a read-only LAN player display.

It is not a web product: there is no marketing site, no docs site, no account system. One surface, one user (the DM), plus a read-only mirror for players at the table.

## Sources this system was built from

| Source | What was read |
| --- | --- |
| https://github.com/Geminsim/dmforge (branch `main`) | `README.md` (product scope, LAN sync, Excel limits), `src/index.css` + `src/App.css` (the old theme), `src/App.jsx` (shell, header, settings modal), `src/components/*.jsx` (DiceRoller, ActionLog, FloatingNote, CampaignWorkspace, plus label/tooltip inventory from CharacterList, MapSystem, ItemManager, ExcelImporter), `campaign_state.json` (real campaign data used as fixtures), `package.json` (React 19, lucide-react, react-zoom-pan-pinch, xlsx) |

You are encouraged to browse that repository further — component-level detail (map pathfinding, combat rules, Excel worker, sync token handling) lives in `src/components/` and `src/utils/`, and reading it will make any DMForge design work more accurate than working from this document alone.

**This system deliberately does NOT reproduce the upstream visual theme.** The old UI was a purple neon glassmorphism dark theme (`--accent-purple: #c084fc`, blurred glass panels, glow shadows, pulsing keyframes, emoji tab labels). At the user's direction it has been fully replaced. What was carried over: information architecture, panel inventory, control labels, tooltip copy, terminology, and the semantic idea that map/terrain state is colour-coded.

## Products / surfaces

1. **DM console** (`ui_kits/dm-console/`) — the app. Three resizable columns: roster on the left, workspace in the middle (tactical map / item hub / sheet import), and a right rail that shows **one** of 掷骰 / 日志 / 笔记 at a time (a deliberate change from the source, which stacks all three); settings modal; floating notes over the map.
2. **Player display** — the same console in `isPlayerViewMode`: read-only, DM-private terrain and notes hidden. Shipped as screen `07-player-view.html` in the same kit.
3. **Live presenter** (`/presenter`, added upstream Aug 2026) — a second window/tab for streaming the session to Discord or a TV. It receives a filtered public snapshot over `postMessage` / `BroadcastChannel` (never DM notes, secret terrain or the sync token) and renders one of five scenes: `battle` (initiative rail + map + active-character panel + public-event ticker), `map`, `party`, `story`, `pause`, plus a caption bar, font-scale and hide-cursor options. Driven from a control block in the DM's settings modal. Shipped as `09-presenter.html`; it runs in the **player type register** because the audience reads it from across the room.

No slide template was provided, so no slide deck exists in this system.

## The three themes

All three are dark colorways (the light parchment variant was dropped at the user's request), switchable at runtime via `data-theme` on any wrapper (see `components/theme/ThemeSwitcher.jsx`, and the switcher in every UI kit page header — the choice persists in `localStorage`).

| Theme | `data-theme` | Ground | Accent | Character |
| --- | --- | --- | --- | --- |
| 墨色典籍 Ink codex — **signature, default** | `grimoire` | warm ink-black `#171311` | rubrication red `#c0503a` | aged-paper text on ink, faint paper texture, paper-white brackets |
| 石板烛火 Slate & candlelight | `slate` | charcoal `#14120f` | brass `#c9a227` | the same grammar, cooler and dimmer, brass brackets |
| 战术终端 Tactical terminal | `terminal` | cold near-black `#0a0c0e` | signal cyan `#57cbdc` | the same grammar at its coldest, mono headings, cyan brackets |

There is currently **no light theme**. If you want one for reading imported spreadsheets in a bright room, say so — the token structure supports adding it without touching a component.

Only the palette changes: the **plate grammar** below, the type scale, spacing and component structure are identical across all three. A design built for one theme works in all three if it uses tokens.

## Brand identity

There is **no logo** — the source repository ships none, and none was invented. The identity is the wordmark plus the plate grammar.

- **Wordmark:** `DMForge` set in Spectral 700, +.02em, with the **M in `--accent`** — so the mark recolours with the active theme (rubrication red / brass / signal cyan) and needs no separate asset. Small sizes and page headers use `DMFORGE` in single-colour uppercase at +.2em tracking.
- **App-icon slot:** a square `--accent` plate with a paper-coloured `D`. Explicitly a placeholder, not a logo.
- **Never:** outline, shadow, gradient or skew the wordmark; colour any letter other than the M; put a red M on a rubrication ground (use the single-colour `--text-on-accent` version).
- Specimens: `guidelines/brand-wordmark.html`, `guidelines/themes-overview.html`, `guidelines/plate-grammar.html`.

## Switching themes

All three themes are equal citizens of the same system — same tokens, same components, same measurements; only the palette differs. Two independent switches:

```html
<!-- palette: on <html> or on any wrapper element -->
<html data-theme="grimoire">   <!-- or "slate" / "terminal"; :root already resolves to grimoire -->
  <div data-theme="terminal">…</div>   <!-- nested override is legal -->

  <!-- type register: audience-facing subtree -->
  <div data-view="player">…</div>
```

```jsx
const [theme, setTheme] = React.useState('grimoire');
<div data-theme={theme}><ThemeSwitcher value={theme} onChange={setTheme} /></div>
```

Theme scopes are written `[data-theme="x"][data-theme]` (specificity 0-2-0) so they beat the `:root` defaults while still working on a nested wrapper. Never hard-code a hex in a component — a component that reads only tokens is automatically correct in all three themes and in both type registers.

## The plate grammar (the thing that makes it not look like a SaaS dashboard)

Six rules, applied everywhere. `guidelines/plate-grammar.html` is the specimen; `explorations/D-plate.html` is the full-screen reference.

1. **Corner brackets, not borders.** A panel is held by four 10px L-brackets in `--bracket-line` (paper-white on ink, brass on charcoal, cyan on black); it has no border and no shadow. Nested plates use a 1px inset ring instead.
2. **Dotted leaders align every value.** Label on the left, `--rule-dotted` leader in the middle, mono numeral hard right — ability scores, HP, resources, roll formulas.
3. **Meters are segmented, not continuous.** 13 blocks; filled blocks are pigment, empty blocks are a 1px inset outline. Temp HP occupies woad blocks after the fill.
4. **Bracket labels.** Latin section keys are mono, uppercase, letterspaced (`ROSTER`, `DICE`, `LOG`), paired with the Chinese title in the serif. Tabs render as `[ 战术地图 ]`, active state inverted into the accent.
5. **Everything is square.** `--radius-*` is 0. The only round things are status dots and the meter track's pill ends.
6. **The map is a survey plate.** Coordinate rulers (`X04`, `Y08`) in the gutters, a 1px rubrication crosshair through the active token, hatched terrain fills (45° repeating gradient) instead of flat tints, square counters for tokens.

A bottom **status line** (`StatusLine`) closes every screen: ROUND / TURN / MAP / TOOL on the left, SAVE / LAN on the right, all mono micro.

---

# CONTENT FUNDAMENTALS

**Language.** Simplified Chinese is the product language. English appears only as a parenthetical gloss for game-system terms the DM might know from English rulebooks: `力量 (Physical)`, `体质 (Fortitude)`, `战役系统设置 (Campaign Settings)`, `玩家展示端 (Read-Only)`. Never translate a Chinese label into an English one; add the gloss or leave it out.

**Person.** The UI does not address the DM as 你/您 in labels. Labels are bare nouns (`物品流转中心`, `投掷历史`, `资源槽`) and actions are bare verbs (`投掷`, `入库`, `结束回合`, `清空记录`). Second person appears only inside confirmations: `确定要永久删除笔记 [酒馆传闻与秘密] 吗？`

**Tooltips carry the rules.** This is the strongest voice trait in the product: an icon or short button gets a long, literal tooltip that states the mechanical consequence, in parentheses when there are several:

> `对选中的角色进行长休（恢复全部生命值/资源槽，重置移动力，且彻底清除负面状态）`
> `开启后，战斗中可无视回合与移动力限制强制移动任何棋子，且不扣减其移动力（或在拖拽时按住 Shift 键触发临时强制位移）`
> `撤销当前回合的棋子移动，返回本回合行动起点，并完全复原移动力`

Write tooltips like rules text, not like marketing. Every icon-only control has one.

**Placeholders teach by example.** `自定义公式如: 2d6+4 或 2d20kh1+5` · `新建分组名称 (如: 地牢伏兵)` · `手填其他自定义效果...` · `可粘贴外部网络或本地图片 URL 地址`. Trailing `...` on open-ended text fields is idiomatic here.

**Destructive copy names the object and the irreversibility.** `确定要清空所有战役历史记录吗？（此操作不可撤销）` · `彻底从本战役中移除此角色卡` · `永久删除规则书`. Use 彻底 / 永久 / 不可撤销 deliberately; do not soften them.

**Empty states are italic, factual, and point at the next action.** `暂无掷骰历史` · `暂无保存的对话笔记，可点击上方按钮创建。` · `该分类下暂无记录发生。`

**Numbers are literal and never rounded.** Dice notation stays raw (`2d8+3`, `5d6`, `1d8+2`, `2d20kh1+5`); limits are stated exactly (`单文件最大 2MB，最多 50 个工作表`, `最多 501 行、101 列`, `战役 JSON 上限为 10MB`). All of it renders in mono.

**Log lines use `**bold**` for the outcome number.** `掷骰 [2d6+4] 结果: **13**` · `受到 **8** 点物理伤害，剩余 **7/15**`. The bold span renders in mono — the number is the point of the sentence.

**Flavour text is allowed, in one place only:** floating notes and rulebook bodies, where the DM writes prose for the table (`听酒馆老板娘提起，北山废弃矿井深处，每到月圆之夜就会传出低沉的龙吼声。`). Set it in the display serif, italic, muted. Never write flavour prose into UI chrome.

**Emoji: no.** Upstream used them heavily as labels (`🗺 1ft 战术地图`, `🎒 物品流转中心`, `🎲 核心掷骰器`, `📜 战役历史记录`, `🚀 已成功初始化`). This system removes every one and replaces it with a Phosphor Fill glyph. Do not reintroduce emoji, and do not use unicode dingbats as icons either.

**Casing.** No uppercase-with-tracking treatment on Chinese — ever. It is allowed only for tiny Latin section labels (`ROUND`, `TOOLS`) via `ToolbarLabel` / `--tracking-label`. No title case affectation in English glosses.

**Terminology (use exactly these words).** 战役 campaign · 棋子 token · 先攻 initiative · 回合 round/turn · 短休 / 长休 short/long rest · 资源槽 resource slot · 阻挡格 blocked cell · 地形区域 terrain area · 物品流转 item transfer · 规则书 rulebook · 存档 save file · 同步令牌 sync token · 玩家展示端 player display.

---

# VISUAL FOUNDATIONS

## Colour

Three theme palettes (above), each with exactly **one** accent. The accent is scarce: primary buttons, the active tab underline, focus rings, the active-turn ring, the newest dice total, search highlight. If two accent-coloured things sit next to each other, one of them is wrong.

Semantic colour is a **pigment set** — desaturated paint-box hues, deliberately not the neon RGB of the old theme, but still unmistakably red / green / blue / yellow:

| Token | Pigment | Means |
| --- | --- | --- |
| `--pigment-madder` | 茜红 madder | danger, monsters, damage, critical HP |
| `--pigment-verdigris` | 铜绿 verdigris | NPCs, poison/gas terrain, healthy HP |
| `--pigment-woad` | 菘蓝 woad | player characters, cold/water terrain, temp HP |
| `--pigment-ochre` | 赭石 ochre | traps, warnings, wounded HP, note markers |

Each has `-soft` (background tint) and `-line` (border) companions, retuned per theme so contrast holds on parchment and on near-black. Text has exactly three levels (`--text-body` / `--text-muted` / `--text-faint`) plus `--text-on-accent`; resist inventing a fourth.

## Type

- **Display / headings — Spectral** (serif, 600), CJK companion **Noto Serif SC**. Serif on a dark ground is the codex signature — do not swap it for a sans. Screen titles, panel titles, character names, wordmark. `--display-tracking` is near-zero; never letterspace CJK.
- **Body — Source Sans 3** + **Noto Sans SC**. 14px / 1.6 default; 13px controls; 12px meta; 11px micro. Density is deliberately looser than upstream (which used 10–12px everywhere).
- **Numerals — IBM Plex Mono**, always. HP, ability scores, dice formulas, grid coordinates, timestamps, counts, IDs, file sizes. A number rendered in the sans font is a bug.
- The **terminal** theme swaps `--font-display` to IBM Plex Mono at weight 500 / +.02em — the only per-theme type change. Chinese headings in that theme fall back to Noto Sans SC (Plex Mono has no Han glyphs), which keeps the technical register without a second serif in play and adds no extra font request.

## Layout

Fixed app chrome, scrolling content: header 56px, tab bar 44px, side columns 340px (resizable via a 4px `ResizeHandle` with a ±5px hit area), map cell 40px = 1ft. The centre column is the only region that changes with the active tab. Nothing is centred in a page-width container; this is a console, so panels fill their column edge to edge and the outer padding is 16px.

## Surfaces, borders, radii

Panels are **solid** (`--surface-panel`), framed by corner brackets, with no border and no shadow. Rows sit on `--surface-raised` with a 1px inset ring; inputs are recessed onto `--surface-sunken`, also with an inset ring rather than a border. Every radius is 0. Cards are **rule-first**: an allegiance colour enters as a 2px inset rule on the left edge, never as a coloured border box. The only elevated surfaces are floating notes and modals.

## Transparency, blur, textures

Blur exists in exactly two places: the modal scrim (2px) and floating notes / map overlays (8px), because those sit above live content. Panels never blur — that was the old theme's signature and it is gone. `grimoire` carries a barely-there paper texture (`--texture-surface`, two 1px repeating gradients at ~1.4% opacity — the last trace of the parchment origin); `slate` and `terminal` use none. The tactical grid is drawn with `--grid-line`, always fainter than a hairline border.

## Shadows

`--shadow-panel` is `none` in all three themes — plates are held by brackets. `--shadow-float` (notes, map counters) and `--shadow-modal` (dialogs) are the only elevations. **No glow shadows anywhere** — no `box-shadow` in an accent colour, no `text-shadow`.

## Motion

Restrained by direction: fades and a 2px rise, nothing else. 90ms press, 140ms hover/colour, 200ms panel entry and meter fills, 280ms column collapse; `--ease-standard: cubic-bezier(.2,0,.2,1)`. Removed from the old theme: the 400ms dice shake, the 2.2s neon token pulse, the sync-dot breathing glow, and the scale-up bounce on modals. Two keyframes exist (`dmf-fade-in`, `dmf-rise-in`) and `prefers-reduced-motion` zeroes every duration.

## States

- **Hover** — surface steps up one level (`raised → hover`) and/or text goes from muted to body; borders may go hairline → strong. Never a colour glow, never a transform on rows.
- **Press** — `--accent-press` (a darker accent) on filled buttons; no shrink transform.
- **Active / selected** — `--accent-soft` background + `--accent-line` border; for tabs, a 2px accent underline; for the combat turn, a steady 2px accent ring on the token and an accent-soft card.
- **Focus** — `--ring-focus` (2px accent ring at 45% alpha). Visible on keyboard focus, on every control.
- **Disabled** — 42% opacity, `not-allowed`; no greyscale filter.
- **Danger** — always tinted (`--pigment-madder-soft` + madder text/border), never a solid red fill.

## Imagery

The product ships **no imagery**: no logo, no illustrations, no photography, and `bgUrl` is empty in the shipped campaign save, so map backgrounds are user-supplied URLs. Consequently this system contains no `assets/` image files. Where a mark would go, set the wordmark in Spectral (see `guidelines/brand-wordmark.html`). If you need a placeholder image in a mock, use a neutral flat `--surface-sunken` block with a hairline border and a mono caption — do not generate art, and do not invent a DMForge logo.

## Data-visualisation habits

The tactical map is the system's one "chart": 45° hatched pigment fills with `-line` borders (dashed for DM-only areas), circles for radius terrain and rectangles for grid terrain, blocked cells as `--surface-hover` squares. Tokens are flat pigment **squares** with a two-character initial in the display serif and a 1px bracket-line edge; the active token gets an offset accent outline. Coordinate rulers and a crosshair replace any legend chrome — no gradients, no spheres, no glow.

---

# ICONOGRAPHY

**Upstream:** `lucide-react` (stroke icons, ~1.5px weight) mixed with emoji used as labels. Both are replaced.

**This system: [Phosphor Icons](https://phosphoricons.com/) — Fill weight**, loaded from CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
<i class="ph-fill ph-dice-six"></i>
```

⚠️ **Substitution flagged for review.** The repo contains no icon font, sprite or SVG set of its own (`public/icons.svg` and `public/favicon.svg` are unmodified Vite starter assets — social glyphs and the Vite bolt — so they were deliberately *not* copied in). Phosphor Fill was chosen because the direction called for filled icons and because Phosphor's set covers the TTRPG vocabulary this product needs: `dice-six`, `sword`, `shield`, `scroll`, `backpack`, `flask`, `map-trifold`, `campfire`, `moon-stars`, `skull`, `wall`, `crosshair`, `users-three`, `note`, `table`, `file-xls`, `gear-six`, `eye` / `eye-closed`. **If DMForge has or wants a real icon set, send it and it replaces this one.**

Rules: every component takes an icon by *name* (`icon="dice-six"`), fill weight only, size 10–18px inline with text, colour inherits from the control (accent for panel titles, `--text-muted` for row actions, pigment for semantic states). No emoji. No unicode dingbats. No hand-drawn SVG icons — if a glyph is missing from Phosphor, ask rather than draw.

---

# Components

All components are plain React + CSS custom properties, grouped by concern. Each directory has a `@dsCard` HTML showing its states.

**`components/actions/`** — `Button`, `IconButton`, `Tabs`, `SegmentedControl`, `Toolbar` (+ `ToolbarDivider`, `ToolbarLabel`)
**`components/forms/`** — `TextInput` (single-line, multiline, mono), `Select`, `Checkbox`, `Slider`
**`components/surfaces/`** — `Panel`, `Modal`, `ResizeHandle`, `EmptyState`
**`components/data/`** — `Badge`, `StatPill`, `Meter`, `ResourceSlot`, `StatusDot`, `StatusLine`
**`components/dice/`** — `DiceButton`, `RollResult`
**`components/map/`** — `MapToken`, `TerrainChip`
**`components/campaign/`** — `CharacterCard`, `ItemRow`, `LogEntry`, `FloatingNoteCard`, `InitiativeTrack`, `SheetTable`
**`components/theme/`** — `ThemeSwitcher`

Every one maps to something that exists in the source app. `.prompt.md` next to each file says what it is and when to use it.

### Intentional additions

- **`ThemeSwitcher`** — the source has a single hard-coded theme. This system ships three, so a switcher is required to use them.
- **`Meter`** — upstream drew HP bars inline in `CharacterList.jsx`; extracted because HP, temp HP and resource bars appear in four screens.
- **`EmptyState`** — upstream repeated the same italic muted placeholder in five places; extracted verbatim in behaviour.
- **`StatusLine`** — part of the plate grammar: the console needs a bottom readout for round / turn / tool / sync, which the source scatters across the header.
- **`Slider`** — the presentation controls introduced the product's first range input (live font scale), so the primitive now exists.

Nothing else was invented: there is no Toast, Avatar, Tooltip, Accordion or Breadcrumb component, because the product has none.

# Index

| Path | What |
| --- | --- |
| `styles.css` | Global entry — `@import` list only. Consumers link this one file. |
| `tokens/fonts.css` | Google Fonts import (Spectral, Source Sans 3, IBM Plex Mono, Noto Sans SC, Noto Serif SC, EB Garamond, Cinzel, Alegreya Sans SC) |
| `tokens/palette.css` | Raw ramps — never referenced directly by product UI |
| `tokens/themes.css` | The three themes: semantic surface / text / line / accent / pigment aliases |
| `tokens/typography.css` | Font stacks and the type scale |
| `tokens/spacing.css` | Space scale, shell metrics, control heights, radii |
| `tokens/elevation.css` | Borders, shadows, focus ring |
| `tokens/motion.css` | Durations, easings, the two keyframes |
| `tokens/base.css` | Minimal element defaults (body, headings, links, scrollbars, selection) |
| `components/…` | 26 components in 8 groups (list above), each with `.jsx` + `.d.ts` + `.prompt.md` + a group card |
| `ui_kits/dm-console/` | The console recreation: 9 screens + `index.html`, fixtures in `data.js`, own README |
| `guidelines/*.html` | 23 foundation specimen cards (Colors, Type, Spacing, Brand) — start with `themes-overview.html` and `plate-grammar.html` |
| `explorations/D-plate.html` | Full-screen reference for the signature style |
| `Theme Preview.html` | Root-level page: the full-viewport console with a screen picker + theme switcher in its own header |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent-skill entry point |
| `github.md` | Upstream repo association + sync record |

# Caveats

- **No logo.** The repo has no brand mark; none was invented. The wordmark (with its accent-coloured M) is the identity — see the Brand identity section.
- **No local font files.** Upstream loaded Inter + Outfit from Google Fonts; this system loads its replacements the same way, so no binaries are vendored and the compiler reports zero `@font-face` rules. The player-display faces in particular stand in for licensed D&D typography — send real files if DMForge licenses any.
- **Icon set substituted** (Phosphor Fill) — see ICONOGRAPHY.
- **Fixture fill.** Three roster rows and several log lines in the UI kit are plausible additions so lists read realistically; everything else comes from `campaign_state.json`.
