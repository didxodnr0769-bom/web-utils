import { store } from '../store.js';
import {
  parseCurl,
  serializeCurl,
  bodyToFields,
  fieldsToBody,
  parseFieldValue,
  detectFieldType,
} from '../utils/curl.js';
import { el, viewHeader, panel, copyButton, outputBlock, segmented } from '../ui/widgets.js';

function valueTypeLabel(text) {
  return detectFieldType(parseFieldValue(text));
}

function autosizeTextarea(ta) {
  // height 를 auto 로 잠깐 풀어야 scrollHeight 가 현재 content 기준으로 잡힌다.
  ta.style.height = 'auto';
  ta.style.height = (ta.scrollHeight + 2) + 'px'; // +2: border 보정
}

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
    const bodyFieldsWrap = el('div', { class: 'kv-edit' });
    const bodyPanelBody = el('div');
    const initialFields = bodyToFields(model.body);
    let bodyFields = initialFields || [];
    let bodyMode = initialFields !== null ? 'fields' : 'raw';
    const unknownWrap = el('div');
    const serializedOut = outputBlock();

    // --- Favorites ---
    if (!Array.isArray(s.favorites)) s.favorites = [];
    const favListWrap = el('div', { class: 'fav-list' });
    const favNameInput = el('input', {
      type: 'text',
      placeholder: '예: A그룹 직원 등록',
    });
    const favSaveBtn = el('button', { class: 'btn', type: 'button' }, '저장');

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

    function renderFavorites() {
      favListWrap.innerHTML = '';
      if (!s.favorites.length) {
        favListWrap.appendChild(el('div', { class: 'hint' }, '저장된 cURL 이 없습니다.'));
        return;
      }
      s.favorites.forEach((fav, i) => {
        const row = el('div', { class: 'fav-row' });
        const nameIn = el('input', { type: 'text', placeholder: '이름' });
        nameIn.value = fav.name;
        nameIn.addEventListener('input', () => {
          s.favorites[i].name = nameIn.value;
          store.persistNow();
        });
        const loadBtn = el('button', { class: 'btn small', type: 'button' }, '불러오기');
        loadBtn.addEventListener('click', () => loadFavorite(fav));
        const del = el('button', { class: 'btn small', type: 'button', title: 'remove' }, '×');
        del.addEventListener('click', () => {
          if (!confirm(`'${fav.name || '(이름 없음)'}' 을(를) 삭제하시겠습니까?`)) return;
          s.favorites.splice(i, 1);
          store.persistNow();
          renderFavorites();
        });
        row.appendChild(nameIn);
        row.appendChild(loadBtn);
        row.appendChild(del);
        favListWrap.appendChild(row);
      });
    }

    function saveFavorite() {
      const name = favNameInput.value.trim();
      if (!name) {
        favNameInput.focus();
        return;
      }
      if (!s.text.trim()) {
        alert('저장할 cURL 이 없습니다.');
        return;
      }
      s.favorites.unshift({
        id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        text: s.text,
      });
      store.persistNow();
      favNameInput.value = '';
      renderFavorites();
    }

    function loadFavorite(fav) {
      input.value = fav.text;
      s.text = fav.text;
      reloadFromRaw();
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
      // raw 입력으로부터 다시 들어왔으면 fields 를 항상 현재 body 기준으로 재생성한다
      // (INPUT 을 비웠을 때 stale 한 fields 가 남는 문제 방지)
      bodyFields = bodyToFields(model.body) || [];
      renderBodyPanel();
    }

    function renderBodyFields() {
      bodyFieldsWrap.innerHTML = '';
      bodyFields.forEach((_, i) => {
        const field = bodyFields[i];
        const kIn = el('input', { type: 'text', placeholder: 'field' });
        kIn.value = field.key;
        kIn.addEventListener('input', () => {
          bodyFields[i].key = kIn.value;
          syncBodyFromFields();
        });
        const typeTag = el('span', { class: 'tag tag-type' }, valueTypeLabel(field.value));
        const del = el('button', { class: 'btn small', type: 'button', title: 'remove field' }, '×');
        del.addEventListener('click', () => {
          bodyFields.splice(i, 1);
          renderBodyFields();
          syncBodyFromFields();
        });

        if (field.multiline) {
          // Object / Array 값: 단일라인 행과 동일한 좌/우 레이아웃,
          // value 자리에 content 높이에 맞춰 자동 확장되는 textarea.
          const row = el('div', { class: 'kv-row multiline' });
          const vIn = el('textarea', { spellcheck: 'false', class: 'json-area' });
          vIn.value = field.value;
          vIn.addEventListener('input', () => {
            bodyFields[i].value = vIn.value;
            typeTag.textContent = valueTypeLabel(vIn.value);
            autosizeTextarea(vIn);
            syncBodyFromFields();
          });
          row.appendChild(kIn);
          row.appendChild(vIn);
          row.appendChild(typeTag);
          row.appendChild(del);
          bodyFieldsWrap.appendChild(row);
          // DOM 부착 이후에야 scrollHeight 가 정확함 → 다음 프레임에 적용
          requestAnimationFrame(() => autosizeTextarea(vIn));
        } else {
          // primitive 값: 한 줄 입력
          const row = el('div', { class: 'kv-row' });
          const vIn = el('input', { type: 'text', placeholder: 'value' });
          vIn.value = field.value;
          vIn.addEventListener('input', () => {
            bodyFields[i].value = vIn.value;
            typeTag.textContent = valueTypeLabel(vIn.value);
            syncBodyFromFields();
          });
          row.appendChild(kIn);
          row.appendChild(vIn);
          row.appendChild(typeTag);
          row.appendChild(del);
          bodyFieldsWrap.appendChild(row);
        }
      });
      const addBtn = el('button', { class: 'btn small', type: 'button' }, '+ Field');
      addBtn.addEventListener('click', () => {
        bodyFields.push({ key: '', value: '', multiline: false });
        renderBodyFields();
        // 빈 key 행은 직렬화에 영향 없으므로 sync는 입력될 때까지 보류
      });
      bodyFieldsWrap.appendChild(addBtn);
    }

    function renderBodyPanel() {
      bodyPanelBody.innerHTML = '';
      if (bodyMode === 'fields') {
        // body 가 JSON 객체가 아니면 안내문 + raw 로 fallback 안내
        if (model.body && bodyToFields(model.body) === null) {
          bodyPanelBody.appendChild(el(
            'div',
            { class: 'hint' },
            'JSON 객체가 아니어서 필드 편집을 사용할 수 없습니다. Raw 로 전환해 편집하세요.',
          ));
          return;
        }
        renderBodyFields();
        bodyPanelBody.appendChild(bodyFieldsWrap);
      } else {
        bodyInput.value = model.body || '';
        bodyPanelBody.appendChild(bodyInput);
      }
    }

    function syncBodyFromFields() {
      model.body = fieldsToBody(bodyFields);
      if (model.body && !model.bodyFlag) model.bodyFlag = '--data-raw';
      bodyInput.value = model.body;
      bodyFlagTag.textContent = model.body ? (model.bodyFlag || '--data-raw') : '';
      bodyFlagTag.style.display = model.body ? '' : 'none';
      syncSerialized();
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
      // raw 편집 결과로 fields 도 따라오게 한다 (모드 전환 시 일관성)
      bodyFields = bodyToFields(model.body) || [];
      syncSerialized();
    });

    methodInput.value = model.method;
    urlInput.value = model.urlBase;
    refreshBody();
    renderQuery();
    renderHeaders();
    renderUnknown();
    renderFavorites();

    favSaveBtn.addEventListener('click', saveFavorite);
    favNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveFavorite(); }
    });

    const summaryBody = el('div', { class: 'curl-summary' }, [
      el('label', { class: 'kv-label' }, 'Method'),
      methodInput,
      el('label', { class: 'kv-label' }, 'URL'),
      urlInput,
    ]);

    const bodySeg = segmented(
      [
        { value: 'fields', label: 'Fields' },
        { value: 'raw', label: 'Raw' },
      ],
      bodyMode,
      (v) => {
        bodyMode = v;
        renderBodyPanel();
      },
    );

    const bodyHeaderExtras = el('span', { class: 'row', style: { gap: '6px' } }, [
      bodyFlagTag,
      bodySeg,
    ]);

    renderBodyPanel();

    root.appendChild(viewHeader(
      'cURL Parser',
      'curl 명령을 붙여넣으면 메서드/URL/쿼리/헤더/바디로 분해합니다. 각 항목을 수정하면 하단의 정규화된 curl이 실시간으로 갱신됩니다.',
    ));
    root.appendChild(panel('Input', input));
    root.appendChild(panel('Favorites (즐겨찾기)', [
      el('div', { class: 'fav-save-row' }, [favNameInput, favSaveBtn]),
      favListWrap,
    ]));
    root.appendChild(panel('Method / URL', summaryBody));
    root.appendChild(panel('Query', queryWrap));
    root.appendChild(panel('Headers', headersWrap));
    root.appendChild(panel('Body', bodyPanelBody, bodyHeaderExtras));
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
