import { store } from '../store.js';
import { decodeJwt } from '../utils/jwt.js';
import { el, viewHeader, panel, copyButton, outputBlock, kvTable } from '../ui/widgets.js';

const KST_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

function formatKst(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '';
  // en-CA → "2024-01-02, 12:04:05"
  return KST_FMT.format(new Date(seconds * 1000)).replace(',', '') + ' KST';
}

function timestampCell(label, seconds) {
  const kst = formatKst(seconds);
  return el('span', {
    title: kst ? `KST: ${kst}` : undefined,
    class: 'ts-claim',
  }, label);
}

export default {
  id: 'jwt',
  label: 'JWT Decoder',
  group: 'encoding',

  mount(root) {
    const s = store.getInputs('jwt');

    const input = el('textarea', {
      class: 'tall',
      placeholder: 'eyJhbGciOiJIUzI1NiIs...',
      spellcheck: 'false',
    });
    input.value = s.token;

    const headerOut = outputBlock();
    const payloadOut = outputBlock();
    const sigOut = outputBlock();
    const metaWrap = el('div');

    const render = () => {
      const result = decodeJwt(s.token);
      metaWrap.innerHTML = '';
      if (!result.ok) {
        headerOut.set(result.error, { error: true });
        payloadOut.set('');
        sigOut.set('');
        return;
      }
      headerOut.set(JSON.stringify(result.header, null, 2));
      payloadOut.set(JSON.stringify(result.payload, null, 2));
      sigOut.set(result.signature);

      const rows = [];
      if (result.header && result.header.alg) rows.push(['alg', result.header.alg]);
      if (result.header && result.header.typ) rows.push(['typ', result.header.typ]);
      if (typeof result.payload?.iat === 'number') {
        rows.push(['iat', timestampCell(result.meta.iat, result.payload.iat)]);
      }
      if (typeof result.payload?.nbf === 'number') {
        rows.push(['nbf', timestampCell(result.meta.nbf, result.payload.nbf)]);
      }
      if (typeof result.payload?.exp === 'number') {
        const label = result.meta.exp + (result.meta.expired ? '  (만료됨)' : '');
        rows.push(['exp', timestampCell(label, result.payload.exp)]);
      }
      if (rows.length) metaWrap.appendChild(kvTable(rows));
    };

    input.addEventListener('input', () => {
      s.token = input.value;
      store.persistNow();
      render();
    });

    root.appendChild(viewHeader('JWT Decoder', '토큰을 붙여넣으면 header/payload/signature로 분해합니다. 서명 검증은 하지 않습니다. Claims의 시간 값에 마우스를 올리면 한국 시간(KST)으로 표시됩니다.'));
    root.appendChild(panel('Token', input));
    root.appendChild(panel('Header', headerOut.el, copyButton(() => headerOut.el.textContent)));
    root.appendChild(panel('Payload', payloadOut.el, copyButton(() => payloadOut.el.textContent)));
    root.appendChild(panel('Signature', sigOut.el, copyButton(() => sigOut.el.textContent)));
    root.appendChild(panel('Claims', metaWrap));
    render();
  },
};
