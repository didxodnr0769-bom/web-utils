// curl 문자열을 객체로 파싱하고, 다시 curl 문자열로 직렬화한다.
//
// 객체 스키마:
//   {
//     method: 'GET' | 'POST' | ...,
//     urlBase: 'https://host/path',         // query 제외한 부분
//     query:   [{ key, value }],
//     headers: [{ key, value }],
//     body:    '' | string,                  // raw 텍스트 (없으면 빈 문자열)
//     bodyFlag: '--data-raw' | '-d' | ...,   // 입력 시 쓰인 플래그 (출력 시 재사용)
//     unknown: [string]                      // 무시한 옵션/값 (정보용)
//   }

const BODY_FLAGS = new Set([
  '-d', '--data',
  '--data-raw',
  '--data-binary',
  '--data-urlencode',
  '--data-ascii',
]);

// 값을 요구하지 않는 plain flag들 — 만나면 그냥 무시
const NO_ARG_FLAGS = new Set([
  '--compressed',
  '-k', '--insecure',
  '-L', '--location',
  '-i', '--include',
  '-v', '--verbose',
  '-s', '--silent',
  '-S', '--show-error',
  '-I', '--head',
  '--http1.1', '--http2', '--http2-prior-knowledge',
  '-j', '--junk-session-cookies',
  '-g', '--globoff',
  '-N', '--no-buffer',
]);

// 값을 1개 받지만 우리가 사용하지 않을 옵션들 (스킵하고 unknown에 기록)
const SKIP_WITH_ARG = new Set([
  '-o', '--output',
  '-A', '--user-agent',
  '-e', '--referer',
  '--max-time', '-m',
  '--connect-timeout',
  '--retry',
  '--resolve',
  '--cert', '--key', '--cacert',
  '--proxy', '-x',
  '--user', '-u',
]);

/** shell-style tokenizer — 단일/이중 따옴표, backslash escape, 라인 연결(\\\n) 처리 */
export function tokenize(input) {
  const tokens = [];
  let cur = '';
  let has = false; // 빈 따옴표("")도 빈 토큰으로 잡기 위함
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (inSingle) {
      if (ch === "'") inSingle = false;
      else cur += ch;
      i++;
      continue;
    }

    if (inDouble) {
      if (ch === '"') { inDouble = false; i++; continue; }
      if (ch === '\\' && i + 1 < n) {
        const nx = input[i + 1];
        if (nx === '\n') { i += 2; continue; }
        if (nx === '"' || nx === '\\' || nx === '$' || nx === '`') {
          cur += nx; i += 2; continue;
        }
        // 그 외는 backslash를 literal로 유지
        cur += ch; i++; continue;
      }
      cur += ch;
      i++;
      continue;
    }

    // bare context
    // ANSI-C quoting: $'...'  — bash가 escape sequence를 해석해서 넘기는 형식.
    // Chrome DevTools "Copy as cURL" 가 body에 '!' 같은 history-expansion 문자가
    // 있을 때 이 형식 + \uXXXX 로 감싸므로 지원해야 함.
    if (ch === '$' && i + 1 < n && input[i + 1] === "'") {
      i += 2;
      has = true;
      while (i < n && input[i] !== "'") {
        if (input[i] === '\\' && i + 1 < n) {
          const nx = input[i + 1];
          i += 2;
          if (nx === 'a') { cur += '\x07'; continue; }
          if (nx === 'b') { cur += '\b'; continue; }
          if (nx === 'e' || nx === 'E') { cur += '\x1B'; continue; }
          if (nx === 'f') { cur += '\f'; continue; }
          if (nx === 'n') { cur += '\n'; continue; }
          if (nx === 'r') { cur += '\r'; continue; }
          if (nx === 't') { cur += '\t'; continue; }
          if (nx === 'v') { cur += '\v'; continue; }
          if (nx === '\\' || nx === "'" || nx === '"' || nx === '?') { cur += nx; continue; }
          if (nx === 'x') {
            let hex = '';
            while (hex.length < 2 && i < n && /[0-9a-fA-F]/.test(input[i])) { hex += input[i]; i++; }
            cur += hex ? String.fromCharCode(parseInt(hex, 16)) : '\\x';
            continue;
          }
          if (nx === 'u') {
            let hex = '';
            while (hex.length < 4 && i < n && /[0-9a-fA-F]/.test(input[i])) { hex += input[i]; i++; }
            cur += hex ? String.fromCodePoint(parseInt(hex, 16)) : '\\u';
            continue;
          }
          if (nx === 'U') {
            let hex = '';
            while (hex.length < 8 && i < n && /[0-9a-fA-F]/.test(input[i])) { hex += input[i]; i++; }
            cur += hex ? String.fromCodePoint(parseInt(hex, 16)) : '\\U';
            continue;
          }
          if (/[0-7]/.test(nx)) {
            let oct = nx;
            while (oct.length < 3 && i < n && /[0-7]/.test(input[i])) { oct += input[i]; i++; }
            cur += String.fromCharCode(parseInt(oct, 8));
            continue;
          }
          // 알 수 없는 escape: bash 동작에 맞춰 backslash + 문자 그대로 보존
          cur += '\\' + nx;
          continue;
        }
        cur += input[i];
        i++;
      }
      if (i < n) i++; // 닫는 '
      continue;
    }
    if (ch === "'") { inSingle = true; has = true; i++; continue; }
    if (ch === '"') { inDouble = true; has = true; i++; continue; }
    if (ch === '\\') {
      if (i + 1 < n) {
        const nx = input[i + 1];
        if (nx === '\n') { i += 2; continue; }
        cur += nx; has = true; i += 2; continue;
      }
      i++; continue;
    }
    if (/\s/.test(ch)) {
      if (has) { tokens.push(cur); cur = ''; has = false; }
      i++;
      continue;
    }
    cur += ch;
    has = true;
    i++;
  }
  if (has) tokens.push(cur);
  return tokens;
}

/** "-X=POST" 같은 "--key=value" 형태를 [key, value]로 분리, 아니면 [key, null] */
function splitEq(tok) {
  if (!tok.startsWith('-')) return [tok, null];
  const eq = tok.indexOf('=');
  if (eq < 0) return [tok, null];
  // 짧은 옵션 -X=POST는 잘 쓰이지 않지만 허용
  return [tok.slice(0, eq), tok.slice(eq + 1)];
}

function splitHeaderLine(line) {
  const idx = line.indexOf(':');
  if (idx < 0) return { key: line.trim(), value: '' };
  return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
}

/** URL 문자열을 base + query[] 로 분해. 파싱 실패하면 base만 채워서 반환 */
function splitUrl(raw) {
  if (!raw) return { urlBase: '', query: [] };
  try {
    // 상대 URL/스킴 누락 대비: base 지정해서 파싱한 뒤 다시 조립
    const u = new URL(raw, 'http://__local__/');
    const query = [];
    for (const [k, v] of u.searchParams.entries()) query.push({ key: k, value: v });
    // 원본이 절대 URL이면 그대로 base 조립, 상대면 raw에서 ? 앞까지 잘라 base로
    if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(raw)) {
      const qIdx = raw.indexOf('?');
      const hIdx = raw.indexOf('#');
      let end = raw.length;
      if (qIdx >= 0) end = Math.min(end, qIdx);
      if (hIdx >= 0) end = Math.min(end, hIdx);
      return { urlBase: raw.slice(0, end), query };
    }
    const qIdx = raw.indexOf('?');
    return { urlBase: qIdx >= 0 ? raw.slice(0, qIdx) : raw, query };
  } catch {
    return { urlBase: raw, query: [] };
  }
}

export function parseCurl(input) {
  const text = String(input || '').trim();
  const tokens = tokenize(text);

  // "curl" 프리픽스 제거
  if (tokens.length && tokens[0].toLowerCase() === 'curl') tokens.shift();

  const result = {
    method: '',
    urlBase: '',
    query: [],
    headers: [],
    body: '',
    bodyFlag: '',
    unknown: [],
  };
  let urlRaw = '';
  let i = 0;

  const peekVal = () => {
    if (i + 1 < tokens.length) { i++; return tokens[i]; }
    return '';
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    const [flag, attached] = splitEq(tok);
    const val = (v) => (attached !== null ? attached : (v ?? peekVal()));

    if (!flag.startsWith('-')) {
      // 비-옵션 토큰 → URL 후보
      if (!urlRaw) urlRaw = tok;
      else result.unknown.push(tok);
      i++; continue;
    }

    if (flag === '-X' || flag === '--request') {
      result.method = (val() || '').toUpperCase();
      i++; continue;
    }
    if (flag === '-H' || flag === '--header') {
      const line = val();
      if (line) result.headers.push(splitHeaderLine(line));
      i++; continue;
    }
    if (flag === '-b' || flag === '--cookie') {
      const line = val();
      if (line) result.headers.push({ key: 'Cookie', value: line });
      i++; continue;
    }
    if (BODY_FLAGS.has(flag)) {
      const data = val();
      result.body = data;
      result.bodyFlag = flag === '-d' ? '--data' : flag;
      i++; continue;
    }
    if (flag === '-F' || flag === '--form') {
      // multipart는 풀폼 편집을 지원하지 않으므로 그대로 raw 영역에 합쳐 보존
      const part = val();
      result.body = result.body ? `${result.body}\n${part}` : part;
      result.bodyFlag = '--form';
      i++; continue;
    }
    if (NO_ARG_FLAGS.has(flag)) {
      // 값 없는 플래그 — 무시
      i++; continue;
    }
    if (SKIP_WITH_ARG.has(flag)) {
      const skipped = val();
      result.unknown.push(`${flag} ${skipped}`);
      i++; continue;
    }

    // 모르는 옵션: 다음 토큰이 값인지 추정 어려우므로 단독으로만 기록
    result.unknown.push(tok);
    i++;
  }

  const { urlBase, query } = splitUrl(urlRaw);
  result.urlBase = urlBase;
  result.query = query;

  // method 보정: 명시 안 됐는데 body 있으면 POST, 아니면 GET
  if (!result.method) result.method = result.body ? 'POST' : 'GET';
  if (!result.bodyFlag && result.body) result.bodyFlag = '--data-raw';

  return result;
}

/** 단일 따옴표로 감싸기 + 내부 "'" → "'\\''" 처리 */
function singleQuote(s) {
  if (s === '' || s == null) return "''";
  // 매우 단순/안전한 형태만 따옴표 생략 — 가독성용
  if (/^[A-Za-z0-9._:/=@%+,\-]+$/.test(s)) return s;
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function buildUrlString(urlBase, query) {
  if (!urlBase) return '';
  const params = (query || [])
    .filter((p) => p && (p.key || p.value))
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value ?? '')}`)
    .join('&');
  if (!params) return urlBase;
  const sep = urlBase.includes('?') ? '&' : '?';
  return `${urlBase}${sep}${params}`;
}

export function serializeCurl(obj) {
  if (!obj) return '';
  const lines = [];
  const url = buildUrlString(obj.urlBase, obj.query);
  lines.push(`curl ${singleQuote(url)}`);

  const method = (obj.method || '').toUpperCase();
  const hasBody = !!(obj.body && obj.body.length);
  // body 있을 때 default POST는 -X 생략 가능. GET도 default라 생략.
  const showMethod = method && !(method === 'GET' && !hasBody) && !(method === 'POST' && hasBody);
  if (showMethod) lines.push(`-X ${method}`);

  for (const h of obj.headers || []) {
    if (!h) continue;
    const k = (h.key || '').trim();
    if (!k) continue;
    lines.push(`-H ${singleQuote(`${k}: ${h.value ?? ''}`)}`);
  }

  if (hasBody) {
    const flag = obj.bodyFlag || '--data-raw';
    if (flag === '--form') {
      for (const part of String(obj.body).split('\n')) {
        if (part) lines.push(`-F ${singleQuote(part)}`);
      }
    } else {
      lines.push(`${flag} ${singleQuote(obj.body)}`);
    }
  }

  return lines.join(' \\\n  ');
}

/** JSON 문자열인지, top-level이 plain object인지 검사 → 폼 변환 가능 여부 */
export function tryParseJsonObject(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
  } catch {
    return null;
  }
}
