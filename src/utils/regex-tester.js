// Regex 테스터. 매치 결과 + 그룹 + replacement 미리보기.

export function buildRegex(pattern, flags) {
  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export function runRegex(pattern, flags, input) {
  if (!pattern) return { ok: true, matches: [] };
  const built = buildRegex(pattern, flags);
  if (!built.ok) return built;
  const { regex } = built;
  const matches = [];
  if (!regex.global) {
    const m = regex.exec(input);
    if (m) matches.push(toMatch(m));
  } else {
    let m;
    let last = -1;
    while ((m = regex.exec(input)) !== null) {
      matches.push(toMatch(m));
      if (regex.lastIndex === last) { regex.lastIndex++; }
      last = regex.lastIndex;
    }
  }
  return { ok: true, matches };
}

function toMatch(m) {
  return {
    match: m[0],
    index: m.index,
    groups: m.slice(1),
    named: m.groups ? { ...m.groups } : null,
  };
}

export function applyReplace(pattern, flags, input, replacement) {
  if (!pattern) return { ok: true, value: input };
  const built = buildRegex(pattern, flags);
  if (!built.ok) return built;
  try {
    return { ok: true, value: input.replace(built.regex, replacement) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
