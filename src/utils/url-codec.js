// URL percent-encoding.

export function encodeUrl(text) {
  return encodeURIComponent(text);
}

export function decodeUrl(text) {
  try {
    return { ok: true, value: decodeURIComponent(text) };
  } catch (e) {
    return { ok: false, error: `잘못된 percent-encoding: ${e.message}` };
  }
}
