import { store } from '../store.js';
import { escapeUnicode, unescapeUnicode } from '../utils/unicode-escape.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'unicode',
  label: 'Unicode Escape',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('unicode');

    const input = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '예: 안녕 또는 \\uc548\\ub155' });
    input.value = s.text;
    const out = outputBlock();

    const seg = segmented(
      [{ label: 'Escape', value: 'escape' }, { label: 'Unescape', value: 'unescape' }],
      s.mode,
      (v) => { s.mode = v; store.persistNow(); render(); }
    );

    const bracesBox = el('input', { type: 'checkbox' });
    bracesBox.checked = !!s.useBraces;
    const bracesLabel = el('label', { class: 'inline' }, [bracesBox, ' \\u{XXXX} 형식 사용 (ES6)']);

    const render = () => {
      if (!s.text) { out.set(''); return; }
      if (s.mode === 'escape') {
        out.set(escapeUnicode(s.text, { useBraces: s.useBraces }));
      } else {
        const r = unescapeUnicode(s.text);
        if (r.ok) out.set(r.value);
        else out.set(r.error, { error: true });
      }
    };
    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });
    bracesBox.addEventListener('change', () => { s.useBraces = bracesBox.checked; store.persistNow(); render(); });

    root.appendChild(viewHeader('Unicode Escape', '\\uXXXX / \\u{XXXX} 표기로 변환. surrogate pair 지원.'));
    root.appendChild(panel('Mode', el('div', { class: 'row' }, [seg, bracesLabel])));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', out.el, copyButton(() => out.el.textContent)));
    render();
  },
};
