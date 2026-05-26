import { store } from '../store.js';
import { decodeJwt } from '../utils/jwt.js';
import { el, viewHeader, panel, copyButton, outputBlock, kvTable } from '../ui/widgets.js';

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
      if (result.meta.iat) rows.push(['iat', result.meta.iat]);
      if (result.meta.nbf) rows.push(['nbf', result.meta.nbf]);
      if (result.meta.exp) {
        rows.push(['exp', result.meta.exp + (result.meta.expired ? '  (만료됨)' : '')]);
      }
      if (rows.length) metaWrap.appendChild(kvTable(rows));
    };

    input.addEventListener('input', () => {
      s.token = input.value;
      store.persistNow();
      render();
    });

    root.appendChild(viewHeader('JWT Decoder', '토큰을 붙여넣으면 header/payload/signature로 분해합니다. 서명 검증은 하지 않습니다.'));
    root.appendChild(panel('Token', input));
    root.appendChild(panel('Header', headerOut.el, copyButton(() => headerOut.el.textContent)));
    root.appendChild(panel('Payload', payloadOut.el, copyButton(() => payloadOut.el.textContent)));
    root.appendChild(panel('Signature', sigOut.el, copyButton(() => sigOut.el.textContent)));
    root.appendChild(panel('Claims', metaWrap));
    render();
  },
};
