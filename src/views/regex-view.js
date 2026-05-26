import { store } from '../store.js';
import { runRegex, applyReplace } from '../utils/regex-tester.js';
import { el, viewHeader, panel, copyButton, outputBlock } from '../ui/widgets.js';

export default {
  id: 'regex',
  label: 'Regex Tester',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('regex');

    const pattern = el('input', { type: 'text', spellcheck: 'false', placeholder: 'pattern' });
    pattern.value = s.pattern;

    const flags = el('input', { type: 'text', spellcheck: 'false', placeholder: 'flags', style: { width: '80px' } });
    flags.value = s.flags;

    const inputArea = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '테스트할 텍스트' });
    inputArea.value = s.input;

    const replacement = el('input', { type: 'text', spellcheck: 'false', placeholder: 'replacement (선택)' });
    replacement.value = s.replacement;

    const highlight = el('div', { class: 'output' });
    const summary = el('div', { class: 'hint' });
    const replaceOut = outputBlock();

    const render = () => {
      const r = runRegex(s.pattern, s.flags, s.input);
      highlight.classList.remove('error');
      highlight.innerHTML = '';
      summary.textContent = '';
      summary.classList.remove('error');

      if (!r.ok) {
        highlight.classList.add('error');
        highlight.textContent = r.error;
      } else {
        renderHighlight(highlight, s.input, r.matches);
        summary.textContent = `${r.matches.length}개 매치` + summarizeGroups(r.matches);
      }

      const rep = applyReplace(s.pattern, s.flags, s.input, s.replacement);
      if (rep.ok) replaceOut.set(rep.value);
      else replaceOut.set(rep.error, { error: true });
    };

    pattern.addEventListener('input', () => { s.pattern = pattern.value; store.persistNow(); render(); });
    flags.addEventListener('input', () => { s.flags = flags.value; store.persistNow(); render(); });
    inputArea.addEventListener('input', () => { s.input = inputArea.value; store.persistNow(); render(); });
    replacement.addEventListener('input', () => { s.replacement = replacement.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('Regex Tester', '패턴/플래그/입력을 입력하면 매치 하이라이트 + 그룹 + 치환 결과를 미리 봅니다.'));
    root.appendChild(panel('Pattern', el('div', { class: 'row' }, [
      el('div', { style: { flex: '1', minWidth: '240px' } }, [pattern]),
      el('label', { class: 'inline' }, ['flags', flags]),
    ])));
    root.appendChild(panel('Input', inputArea));
    root.appendChild(panel('Matches', el('div', {}, [highlight, summary])));
    root.appendChild(panel('Replacement', el('div', {}, [replacement])));
    root.appendChild(panel('Replace result', replaceOut.el, copyButton(() => replaceOut.el.textContent)));
    render();
  },
};

function renderHighlight(target, input, matches) {
  if (!input) { target.textContent = ''; return; }
  if (!matches.length) {
    target.textContent = input;
    return;
  }
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) target.appendChild(document.createTextNode(input.slice(cursor, m.index)));
    const mark = document.createElement('mark');
    mark.textContent = m.match;
    target.appendChild(mark);
    cursor = m.index + m.match.length;
  }
  if (cursor < input.length) target.appendChild(document.createTextNode(input.slice(cursor)));
}

function summarizeGroups(matches) {
  if (!matches.length) return '';
  const first = matches[0];
  const parts = [];
  if (first.groups && first.groups.length) parts.push(`그룹 ${first.groups.length}개`);
  if (first.named && Object.keys(first.named).length) parts.push(`named: ${Object.keys(first.named).join(', ')}`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}
