import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('user-controlled log content is not rendered through raw HTML', () => {
  const source = fs.readFileSync(new URL('../src/components/ActionLog.jsx', import.meta.url), 'utf8');
  assert.equal(source.includes('dangerouslySetInnerHTML'), false);
});

test('dice evaluation does not use dynamic code execution', () => {
  const source = fs.readFileSync(new URL('../src/components/DiceRoller.jsx', import.meta.url), 'utf8');
  assert.equal(/\b(?:eval|Function)\s*\(/.test(source), false);
});
