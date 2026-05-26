// Base64 인코딩/디코딩 (UTF-8 안전, URL-safe 옵션).

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(input) {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeBase64(text, { urlSafe = false } = {}) {
  const bytes = new TextEncoder().encode(text);
  const b64 = bytesToBase64(bytes);
  if (!urlSafe) return b64;
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBase64(text, { urlSafe = false } = {}) {
  let input = text.trim();
  if (urlSafe) {
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (input.length % 4)) % 4;
    input += '='.repeat(pad);
  }
  try {
    const bytes = base64ToBytes(input);
    return { ok: true, value: new TextDecoder('utf-8', { fatal: false }).decode(bytes) };
  } catch (e) {
    return { ok: false, error: `잘못된 base64: ${e.message}` };
  }
}
