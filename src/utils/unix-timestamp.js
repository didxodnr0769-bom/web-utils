// Unix timestamp ↔ Date 변환.
// sec(10자리) / ms(13자리) 자동 감지. 빈 입력은 "지금" 으로 처리.

export function parseTimestamp(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    const now = Date.now();
    return { ok: true, ms: now, unit: 'ms', sourceWas: 'now' };
  }
  // ISO 형식이면 Date 생성
  if (/[-T:Z]/.test(trimmed) && !/^[\d.]+$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return { ok: false, error: '인식할 수 없는 날짜 형식' };
    return { ok: true, ms: d.getTime(), unit: 'iso', sourceWas: 'iso' };
  }
  // 숫자
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return { ok: false, error: '숫자가 아닙니다.' };
  // 13자리 이상이면 ms로 간주
  const abs = Math.abs(num);
  if (abs >= 1e12) {
    return { ok: true, ms: num, unit: 'ms', sourceWas: 'ms' };
  }
  return { ok: true, ms: num * 1000, unit: 'sec', sourceWas: 'sec' };
}

export function formatTimestamp(ms, tz) {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return { iso: '', local: '', relative: '' };
  return {
    iso: d.toISOString(),
    local: tz === 'utc' ? d.toUTCString() : d.toLocaleString(),
    relative: relativeTime(ms),
    seconds: Math.floor(ms / 1000),
    ms,
  };
}

function relativeTime(targetMs) {
  const diff = targetMs - Date.now();
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);
  let str;
  if (sec < 60) str = `${sec}초`;
  else if (min < 60) str = `${min}분`;
  else if (hour < 48) str = `${hour}시간`;
  else str = `${day}일`;
  return diff >= 0 ? `${str} 후` : `${str} 전`;
}
