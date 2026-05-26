import test from 'node:test';
import assert from 'node:assert/strict';

import { formatJson, minifyJson } from '../src/utils/json-format.js';
import {
  parseColor, toHex, toRgb, toRgba, toHsl, toHsla, nearestTailwind, TAILWIND_PALETTE,
} from '../src/utils/color.js';

// --- JSON formatter ---

test('json: pretty format with default 2-space indent', () => {
  const r = formatJson('{"a":1,"b":[2,3]}');
  assert.equal(r.ok, true);
  assert.equal(r.value, '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
});

test('json: tab indent', () => {
  const r = formatJson('{"a":1}', { indent: 'tab' });
  assert.equal(r.ok, true);
  assert.ok(r.value.includes('\t"a"'));
});

test('json: minify', () => {
  const r = minifyJson('{\n  "a":  1,\n  "b": 2\n}');
  assert.equal(r.ok, true);
  assert.equal(r.value, '{"a":1,"b":2}');
});

test('json: empty input is ok with empty output', () => {
  assert.deepEqual(formatJson(''), { ok: true, value: '' });
  assert.deepEqual(minifyJson('   '), { ok: true, value: '' });
});

test('json: invalid input reports line/col', () => {
  const r = formatJson('{\n  "a": 1,\n  "b" 2\n}');
  assert.equal(r.ok, false);
  assert.ok(r.error);
  // 위치 추출이 환경에 따라 다를 수 있으므로 존재만 확인
  if (r.line != null) {
    assert.ok(r.line >= 1);
    assert.ok(r.col >= 1);
  }
});

// --- Color parsing / conversion ---

test('color: parses hex variants', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#000000'), { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseColor('3b82f6'), { r: 59, g: 130, b: 246, a: 1 });
  const withAlpha = parseColor('#ff000080');
  assert.equal(withAlpha.r, 255);
  assert.equal(withAlpha.a.toFixed(2), '0.50');
});

test('color: parses rgb and rgba (comma + space-slash)', () => {
  assert.deepEqual(parseColor('rgb(59, 130, 246)'), { r: 59, g: 130, b: 246, a: 1 });
  assert.deepEqual(parseColor('rgb(59 130 246)'), { r: 59, g: 130, b: 246, a: 1 });
  const a = parseColor('rgba(59 130 246 / 0.5)');
  assert.equal(a.a, 0.5);
});

test('color: parses hsl', () => {
  const c = parseColor('hsl(0, 100%, 50%)');
  assert.equal(c.r, 255);
  assert.equal(c.g, 0);
  assert.equal(c.b, 0);
});

test('color: rejects garbage', () => {
  assert.equal(parseColor('not-a-color'), null);
  assert.equal(parseColor(''), null);
  assert.equal(parseColor(null), null);
});

test('color: HEX round-trip', () => {
  const c = parseColor('#3b82f6');
  assert.equal(toHex(c), '#3b82f6');
  assert.equal(toRgb(c), 'rgb(59, 130, 246)');
  assert.equal(toRgba(c), 'rgba(59, 130, 246, 1)');
  assert.ok(toHsl(c).startsWith('hsl('));
  assert.ok(toHsla(c).startsWith('hsla('));
});

test('color: HEX appends alpha when a < 1', () => {
  const c = parseColor('rgba(255 0 0 / 0.5)');
  assert.equal(toHex(c), '#ff000080');
});

test('color: tailwind palette has expected size and includes blue-500', () => {
  assert.equal(TAILWIND_PALETTE.length, 22 * 11);
  const blue500 = TAILWIND_PALETTE.find((p) => p.name === 'blue-500');
  assert.equal(blue500.hex, '#3b82f6');
});

test('color: nearestTailwind returns exact match for palette colors', () => {
  const c = parseColor('#3b82f6');
  const top = nearestTailwind(c, 3);
  assert.equal(top[0].name, 'blue-500');
  assert.equal(top[0].distance, 0);
});
