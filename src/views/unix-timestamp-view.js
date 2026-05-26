import { store } from '../store.js';
import { parseTimestamp, formatTimestamp } from '../utils/unix-timestamp.js';
import { el, viewHeader, panel, copyButton, kvTable, segmented } from '../ui/widgets.js';

export default {
  id: 'unix-timestamp',
  label: 'Unix Timestamp',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('unix-timestamp');

    const input = el('input', {
      type: 'text',
      placeholder: '예: 1700000000  /  2024-03-12T10:00:00Z  (비우면 현재 시각)',
      spellcheck: 'false',
    });
    input.value = s.value;

    const tableWrap = el('div');

    const tzSeg = segmented(
      [{ label: 'Local', value: 'local' }, { label: 'UTC', value: 'utc' }],
      s.tz,
      (v) => { s.tz = v; store.persistNow(); render(); }
    );

    const nowBtn = el('button', { class: 'btn small', type: 'button' }, 'Now');
    nowBtn.addEventListener('click', () => {
      s.value = String(Math.floor(Date.now() / 1000));
      input.value = s.value;
      store.persistNow();
      render();
    });

    const render = () => {
      tableWrap.innerHTML = '';
      const r = parseTimestamp(s.value);
      if (!r.ok) {
        const err = el('div', { class: 'output error' }, r.error);
        tableWrap.appendChild(err);
        return;
      }
      const fmt = formatTimestamp(r.ms, s.tz);
      tableWrap.appendChild(kvTable([
        ['감지된 단위', r.sourceWas],
        ['Unix (초)', fmt.seconds],
        ['Unix (ms)', fmt.ms],
        ['ISO 8601', fmt.iso],
        [s.tz === 'utc' ? 'UTC 문자열' : '로컬 시각', fmt.local],
        ['상대 시간', fmt.relative],
      ]));
    };

    input.addEventListener('input', () => { s.value = input.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('Unix Timestamp', '초/밀리초/ISO 자동 감지 후 다양한 형식으로 표시합니다.'));
    root.appendChild(panel('Input', el('div', { class: 'row' }, [
      el('div', { style: { flex: '1', minWidth: '240px' } }, [input]),
      nowBtn,
      tzSeg,
    ])));
    root.appendChild(panel('Output', tableWrap, copyButton(() => {
      const r = parseTimestamp(s.value);
      if (!r.ok) return '';
      return formatTimestamp(r.ms, s.tz).iso;
    }, 'Copy ISO')));
    render();
  },
};
