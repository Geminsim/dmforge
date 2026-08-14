/**
 * Floating notes are saved with the old palette's colour names. The design
 * system names its semantic colours after pigments instead, so map rather than
 * migrate — existing campaign saves keep working and a note keeps the colour
 * the DM picked for it.
 */

const COLOR_TO_TONE = {
  purple: 'accent',
  blue: 'woad',
  emerald: 'verdigris',
  amber: 'ochre',
  red: 'madder'
};

const TONE_TO_COLOR = Object.fromEntries(
  Object.entries(COLOR_TO_TONE).map(([color, tone]) => [tone, color])
);

export const NOTE_TONES = ['accent', 'woad', 'verdigris', 'ochre', 'madder'];

export function toneForNote(note) {
  return COLOR_TO_TONE[note?.color] || 'accent';
}

/** Notes are still persisted under the legacy colour names. */
export function colorForTone(tone) {
  return TONE_TO_COLOR[tone] || 'purple';
}
