import { store } from '../store.js';
import { describeCron, nextRuns } from '../utils/cron.js';
import { el, viewHeader, panel, copyButton, outputBlock } from '../ui/widgets.js';

export default {
  id: 'cron',
  label: 'Cron',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('cron');

    const input = el('input', { type: 'text', spellcheck: 'false', placeholder: '*/5 * * * *' });
    input.value = s.expr;

    const countInput = el('input', { type: 'number', min: '1', max: '50', style: { width: '80px' } });
    countInput.value = String(s.count);

    const descOut = outputBlock();
    const runsOut = outputBlock();

    const render = () => {
      const desc = describeCron(s.expr);
      if (desc.ok) descOut.set(desc.value);
      else descOut.set(desc.error, { error: true });

      const runs = nextRuns(s.expr, Math.max(1, Math.min(50, Number(s.count) || 5)));
      if (runs.ok) runsOut.set(runs.value.join('\n'));
      else runsOut.set(runs.error, { error: true });
    };

    input.addEventListener('input', () => { s.expr = input.value; store.persistNow(); render(); });
    countInput.addEventListener('input', () => {
      s.count = Number(countInput.value) || 5;
      store.persistNow();
      render();
    });

    root.appendChild(viewHeader('Cron Expression', '표준 5필드 cron (`분 시 일 월 요일`). 사람 말 설명 + 다음 실행 시각.'));
    root.appendChild(panel('Expression', el('div', { class: 'row' }, [
      el('div', { style: { flex: '1', minWidth: '240px' } }, [input]),
      el('label', { class: 'inline' }, ['다음 N개', countInput]),
    ])));
    root.appendChild(panel('Description', descOut.el, copyButton(() => descOut.el.textContent)));
    root.appendChild(panel('Next runs (ISO, UTC)', runsOut.el, copyButton(() => runsOut.el.textContent)));
    render();
  },
};
