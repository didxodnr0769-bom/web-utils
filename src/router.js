// 해시 라우팅 (#/jwt 등). 활성 유틸이 바뀌면 현재 view를 unmount하고 새 view를 mount.

import { store } from './store.js';

let currentView = null;
let slotEl = null;
let viewMap = null;

function readHash() {
  const m = location.hash.match(/^#\/([\w-]+)/);
  return m ? m[1] : null;
}

function setHash(id) {
  const target = `#/${id}`;
  if (location.hash !== target) {
    history.replaceState(null, '', target);
  }
}

function activate(id) {
  const view = viewMap.get(id);
  if (!view) return;
  if (currentView && currentView.unmount) currentView.unmount();
  slotEl.innerHTML = '';
  view.mount(slotEl);
  currentView = view;
  store.setActive(id);
  setHash(id);
}

export function initRouter(slot, views) {
  slotEl = slot;
  viewMap = new Map(views.map((v) => [v.id, v]));

  const initial = readHash() || store.get().activeUtil || views[0].id;
  activate(viewMap.has(initial) ? initial : views[0].id);

  window.addEventListener('hashchange', () => {
    const id = readHash();
    if (id && viewMap.has(id) && id !== currentView?.id) activate(id);
  });
}

export function navigate(id) {
  if (viewMap && viewMap.has(id)) activate(id);
}
