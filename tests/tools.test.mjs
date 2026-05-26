import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTimestamp, formatTimestamp } from '../src/utils/unix-timestamp.js';

// --- Unix timestamp ---
test('timestamp: detects seconds vs ms', () => {
  assert.equal(parseTimestamp('1700000000').sourceWas, 'sec');
  assert.equal(parseTimestamp('1700000000000').sourceWas, 'ms');
});

test('timestamp: parses ISO', () => {
  const r = parseTimestamp('2024-01-02T03:04:05Z');
  assert.equal(r.ok, true);
  assert.equal(formatTimestamp(r.ms, 'utc').iso, '2024-01-02T03:04:05.000Z');
});

test('timestamp: empty means now', () => {
  const r = parseTimestamp('');
  assert.equal(r.ok, true);
  assert.equal(r.sourceWas, 'now');
});
