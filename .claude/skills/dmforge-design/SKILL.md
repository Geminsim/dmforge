---
name: dmforge-design
description: Use this skill to generate well-branded interfaces and assets for DMForge, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Quick orientation for DMForge specifically:

- The product is a Chinese-language, local-first TTRPG game-master console. One surface (a three-column desktop app) plus a read-only player display. Write UI copy in Simplified Chinese; see the CONTENT FUNDAMENTALS section of README.md before writing a single label.
- Three switchable themes, one grammar. Link `styles.css` and set `data-theme="grimoire"` (ink codex — the signature default, also what `:root` resolves to), `"slate"` (charcoal + brass) or `"terminal"` (cold near-black + cyan) on a wrapper. All three are dark. Never hard-code a hex; every colour, size and duration is a token.
- Icons: Phosphor Fill from CDN — `<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">`, then `<i class="ph-fill ph-dice-six"></i>`. No emoji, ever.
- Numbers, dice formulas, coordinates and timestamps always render in IBM Plex Mono.
- Two type registers: the console default (Source Sans 3 + Noto Sans SC body, Spectral display) and the player display — add `data-view="player"` to a wrapper and it switches to the rulebook set (EB Garamond / Cinzel / Alegreya Sans SC) one step larger.
- No logo exists: render the wordmark `DMForge` in Spectral 700 with the M in `--accent`. Never invent a mark.
- Start from `ui_kits/dm-console/` for anything screen-shaped, and from `components/*/` for primitives. Foundation specimens live in `guidelines/` — `themes-overview.html` and `plate-grammar.html` first.
