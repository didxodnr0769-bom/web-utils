// Cron expression 해석. cronstrue로 사람 말 변환, cron-parser로 다음 실행 시각 N개.

import cronstrue from 'cronstrue';
import cronParser from 'cron-parser';

export function describeCron(expr) {
  try {
    return { ok: true, value: cronstrue.toString(expr, { use24HourTimeFormat: true }) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export function nextRuns(expr, count = 5) {
  try {
    const iter = cronParser.parseExpression(expr);
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(iter.next().toDate().toISOString());
    }
    return { ok: true, value: list };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
