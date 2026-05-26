import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeJwt } from '../src/utils/jwt.js';
import { encodeBase64, decodeBase64 } from '../src/utils/base64.js';
import { encodeUrl, decodeUrl } from '../src/utils/url-codec.js';
import { encodeHtmlEntity, decodeHtmlEntity } from '../src/utils/html-entity.js';
import { escapeUnicode, unescapeUnicode } from '../src/utils/unicode-escape.js';
import { encodeHex, decodeHex } from '../src/utils/hex.js';

// --- JWT ---
test('jwt: decodes standard token', () => {
  // {"alg":"HS256","typ":"JWT"} . {"sub":"1234567890","name":"John Doe","iat":1516239022} . sig
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const r = decodeJwt(token);
  assert.equal(r.ok, true);
  assert.equal(r.header.alg, 'HS256');
  assert.equal(r.payload.sub, '1234567890');
  assert.equal(r.payload.name, 'John Doe');
  assert.equal(typeof r.meta.iat, 'string');
});

test('jwt: rejects malformed token', () => {
  assert.equal(decodeJwt('abc').ok, false);
  assert.equal(decodeJwt('a.b').ok, false);
  assert.equal(decodeJwt('').ok, false);
});

// --- Base64 ---
test('base64: utf-8 round trip', () => {
  for (const text of ['hello', '안녕하세요', '🚀 emoji', '']) {
    const enc = encodeBase64(text);
    const dec = decodeBase64(enc);
    assert.equal(dec.ok, true);
    assert.equal(dec.value, text);
  }
});

test('base64: url-safe variant', () => {
  const text = 'hello?world>';
  const enc = encodeBase64(text, { urlSafe: true });
  assert.ok(!enc.includes('+') && !enc.includes('/') && !enc.includes('='));
  const dec = decodeBase64(enc, { urlSafe: true });
  assert.equal(dec.value, text);
});

// --- URL ---
test('url: round trip', () => {
  const text = 'hello world & 한글=foo';
  assert.equal(decodeUrl(encodeUrl(text)).value, text);
});

// --- HTML Entity ---
test('html-entity: encode escapes basics', () => {
  assert.equal(encodeHtmlEntity('<a href="x">©</a>'), '&lt;a href=&quot;x&quot;&gt;&#169;&lt;/a&gt;');
});

test('html-entity: decode handles named and numeric', () => {
  assert.equal(decodeHtmlEntity('&lt;a&gt; &amp; &#169; &#x2713;'), '<a> & © ✓');
});

// --- Unicode escape ---
test('unicode: surrogate pair round trip', () => {
  const text = '𝕏 안녕'; // 𝕏 is outside BMP
  const esc = escapeUnicode(text);
  const back = unescapeUnicode(esc);
  assert.equal(back.ok, true);
  assert.equal(back.value, text);
});

test('unicode: braces form', () => {
  const text = '𝕏';
  const esc = escapeUnicode(text, { useBraces: true });
  assert.ok(esc.startsWith('\\u{'));
  assert.equal(unescapeUnicode(esc).value, text);
});

// --- Hex ---
test('hex: round trip with separator', () => {
  const text = 'hello 안녕';
  const enc = encodeHex(text, { sep: ' ' });
  assert.equal(decodeHex(enc).value, text);
});

test('hex: rejects odd length', () => {
  assert.equal(decodeHex('abc').ok, false);
});

test('hex: tolerates 0x prefix and separators', () => {
  assert.equal(decodeHex('0x68 0x65 0x6c 0x6c 0x6f').value, 'hello');
  assert.equal(decodeHex('68:65:6c:6c:6f').value, 'hello');
});
