// JSON 포맷 / 미니파이 + 에러 위치 추출. DOM 의존 없음.

export function formatJson(text, { indent = 2 } = {}) {
  const t = String(text || '');
  if (!t.trim()) return { ok: true, value: '' };
  try {
    const obj = JSON.parse(t);
    const ind = indent === 'tab' ? '\t' : (Number(indent) || 2);
    return { ok: true, value: JSON.stringify(obj, null, ind) };
  } catch (e) {
    return { ok: false, ...explainError(e, t) };
  }
}

export function minifyJson(text) {
  const t = String(text || '');
  if (!t.trim()) return { ok: true, value: '' };
  try {
    return { ok: true, value: JSON.stringify(JSON.parse(t)) };
  } catch (e) {
    return { ok: false, ...explainError(e, t) };
  }
}

function explainError(err, text) {
  const message = String((err && err.message) || err);
  // V8: "Unexpected token X in JSON at position 5"
  // Newer V8: "Unexpected token X in JSON at position 5 (line 2 column 3)"
  // SpiderMonkey: "JSON.parse: unexpected character at line 1 column 5"
  let pos = -1;
  const mPos = message.match(/position\s+(\d+)/i);
  if (mPos) pos = +mPos[1];

  let line = null, col = null;
  const mLineCol = message.match(/line\s+(\d+)[\s,]+column\s+(\d+)/i);
  if (mLineCol) {
    line = +mLineCol[1];
    col = +mLineCol[2];
  } else if (pos >= 0 && pos <= text.length) {
    ({ line, col } = posToLineCol(text, pos));
  }

  return { error: message, line, col };
}

function posToLineCol(text, pos) {
  let line = 1, col = 1;
  const end = Math.min(pos, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') { line++; col = 1; }
    else col++;
  }
  return { line, col };
}
