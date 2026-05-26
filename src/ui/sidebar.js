import { store } from '../store.js';

const GROUP_LABELS = {
  encoding: 'Encoding / Decoding',
  tools: 'Tools',
};

export function renderSidebar(root, views) {
  root.innerHTML = '';

  const groups = {};
  for (const v of views) {
    const g = v.group || 'tools';
    if (!groups[g]) groups[g] = [];
    groups[g].push(v);
  }

  for (const g of Object.keys(GROUP_LABELS)) {
    if (!groups[g]) continue;
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = GROUP_LABELS[g];
    root.appendChild(title);

    const ul = document.createElement('ul');
    for (const v of groups[g]) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#/${v.id}`;
      a.textContent = v.label;
      a.dataset.id = v.id;
      ul.appendChild(li);
      li.appendChild(a);
    }
    root.appendChild(ul);
  }

  const sync = () => {
    const active = store.get().activeUtil;
    for (const a of root.querySelectorAll('a[data-id]')) {
      a.classList.toggle('active', a.dataset.id === active);
    }
  };
  sync();
  store.subscribe(sync);
}
