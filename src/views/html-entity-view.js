import { store } from '../store.js';
import { encodeHtmlEntity, decodeHtmlEntity } from '../utils/html-entity.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'html-entity',
  label: 'HTML Entity',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('html-entity');

    const input = el('textarea', { class: 'tall', spellcheck: 'false', placeholder: '예: <div class="x">©</div>' });
    input.value = s.text;
    const out = outputBlock();

    const seg = segmented(
      [{ label: 'Encode', value: 'encode' }, { label: 'Decode', value: 'decode' }],
      s.mode,
      (v) => { s.mode = v; store.persistNow(); render(); }
    );

    const render = () => {
      if (!s.text) { out.set(''); return; }
      out.set(s.mode === 'encode' ? encodeHtmlEntity(s.text) : decodeHtmlEntity(s.text));
    };
    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('HTML Entity', '&, <, >, ", \' 와 non-ASCII를 엔티티로 변환하거나 되돌립니다.'));
    root.appendChild(panel('Mode', seg));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', out.el, copyButton(() => out.el.textContent)));
    render();
  },
};
