// HTML entity 인코드/디코드.
// 인코드: 안전 변환 위해 &, <, >, ", ' 만 named로. 그 외 non-ASCII는 &#NNN; 숫자 엔티티로.
// 디코드: named entity 일부 + numeric (&#NN; / &#xHH;) 지원.

const NAMED_ENCODE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const NAMED_DECODE = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

export function encodeHtmlEntity(text) {
  let out = '';
  for (const ch of text) {
    if (NAMED_ENCODE[ch]) {
      out += NAMED_ENCODE[ch];
    } else {
      const cp = ch.codePointAt(0);
      if (cp > 127) out += `&#${cp};`;
      else out += ch;
    }
  }
  return out;
}

export function decodeHtmlEntity(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (m, body) => {
    if (body[0] === '#') {
      const num = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (Number.isFinite(num)) {
        try { return String.fromCodePoint(num); } catch { return m; }
      }
      return m;
    }
    return NAMED_DECODE[body] != null ? NAMED_DECODE[body] : m;
  });
}
