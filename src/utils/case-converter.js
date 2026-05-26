// 문자열 case 변환. 임의의 입력에서 단어 토큰을 추출해 다양한 형식으로 재조합.

export function tokenize(input) {
  if (!input) return [];
  // 1) 비-알파/숫자 문자로 split
  // 2) camelCase 경계(소문자→대문자, 대문자 시퀀스→대문자+소문자)
  const withBoundaries = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return withBoundaries
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '';
}

export function convertCase(input) {
  const tokens = tokenize(input).map((t) => t.toLowerCase());
  if (tokens.length === 0) {
    return { camel: '', pascal: '', snake: '', constant: '', kebab: '', title: '', sentence: '', tokens: [] };
  }
  return {
    camel: tokens[0] + tokens.slice(1).map(cap).join(''),
    pascal: tokens.map(cap).join(''),
    snake: tokens.join('_'),
    constant: tokens.join('_').toUpperCase(),
    kebab: tokens.join('-'),
    title: tokens.map(cap).join(' '),
    sentence: cap(tokens.join(' ')),
    tokens,
  };
}
