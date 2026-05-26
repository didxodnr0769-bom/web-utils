import { store } from '../store.js';
import { convertCase } from '../utils/case-converter.js';
import { el, viewHeader, panel, copyButton, kvTable } from '../ui/widgets.js';

export default {
  id: 'case',
  label: 'Case Converter',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('case');

    const input = el('input', { type: 'text', spellcheck: 'false', placeholder: '예: helloWorldExample / hello world / hello-world' });
    input.value = s.text;

    const tableWrap = el('div');

    const render = () => {
      tableWrap.innerHTML = '';
      const r = convertCase(s.text);
      tableWrap.appendChild(kvTable([
        ['camelCase', r.camel],
        ['PascalCase', r.pascal],
        ['snake_case', r.snake],
        ['CONSTANT_CASE', r.constant],
        ['kebab-case', r.kebab],
        ['Title Case', r.title],
        ['Sentence case', r.sentence],
        ['tokens', r.tokens.join(' / ')],
      ]));
    };

    input.addEventListener('input', () => { s.text = input.value; store.persistNow(); render(); });

    root.appendChild(viewHeader('Case Converter', '단어 경계를 추론해 다양한 케이스로 한 번에 변환합니다.'));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Output', tableWrap, copyButton(() => {
      const r = convertCase(s.text);
      return [
        `camelCase: ${r.camel}`,
        `PascalCase: ${r.pascal}`,
        `snake_case: ${r.snake}`,
        `CONSTANT_CASE: ${r.constant}`,
        `kebab-case: ${r.kebab}`,
      ].join('\n');
    }, 'Copy all')));
    render();
  },
};
