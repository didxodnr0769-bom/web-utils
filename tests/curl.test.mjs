import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tokenize,
  parseCurl,
  serializeCurl,
  tryParseJsonObject,
  bodyToFields,
  fieldsToBody,
  parseFieldValue,
  detectFieldType,
} from '../src/utils/curl.js';

// --- tokenize ---
test('curl tokenize: basic split / quotes / line-continuation', () => {
  assert.deepEqual(tokenize('curl  -X  GET'), ['curl', '-X', 'GET']);
  assert.deepEqual(tokenize(`curl 'https://a.com' -H 'k: v'`), ['curl', 'https://a.com', '-H', 'k: v']);
  assert.deepEqual(tokenize(`curl "a\\"b"`), ['curl', 'a"b']);
  assert.deepEqual(tokenize("curl 'a' \\\n  -H 'b: c'"), ['curl', 'a', '-H', 'b: c']);
});

test('curl tokenize: ANSI-C $\'...\' escape sequences', () => {
  assert.deepEqual(tokenize(`curl $'test\\u0021'`), ['curl', 'test!']);
  assert.deepEqual(tokenize(`curl $'a\\nb\\tc'`), ['curl', 'a\nb\tc']);
  assert.deepEqual(tokenize(`curl $'\\x41\\x42'`), ['curl', 'AB']);
});

// --- parseCurl ---
test('curl parse: short GET', () => {
  const r = parseCurl(`curl 'https://api.example.com/x'`);
  assert.equal(r.method, 'GET');
  assert.equal(r.urlBase, 'https://api.example.com/x');
  assert.deepEqual(r.query, []);
});

test('curl parse: splits query off URL', () => {
  const r = parseCurl(`curl 'https://api.example.com/path?a=1&b=hello%20world'`);
  assert.equal(r.urlBase, 'https://api.example.com/path');
  assert.deepEqual(r.query, [{ key: 'a', value: '1' }, { key: 'b', value: 'hello world' }]);
});

test('curl parse: POST inferred from --data-raw, ignores --compressed', () => {
  const r = parseCurl(`curl 'https://api.example.com/x' \\
    -H 'accept: application/json' \\
    --data-raw '{"name":"John"}' \\
    --compressed`);
  assert.equal(r.method, 'POST');
  assert.equal(r.bodyFlag, '--data-raw');
  assert.equal(r.body, '{"name":"John"}');
  assert.equal(r.unknown.length, 0);
});

test('curl parse: -d normalized to --data, -b becomes Cookie header', () => {
  const r = parseCurl(`curl -X PUT 'https://x.com' -d 'k=v' -b 'sid=abc'`);
  assert.equal(r.method, 'PUT');
  assert.equal(r.bodyFlag, '--data');
  assert.equal(r.body, 'k=v');
  assert.equal(r.headers.find((h) => h.key === 'Cookie')?.value, 'sid=abc');
});

test('curl parse: -u recorded in unknown', () => {
  const r = parseCurl(`curl -u admin:secret 'https://x.com'`);
  assert.ok(r.unknown.some((u) => u.startsWith('-u ')));
});

// --- serializeCurl ---
test('curl serialize: GET with query has no -X', () => {
  const out = serializeCurl({
    method: 'GET', urlBase: 'https://api.example.com/x',
    query: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }],
    headers: [{ key: 'Accept', value: 'application/json' }],
    body: '', bodyFlag: '', unknown: [],
  });
  assert.ok(!out.includes('-X'));
  assert.ok(out.includes('?a=1'));
  assert.ok(out.includes('&b=2'));
  assert.ok(out.includes("-H 'Accept: application/json'"));
});

test('curl serialize: POST with body omits explicit -X POST', () => {
  const out = serializeCurl({
    method: 'POST', urlBase: 'https://x.com', query: [], headers: [],
    body: '{"a":1}', bodyFlag: '--data-raw', unknown: [],
  });
  assert.ok(!out.includes('-X POST'));
  assert.ok(out.includes('--data-raw'));
});

test('curl serialize: escapes single quotes inside header values', () => {
  const out = serializeCurl({
    method: 'POST', urlBase: 'https://x.com', query: [],
    headers: [{ key: 'X-Test', value: "it's a test" }],
    body: '', bodyFlag: '', unknown: [],
  });
  assert.ok(out.includes(`'\\''`));
});

// --- round-trip ---
test('curl round-trip preserves method/url/query/headers/body', () => {
  const original = `curl 'https://api.example.com/api?x=1&y=2' \\
    -H 'accept: application/json' \\
    -H 'authorization: Bearer abc' \\
    --data-raw '{"foo":"bar"}' \\
    --compressed`;
  const a = parseCurl(original);
  const b = parseCurl(serializeCurl(a));
  assert.equal(b.method, a.method);
  assert.equal(b.urlBase, a.urlBase);
  assert.deepEqual(b.query, a.query);
  assert.deepEqual(b.headers, a.headers);
  assert.equal(b.body, a.body);
});

// --- tryParseJsonObject ---
test('curl tryParseJsonObject', () => {
  assert.deepEqual(tryParseJsonObject('{"a":1}'), { a: 1 });
  assert.equal(tryParseJsonObject('[1,2]'), null);
  assert.equal(tryParseJsonObject('not json'), null);
  assert.equal(tryParseJsonObject(''), null);
});

// --- body fields helpers ---
test('curl bodyToFields: returns null for non-object body', () => {
  assert.equal(bodyToFields(''), null);
  assert.equal(bodyToFields('plain text'), null);
  assert.equal(bodyToFields('[1,2,3]'), null);
});

test('curl bodyToFields: maps each key to a row, value text matches primitive', () => {
  assert.deepEqual(
    bodyToFields('{"name":"Jane","age":30,"active":true,"note":null}'),
    [
      { key: 'name', value: 'Jane', multiline: false },
      { key: 'age', value: '30', multiline: false },
      { key: 'active', value: 'true', multiline: false },
      { key: 'note', value: 'null', multiline: false },
    ],
  );
});

test('curl bodyToFields: nested object/array gets multiline + pretty JSON', () => {
  assert.deepEqual(
    bodyToFields('{"meta":{"k":1},"tags":["a","b"]}'),
    [
      { key: 'meta', value: JSON.stringify({ k: 1 }, null, 2), multiline: true },
      { key: 'tags', value: JSON.stringify(['a', 'b'], null, 2), multiline: true },
    ],
  );
});

test('curl parseFieldValue: heuristic type coercion', () => {
  assert.equal(parseFieldValue('hello'), 'hello');
  assert.equal(parseFieldValue(''), '');
  assert.equal(parseFieldValue('true'), true);
  assert.equal(parseFieldValue('false'), false);
  assert.equal(parseFieldValue('null'), null);
  assert.equal(parseFieldValue('42'), 42);
  assert.equal(parseFieldValue('-3.14'), -3.14);
  assert.equal(parseFieldValue('1e3'), 1000);
  assert.deepEqual(parseFieldValue('{"a":1}'), { a: 1 });
  assert.deepEqual(parseFieldValue('[1,2]'), [1, 2]);
  // 잘못된 JSON 리터럴 모양은 그대로 문자열로
  assert.equal(parseFieldValue('{not json}'), '{not json}');
  // 숫자 패턴이 아니면 문자열
  assert.equal(parseFieldValue('00123'), '00123');
});

test('curl detectFieldType', () => {
  assert.equal(detectFieldType('a'), 'string');
  assert.equal(detectFieldType(1), 'number');
  assert.equal(detectFieldType(true), 'boolean');
  assert.equal(detectFieldType(null), 'null');
  assert.equal(detectFieldType([]), 'array');
  assert.equal(detectFieldType({}), 'object');
});

test('curl fieldsToBody: skips rows with empty key, preserves types via heuristic', () => {
  assert.equal(
    fieldsToBody([
      { key: 'name', value: 'Jane' },
      { key: 'age', value: '30' },
      { key: 'active', value: 'true' },
      { key: '', value: 'ignored' },
    ]),
    '{"name":"Jane","age":30,"active":true}',
  );
});

test('curl body fields round-trip: bodyToFields → fieldsToBody preserves JSON', () => {
  const cases = [
    '{"name":"Jane","age":30}',
    '{"a":true,"b":false,"c":null}',
    '{"nested":{"k":1},"arr":[1,2,3]}',
    '{"empty":""}',
  ];
  for (const body of cases) {
    const rows = bodyToFields(body);
    assert.ok(rows, `bodyToFields returned null for ${body}`);
    assert.equal(fieldsToBody(rows), body);
  }
});
