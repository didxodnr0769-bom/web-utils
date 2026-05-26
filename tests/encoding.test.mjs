import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeJwt } from '../src/utils/jwt.js';
import { encodeBase64, decodeBase64 } from '../src/utils/base64.js';
import { encodeUrl, decodeUrl } from '../src/utils/url-codec.js';

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
