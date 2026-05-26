import { store } from '../store.js';
import { encodeBase64, decodeBase64 } from '../utils/base64.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'base64',
  label: 'Base64',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('base64');

    const input = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '인코딩/디코딩할 텍스트' });
    input.value = s.text;

    const out = outputBlock();

    const urlSafeBox = el('input', { type: 'checkbox' });
    urlSafeBox.checked = !!s.urlSafe;
    const urlSafeLabel = el('label', { class: 'inline' }, [urlSafeBox, ' URL-safe (- _ , no padding)']);

    const seg = segmented(
      [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }],
      s.mode,
      (v) => { s.mode = v; store.persistNow(); render(); }
    );

    const render = () => {
      if (!s.text) { out.set(''); return; }
      if (s.mode === 'encode') {
        out.set(encodeBase64(s.text, { urlSafe: s.urlSafe }));
      } else {
        const r = decodeBase64(s.text, { urlSafe: s.urlSafe });
        if (r.ok) out.set(r.value);
        else out.set(r.error, { error: true });
      }
    };

    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });
    urlSafeBox.addEventListener('change', () => { s.urlSafe = urlSafeBox.checked; store.persistNow(); render(); });

    root.appendChild(viewHeader('Base64', 'UTF-8 텍스트와 base64 사이를 변환합니다.'));
    root.appendChild(panel('Mode', el('div', { class: 'row' }, [seg, urlSafeLabel])));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', out.el, copyButton(() => out.el.textContent)));
    render();
  },
};
