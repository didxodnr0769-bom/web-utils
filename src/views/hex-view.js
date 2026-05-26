import { store } from '../store.js';
import { encodeHex, decodeHex } from '../utils/hex.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'hex',
  label: 'Hex',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('hex');

    const input = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '예: hello 또는 68 65 6c 6c 6f' });
    input.value = s.text;
    const out = outputBlock();

    const seg = segmented(
      [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }],
      s.mode,
      (v) => { s.mode = v; store.persistNow(); render(); }
    );

    const sepSel = el('select');
    for (const [v, label] of [[' ', 'space'], ['', '(none)'], [':', 'colon'], ['\n', 'newline']]) {
      const opt = el('option', { value: v }, label);
      if (v === s.sep) opt.setAttribute('selected', '');
      sepSel.appendChild(opt);
    }
    sepSel.value = s.sep;
    const sepLabel = el('label', { class: 'inline' }, ['구분자', sepSel]);

    const render = () => {
      if (!s.text) { out.set(''); return; }
      if (s.mode === 'encode') {
        out.set(encodeHex(s.text, { sep: s.sep }));
      } else {
        const r = decodeHex(s.text);
        if (r.ok) out.set(r.value);
        else out.set(r.error, { error: true });
      }
    };
    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });
    sepSel.addEventListener('change', () => { s.sep = sepSel.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('Hex', 'UTF-8 바이트와 hex 사이를 변환합니다.'));
    root.appendChild(panel('Mode', el('div', { class: 'row' }, [seg, sepLabel])));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', out.el, copyButton(() => out.el.textContent)));
    render();
  },
};
