import { store } from '../store.js';
import { encodeUrl, decodeUrl } from '../utils/url-codec.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'url',
  label: 'URL Encode/Decode',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('url');

    const input = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '예: hello world&foo=한글' });
    input.value = s.text;
    const out = outputBlock();

    const seg = segmented(
      [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }],
      s.mode,
      (v) => { s.mode = v; store.persistNow(); render(); }
    );

    const render = () => {
      if (!s.text) { out.set(''); return; }
      if (s.mode === 'encode') {
        out.set(encodeUrl(s.text));
      } else {
        const r = decodeUrl(s.text);
        if (r.ok) out.set(r.value);
        else out.set(r.error, { error: true });
      }
    };
    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('URL Encode/Decode', 'encodeURIComponent / decodeURIComponent 기준.'));
    root.appendChild(panel('Mode', seg));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', out.el, copyButton(() => out.el.textContent)));
    render();
  },
};
