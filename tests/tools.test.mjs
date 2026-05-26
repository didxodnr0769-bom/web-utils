import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTimestamp, formatTimestamp } from '../src/utils/unix-timestamp.js';
import { convertCase, tokenize } from '../src/utils/case-converter.js';
import { runRegex, applyReplace } from '../src/utils/regex-tester.js';

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

// --- Case converter ---
test('case: tokenizes mixed inputs', () => {
  assert.deepEqual(tokenize('helloWorldExample'), ['hello', 'World', 'Example']);
  assert.deepEqual(tokenize('hello-world_FOO bar'), ['hello', 'world', 'FOO', 'bar']);
  assert.deepEqual(tokenize('XMLHttpRequest'), ['XML', 'Http', 'Request']);
});

test('case: converts all formats', () => {
  const r = convertCase('helloWorldExample');
  assert.equal(r.camel, 'helloWorldExample');
  assert.equal(r.pascal, 'HelloWorldExample');
  assert.equal(r.snake, 'hello_world_example');
  assert.equal(r.constant, 'HELLO_WORLD_EXAMPLE');
  assert.equal(r.kebab, 'hello-world-example');
});

test('case: empty input', () => {
  const r = convertCase('');
  assert.equal(r.camel, '');
  assert.equal(r.tokens.length, 0);
});

// --- Regex ---
test('regex: finds global matches with groups', () => {
  const r = runRegex('(\\w+)@(\\w+)', 'g', 'a@b and c@d');
  assert.equal(r.ok, true);
  assert.equal(r.matches.length, 2);
  assert.equal(r.matches[0].match, 'a@b');
  assert.deepEqual(r.matches[0].groups, ['a', 'b']);
});

test('regex: invalid pattern returns error', () => {
  const r = runRegex('(', 'g', 'x');
  assert.equal(r.ok, false);
});

test('regex: replacement with backrefs', () => {
  const r = applyReplace('(\\w+)@(\\w+)', 'g', 'a@b', '$2-$1');
  assert.equal(r.value, 'b-a');
});

test('regex: named groups exposed', () => {
  const r = runRegex('(?<user>\\w+)@(?<host>\\w+)', '', 'foo@bar');
  assert.equal(r.matches[0].named.user, 'foo');
  assert.equal(r.matches[0].named.host, 'bar');
});
