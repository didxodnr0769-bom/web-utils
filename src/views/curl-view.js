import { store } from '../store.js';
import { parseCurl, serializeCurl } from '../utils/curl.js';
import { el, viewHeader, panel, copyButton, outputBlock } from '../ui/widgets.js';

const SAMPLE = `curl 'https://api.example.com/users?page=1' \\
  -X POST \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer xxx' \\
  -H 'cookie: sid=abc; tracker=xyz; lang=ko' \\
  --data-raw '{"name":"Jane"}' \\
  --compressed`;

export default {
  id: 'curl',
  label: 'cURL Parser',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('curl');
    let model = parseCurl(s.text);

    const input = el('textarea', {
      class: 'tall',
      spellcheck: 'false',
      placeholder: SAMPLE,
    });
    input.value = s.text;

    const methodInput = el('input', { type: 'text', placeholder: 'GET' });
    const urlInput = el('input', { type: 'text', placeholder: 'https://...' });
    const queryWrap = el('div', { class: 'kv-edit' });
    const headersWrap = el('div', { class: 'kv-edit' });
    const bodyFlagTag = el('span', { class: 'tag' });
    const bodyInput = el('textarea', { spellcheck: 'false' });
    const unknownWrap = el('div');
    const serializedOut = outputBlock();

    function updateOutput() {
      try {
        serializedOut.set(serializeCurl(model));
      } catch (e) {
        serializedOut.set(String((e && e.message) || e), { error: true });
      }
    }

    function syncSerialized() {
      try {
        s.text = serializeCurl(model);
      } catch {
        return updateOutput();
      }
      store.persistNow();
      serializedOut.set(s.text);
    }

    function renderQuery() {
      queryWrap.innerHTML = '';
      model.query.forEach((_, i) => {
        const row = el('div', { class: 'kv-row' });
        const kIn = el('input', { type: 'text', placeholder: 'key' });
        kIn.value = model.query[i].key;
        kIn.addEventListener('input', () => { model.query[i].key = kIn.value; syncSerialized(); });
        const vIn = el('input', { type: 'text', placeholder: 'value' });
        vIn.value = model.query[i].value;
        vIn.addEventListener('input', () => { model.query[i].value = vIn.value; syncSerialized(); });
        const del = el('button', { class: 'btn small', type: 'button', title: 'remove' }, '×');
        del.addEventListener('click', () => {
          model.query.splice(i, 1);
          renderQuery();
          syncSerialized();
        });
        row.appendChild(kIn);
        row.appendChild(vIn);
        row.appendChild(del);
        queryWrap.appendChild(row);
      });
      const addBtn = el('button', { class: 'btn small', type: 'button' }, '+ Param');
      addBtn.addEventListener('click', () => {
        model.query.push({ key: '', value: '' });
        renderQuery();
        syncSerialized();
      });
      queryWrap.appendChild(addBtn);
    }

    function renderHeaderRow(idx) {
      const h = model.headers[idx];
      const isCookie = (h.key || '').toLowerCase() === 'cookie';

      const kIn = el('input', { type: 'text', placeholder: 'header name' });
      kIn.value = h.key;
      kIn.addEventListener('input', () => {
        model.headers[idx].key = kIn.value;
        syncSerialized();
      });
      // Cookie 분기는 blur 시점에만 — 입력 중 caret jump 방지
      kIn.addEventListener('change', () => {
        const nowCookie = (model.headers[idx].key || '').toLowerCase() === 'cookie';
        if (nowCookie !== isCookie) renderHeaders();
      });

      const del = el('button', { class: 'btn small', type: 'button', title: 'remove header' }, '×');
      del.addEventListener('click', () => {
        model.headers.splice(idx, 1);
        renderHeaders();
        syncSerialized();
      });

      if (isCookie) {
        const cookies = parseCookies(h.value);
        const cookieList = el('div', { class: 'kv-edit nested' });

        function persistCookies() {
          h.value = formatCookies(cookies);
          syncSerialized();
        }

        function renderCookieRows() {
          cookieList.innerHTML = '';
          cookies.forEach((_, ci) => {
            const cRow = el('div', { class: 'kv-row' });
            const ckIn = el('input', { type: 'text', placeholder: 'name' });
            ckIn.value = cookies[ci].name;
            ckIn.addEventListener('input', () => { cookies[ci].name = ckIn.value; persistCookies(); });
            const cvIn = el('input', { type: 'text', placeholder: 'value' });
            cvIn.value = cookies[ci].value;
            cvIn.addEventListener('input', () => { cookies[ci].value = cvIn.value; persistCookies(); });
            const cDel = el('button', { class: 'btn small', type: 'button', title: 'remove cookie' }, '×');
            cDel.addEventListener('click', () => {
              cookies.splice(ci, 1);
              renderCookieRows();
              persistCookies();
            });
            cRow.appendChild(ckIn);
            cRow.appendChild(cvIn);
            cRow.appendChild(cDel);
            cookieList.appendChild(cRow);
          });
          const addBtn = el('button', { class: 'btn small', type: 'button' }, '+ Cookie');
          addBtn.addEventListener('click', () => {
            cookies.push({ name: '', value: '' });
            renderCookieRows();
            persistCookies();
          });
          cookieList.appendChild(addBtn);
        }
        renderCookieRows();

        return el('div', { class: 'cookie-block' }, [
          el('div', { class: 'kv-row' }, [
            kIn,
            el('span', { class: 'hint cookie-hint' }, '세미콜론 분리'),
            del,
          ]),
          cookieList,
        ]);
      }

      const vIn = el('input', { type: 'text', placeholder: 'value' });
      vIn.value = h.value;
      vIn.addEventListener('input', () => {
        model.headers[idx].value = vIn.value;
        syncSerialized();
      });
      return el('div', { class: 'kv-row' }, [kIn, vIn, del]);
    }

    function renderHeaders() {
      headersWrap.innerHTML = '';
      model.headers.forEach((_, i) => {
        headersWrap.appendChild(renderHeaderRow(i));
      });
      const addBtn = el('button', { class: 'btn small', type: 'button' }, '+ Header');
      addBtn.addEventListener('click', () => {
        model.headers.push({ key: '', value: '' });
        renderHeaders();
        syncSerialized();
      });
      headersWrap.appendChild(addBtn);
    }

    function renderUnknown() {
      unknownWrap.innerHTML = '';
      if (model.unknown.length) {
        const list = el('ul', { style: { margin: '0', paddingLeft: '18px' } });
        for (const u of model.unknown) {
          list.appendChild(el('li', { style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, u));
        }
        unknownWrap.appendChild(list);
      } else {
        unknownWrap.appendChild(el('div', { class: 'hint' }, 'None.'));
      }
    }

    function refreshBody() {
      bodyInput.value = model.body || '';
      if (model.body) {
        bodyFlagTag.textContent = model.bodyFlag || '--data-raw';
        bodyFlagTag.style.display = '';
      } else {
        bodyFlagTag.textContent = '';
        bodyFlagTag.style.display = 'none';
      }
    }

    function reloadFromRaw() {
      try {
        model = parseCurl(input.value);
      } catch (e) {
        serializedOut.set(String((e && e.message) || e), { error: true });
        return;
      }
      methodInput.value = model.method;
      urlInput.value = model.urlBase;
      refreshBody();
      renderQuery();
      renderHeaders();
      renderUnknown();
      syncSerialized();
    }

    input.addEventListener('input', () => {
      s.text = input.value;
      reloadFromRaw();
    });

    methodInput.addEventListener('input', () => {
      model.method = methodInput.value.toUpperCase();
      syncSerialized();
    });

    urlInput.addEventListener('input', () => {
      model.urlBase = urlInput.value;
      syncSerialized();
    });

    bodyInput.addEventListener('input', () => {
      model.body = bodyInput.value;
      if (model.body && !model.bodyFlag) {
        model.bodyFlag = '--data-raw';
      }
      bodyFlagTag.textContent = model.body ? (model.bodyFlag || '--data-raw') : '';
      bodyFlagTag.style.display = model.body ? '' : 'none';
      syncSerialized();
    });

    methodInput.value = model.method;
    urlInput.value = model.urlBase;
    refreshBody();
    renderQuery();
    renderHeaders();
    renderUnknown();

    const summaryBody = el('div', { class: 'curl-summary' }, [
      el('label', { class: 'kv-label' }, 'Method'),
      methodInput,
      el('label', { class: 'kv-label' }, 'URL'),
      urlInput,
    ]);

    const bodyHeaderExtras = el('span', { class: 'row', style: { gap: '6px' } }, [
      bodyFlagTag,
    ]);

    root.appendChild(viewHeader(
      'cURL Parser',
      'curl 명령을 붙여넣으면 메서드/URL/쿼리/헤더/바디로 분해합니다. 각 항목을 수정하면 하단의 정규화된 curl이 실시간으로 갱신됩니다.',
    ));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Method / URL', summaryBody));
    root.appendChild(panel('Query', queryWrap));
    root.appendChild(panel('Headers', headersWrap));
    root.appendChild(panel('Body', bodyInput, bodyHeaderExtras));
    root.appendChild(panel('Ignored options', unknownWrap));
    root.appendChild(panel('Serialized curl', serializedOut.el, copyButton(() => serializedOut.el.textContent)));

    // 초기 렌더는 표시만 — s.text 가 비어있는 상태를 `curl ''` 로 덮어쓰지 않도록.
    if (s.text.trim()) updateOutput();
    else serializedOut.set('');
  },
};

function parseCookies(value) {
  const out = [];
  const raw = (value || '').trim();
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const seg = part.trim();
    if (!seg) continue;
    const eq = seg.indexOf('=');
    if (eq < 0) out.push({ name: seg, value: '' });
    else out.push({ name: seg.slice(0, eq).trim(), value: seg.slice(eq + 1).trim() });
  }
  return out;
}

function formatCookies(cookies) {
  return cookies
    .filter((c) => c.name || c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}
