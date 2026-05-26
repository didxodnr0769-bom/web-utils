// Unicode escape (\uXXXX 또는 \u{XXXX}) 변환.

export function escapeUnicode(text, { useBraces = false, asciiOnly = true } = {}) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (asciiOnly && cp < 0x80) {
      out += ch;
      continue;
    }
    if (useBraces) {
      out += `\\u{${cp.toString(16)}}`;
    } else if (cp <= 0xffff) {
      out += `\\u${cp.toString(16).padStart(4, '0')}`;
    } else {
      // surrogate pair
      const high = 0xd800 + ((cp - 0x10000) >> 10);
      const low = 0xdc00 + ((cp - 0x10000) & 0x3ff);
      out += `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`;
    }
  }
  return out;
}

export function unescapeUnicode(text) {
  try {
    let out = text
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return { ok: true, value: out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
