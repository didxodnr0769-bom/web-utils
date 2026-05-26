import { store } from '../store.js';
import { formatJson, minifyJson } from '../utils/json-format.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

export default {
  id: 'json',
  label: 'JSON Formatter',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('json');

    const input = el('textarea', {
      class: 'tall',
      spellcheck: 'false',
      placeholder: '{"hello":"world","items":[1,2,3]}',
    });
    input.value = s.text;

    const out = outputBlock();
    const sizeTag = el('span', { class: 'tag', style: { display: 'none' } });

    const indentSeg = segmented(
      [
        { label: '2 spaces', value: 2 },
        { label: '4 spaces', value: 4 },
        { label: 'Tab', value: 'tab' },
      ],
      s.indent,
      (v) => { s.indent = v; store.persistNow(); render(); },
    );

    function setIndentVisible(visible) {
      indentSeg.style.display = visible ? '' : 'none';
    }

    const modeSeg = segmented(
      [
        { label: 'Pretty', value: 'pretty' },
        { label: 'Minify', value: 'minify' },
      ],
      s.mode,
      (v) => {
        s.mode = v;
        store.persistNow();
        setIndentVisible(v === 'pretty');
        render();
      },
    );
    setIndentVisible(s.mode === 'pretty');

    function render() {
      const result = s.mode === 'minify'
        ? minifyJson(s.text)
        : formatJson(s.text, { indent: s.indent });

      if (result.ok) {
        out.set(result.value);
        if (result.value) {
          sizeTag.textContent = `${result.value.length.toLocaleString()} chars`;
          sizeTag.style.display = '';
        } else {
          sizeTag.style.display = 'none';
        }
      } else {
        const loc = result.line ? ` (line ${result.line}, column ${result.col})` : '';
        out.set(`${result.error}${loc}`, { error: true });
        sizeTag.style.display = 'none';
      }
    }

    input.addEventListener('input', () => {
      s.text = input.value;
      store.persistNow();
      render();
    });

    const outHeaderExtras = el('span', { class: 'row', style: { gap: '6px' } }, [
      sizeTag,
      copyButton(() => out.el.textContent),
    ]);

    root.appendChild(viewHeader(
      'JSON Formatter & Validator',
      '한 줄로 나열된 JSON을 보기 좋게 정렬하거나 미니파이합니다. 문법 오류가 있으면 줄/열 위치를 표시합니다.',
    ));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Mode', el('div', { class: 'row', style: { gap: '12px' } }, [modeSeg, indentSeg])));
    root.appendChild(panel('Output', out.el, outHeaderExtras));
    render();
  },
};
