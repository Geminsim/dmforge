/**
 * Theme + type-register plumbing for the design system.
 *
 * Palette lives on `data-theme` (grimoire | slate | terminal) and the type
 * register on `data-view` (player), both readable from any wrapper. We put the
 * palette on <html> so modals and the presenter window inherit it too.
 */

export const THEME_STORAGE_KEY = 'dmforge_theme';
export const DEFAULT_THEME = 'grimoire';
export const THEME_IDS = ['grimoire', 'slate', 'terminal'];

export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_IDS.includes(stored) ? stored : DEFAULT_THEME;
  } catch {
    // Private mode / storage disabled — the default theme is still correct.
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  const next = THEME_IDS.includes(theme) ? theme : DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Non-fatal: the attribute is already set, only persistence is lost.
  }
  return next;
}
