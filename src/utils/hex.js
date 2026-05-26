// Hex (UTF-8 바이트) 변환.

export function encodeHex(text, { sep = ' ' } = {}) {
  const bytes = new TextEncoder().encode(text);
  const parts = [];
  for (let i = 0; i < bytes.length; i++) {
    parts.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return parts.join(sep);
}

export function decodeHex(text) {
  const clean = text.replace(/0x/gi, '').replace(/[\s,:;]/g, '');
  if (clean.length === 0) return { ok: true, value: '' };
  if (clean.length % 2 !== 0) {
    return { ok: false, error: 'hex 문자열 길이는 짝수여야 합니다.' };
  }
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    return { ok: false, error: '0-9, a-f 외의 문자가 포함되어 있습니다.' };
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return { ok: true, value: new TextDecoder('utf-8', { fatal: false }).decode(bytes) };
}
