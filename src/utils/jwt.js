// JWT 디코더. base64url로 인코딩된 3-part 토큰을 분해해서 header/payload를 JSON으로 파싱.
// DOM 의존 없음.

function base64UrlToBytes(input) {
  const pad = (4 - (input.length % 4)) % 4;
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeUtf8(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function decodeJwt(token) {
  const trimmed = (token || '').trim();
  if (!trimmed) {
    return { ok: false, error: '토큰을 입력하세요.' };
  }
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { ok: false, error: `JWT는 3개 부분(. 으로 구분)이 필요합니다. 발견: ${parts.length}개` };
  }
  const [h, p, s] = parts;
  let header, payload;
  try {
    header = JSON.parse(decodeUtf8(base64UrlToBytes(h)));
  } catch (e) {
    return { ok: false, error: `header 디코드 실패: ${e.message}` };
  }
  try {
    payload = JSON.parse(decodeUtf8(base64UrlToBytes(p)));
  } catch (e) {
    return { ok: false, error: `payload 디코드 실패: ${e.message}` };
  }
  return {
    ok: true,
    header,
    payload,
    signature: s,
    meta: extractMeta(payload),
  };
}

function extractMeta(payload) {
  const meta = {};
  if (payload && typeof payload === 'object') {
    if (typeof payload.iat === 'number') meta.iat = new Date(payload.iat * 1000).toISOString();
    if (typeof payload.exp === 'number') {
      meta.exp = new Date(payload.exp * 1000).toISOString();
      meta.expired = payload.exp * 1000 < Date.now();
    }
    if (typeof payload.nbf === 'number') meta.nbf = new Date(payload.nbf * 1000).toISOString();
  }
  return meta;
}
