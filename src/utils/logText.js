/**
 * Log lines used to carry their own emoji prefix ("🎲 掷骰 […]"), because the
 * old renderer had no icon of its own. The design system's LogEntry draws a
 * Phosphor glyph from the entry `type`, so the prefix is now duplicate
 * decoration — and the brand rules forbid emoji outright.
 *
 * New call sites simply omit it. Campaign saves written before this change
 * still contain it, so strip it at render time rather than migrating files:
 * the save format is the user's data and a one-way rewrite of it to fix a
 * cosmetic detail is not worth the risk.
 */

// Pictographs, dingbats, variation selectors and the ZWJ used to glue them.
const EMOJI = new RegExp(
  '[\\u{1F000}-\\u{1FAFF}\\u{2190}-\\u{27BF}\\u{2B00}-\\u{2BFF}]'  // pictographs and dingbats
  + '|\\u{FE0F}'                                                   // variation selector-16
  + '|\\u{200D}'                                                   // zero-width joiner
  + '|\\u{20E3}',                                                  // combining keycap
  'gu'
);

export function stripEmoji(text) {
  if (typeof text !== 'string') return text;
  return text.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
}
