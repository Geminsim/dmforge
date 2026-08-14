import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateArithmetic } from '../src/utils/arithmetic.js';

test('evaluates arithmetic with precedence, parentheses, and unary signs', () => {
  assert.equal(evaluateArithmetic('2 + 3 * (4 - 1)'), 11);
  assert.equal(evaluateArithmetic('-2 * -4'), 8);
});

test('rejects code and malformed arithmetic', () => {
  assert.throws(() => evaluateArithmetic('globalThis.alert(1)'), /Unsafe/);
  assert.throws(() => evaluateArithmetic('1..2+3'), /Invalid number/);
  assert.throws(() => evaluateArithmetic('1/0'), /Invalid arithmetic result/);
});
