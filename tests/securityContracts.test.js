import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');

// Log lines carry campaign text the DM typed and, over LAN sync, text that
// arrived from another machine. Whatever renders them must never reach for
// innerHTML. The renderer moved from ActionLog into the design system's
// LogEntry (which parses **bold** itself), so both ends of that path are
// checked here — LogPane must not add its own escape hatch either.
test('user-controlled log content is not rendered through raw HTML', () => {
  for (const path of ['../src/ds/components/campaign/LogEntry.jsx', '../src/components/LogPane.jsx']) {
    assert.equal(read(path).includes('dangerouslySetInnerHTML'), false, `${path} must not use dangerouslySetInnerHTML`);
  }
});

// Dice formulas are free text. The evaluator must stay a parser, never eval.
test('dice evaluation does not use dynamic code execution', () => {
  const source = read('../src/components/DicePane.jsx');
  assert.equal(/\b(?:eval|Function)\s*\(/.test(source), false);
});
