import test from 'node:test';
import assert from 'node:assert/strict';
import { compactCharacterName } from '../src/utils/characterNames.js';

test('compact character names use the English first name and preserve identity', () => {
  assert.equal(compactCharacterName('James Miller（警卫）'), 'James（警卫）');
  assert.equal(compactCharacterName("Mary O'Connor（特工）"), 'Mary（特工）');
  assert.equal(compactCharacterName('郑亮（警卫）'), '郑亮（警卫）');
  assert.equal(compactCharacterName('实验室所长'), '实验室所长');
  assert.equal(compactCharacterName('Élodie Lefèvre（特工）'), 'Élodie（特工）');
  assert.equal(compactCharacterName('佐藤健（警卫）'), '佐藤健（警卫）');
  assert.equal(compactCharacterName('Min-jun Kim（安保）'), 'Min-jun（安保）');
});
