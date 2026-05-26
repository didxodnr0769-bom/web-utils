// 재사용 위젯들. DOM 노드를 만들거나 기존 노드에 동작을 붙임.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function viewHeader(title, desc) {
  return el('div', { class: 'view-header' }, [
    el('h2', {}, title),
    desc ? el('p', {}, desc) : null,
  ]);
}

export function panel(title, body, headerExtras = null) {
  const p = el('div', { class: 'panel' });
  if (title || headerExtras) {
    const h = el('h3', {}, title || '');
    if (headerExtras) h.appendChild(headerExtras);
    p.appendChild(h);
  }
  for (const c of [].concat(body)) if (c) p.appendChild(c);
  return p;
}

export function copyButton(getText, label = 'Copy') {
  const btn = el('button', { class: 'btn small', type: 'button' }, label);
  btn.addEventListener('click', async () => {
    const text = getText();
    if (text == null) return;
    try {
      await navigator.clipboard.writeText(String(text));
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = label; }, 1200);
    }
  });
  return btn;
}

export function segmented(options, value, onChange) {
  const wrap = el('div', { class: 'seg' });
  for (const opt of options) {
    const b = el('button', { type: 'button' }, opt.label);
    if (opt.value === value) b.classList.add('active');
    b.addEventListener('click', () => {
      if (opt.value === wrap.dataset.value) return;
      wrap.dataset.value = opt.value;
      for (const c of wrap.children) c.classList.remove('active');
      b.classList.add('active');
      onChange(opt.value);
    });
    wrap.appendChild(b);
  }
  wrap.dataset.value = value;
  return wrap;
}

export function outputBlock(initialText = '', { error = false } = {}) {
  const node = el('div', { class: 'output' + (error ? ' error' : '') }, initialText);
  return {
    el: node,
    set(text, opts = {}) {
      node.textContent = text == null ? '' : String(text);
      node.classList.toggle('error', !!opts.error);
    },
  };
}

export function kvTable(rows) {
  const table = el('table', { class: 'kv-table' });
  for (const [k, v] of rows) {
    const tr = el('tr', {}, [
      el('th', {}, k),
      el('td', {}, v == null ? '' : String(v)),
    ]);
    table.appendChild(tr);
  }
  return table;
}
