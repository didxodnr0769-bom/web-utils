import { store } from '../store.js';
import { parseCurl, serializeCurl } from '../utils/curl.js';
import { el, viewHeader, panel, copyButton, outputBlock, kvTable } from '../ui/widgets.js';

const SAMPLE = `curl 'https://api.example.com/users?page=1' \\
  -X POST \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer xxx' \\
  --data-raw '{"name":"Jane"}' \\
  --compressed`;

export default {
  id: 'curl',
  label: 'cURL Parser',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('curl');

    const input = el('textarea', {
      class: 'tall',
      spellcheck: 'false',
      placeholder: SAMPLE,
    });
    input.value = s.text;

    const summaryWrap = el('div');
    const queryWrap = el('div');
    const headersWrap = el('div');
    const bodyFlagTag = el('span', { class: 'tag' });
    const bodyOut = outputBlock();
    const unknownWrap = el('div');
    const serializedOut = outputBlock();

    const render = () => {
      summaryWrap.innerHTML = '';
      queryWrap.innerHTML = '';
      headersWrap.innerHTML = '';
      unknownWrap.innerHTML = '';
      bodyFlagTag.textContent = '';
      bodyFlagTag.style.display = 'none';

      if (!s.text.trim()) {
        bodyOut.set('');
        serializedOut.set('');
        return;
      }

      let parsed;
      try {
        parsed = parseCurl(s.text);
      } catch (e) {
        bodyOut.set('');
        serializedOut.set(String((e && e.message) || e), { error: true });
        return;
      }

      summaryWrap.appendChild(kvTable([
        ['method', parsed.method],
        ['url', parsed.urlBase || '(none)'],
      ]));

      if (parsed.query.length) {
        queryWrap.appendChild(kvTable(parsed.query.map((q) => [q.key, q.value])));
      } else {
        queryWrap.appendChild(el('div', { class: 'hint' }, 'No query parameters.'));
      }

      if (parsed.headers.length) {
        headersWrap.appendChild(kvTable(parsed.headers.map((h) => [h.key, h.value])));
      } else {
        headersWrap.appendChild(el('div', { class: 'hint' }, 'No headers.'));
      }

      if (parsed.body) {
        bodyFlagTag.textContent = parsed.bodyFlag || '--data-raw';
        bodyFlagTag.style.display = '';
        bodyOut.set(parsed.body);
      } else {
        bodyOut.set('');
      }

      if (parsed.unknown.length) {
        const list = el('ul', { style: { margin: '0', paddingLeft: '18px' } });
        for (const u of parsed.unknown) {
          list.appendChild(el('li', { style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, u));
        }
        unknownWrap.appendChild(list);
      } else {
        unknownWrap.appendChild(el('div', { class: 'hint' }, 'None.'));
      }

      serializedOut.set(serializeCurl(parsed));
    };

    input.addEventListener('input', () => {
      s.text = input.value;
      store.persistNow();
      render();
    });

    const bodyHeaderExtras = el('span', { class: 'row', style: { gap: '6px' } }, [
      bodyFlagTag,
      copyButton(() => bodyOut.el.textContent),
    ]);

    root.appendChild(viewHeader(
      'cURL Parser',
      'curl 명령을 붙여넣으면 메서드/URL/쿼리/헤더/바디로 분해하고, 정규화된 curl로 다시 직렬화합니다.',
    ));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Summary', summaryWrap));
    root.appendChild(panel('Query', queryWrap));
    root.appendChild(panel('Headers', headersWrap));
    root.appendChild(panel('Body', bodyOut.el, bodyHeaderExtras));
    root.appendChild(panel('Ignored options', unknownWrap));
    root.appendChild(panel('Serialized curl', serializedOut.el, copyButton(() => serializedOut.el.textContent)));
    render();
  },
};
