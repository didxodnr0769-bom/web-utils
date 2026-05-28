// 유틸별 입력값 + 활성 유틸 영속화
//
// 07_curl_parser/js/store.js 의 패턴(subscribe / emit / persistNow) 동일.
// 입력 중에는 emit 없이 활성 inputs 객체를 직접 mutate + persistNow() 호출 — caret 보존.

const STORAGE_KEY = 'web-utils:v1';

const defaults = {
  jwt: { token: '' },
  base64: { text: '', mode: 'encode', urlSafe: false },
  url: { text: '', mode: 'encode' },
  'unix-timestamp': { value: '', tz: 'local' },
  curl: { text: '', favorites: [] },
  json: { text: '', mode: 'pretty', indent: 2 },
  color: { text: '#3b82f6' },
};

function defaultState() {
  return {
    activeUtil: 'jwt',
    inputs: cloneDefaults(),
  };
}

function cloneDefaults() {
  const out = {};
  for (const k of Object.keys(defaults)) out[k] = cloneDeep(defaults[k]);
  return out;
}

function cloneDeep(v) {
  // defaults 에 array(예: favorites) 가 있어 shared reference 가 되지 않도록
  // 단순 값/배열/객체만 다룬다.
  if (Array.isArray(v)) return v.map(cloneDeep);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = cloneDeep(v[k]);
    return o;
  }
  return v;
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return defaultState();
    const merged = defaultState();
    if (typeof data.activeUtil === 'string') merged.activeUtil = data.activeUtil;
    if (data.inputs && typeof data.inputs === 'object') {
      for (const k of Object.keys(merged.inputs)) {
        if (data.inputs[k] && typeof data.inputs[k] === 'object') {
          merged.inputs[k] = { ...merged.inputs[k], ...data.inputs[k] };
        }
      }
    }
    return merged;
  } catch {
    return defaultState();
  }
}

function persistNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode 무시
  }
}

function emit() {
  persistNow();
  for (const fn of listeners) fn(state);
}

export const store = {
  get() { return state; },
  getInputs(id) {
    if (!state.inputs[id]) state.inputs[id] = cloneDeep(defaults[id] || {});
    return state.inputs[id];
  },
  setActive(id) {
    if (state.activeUtil === id) return;
    state.activeUtil = id;
    emit();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  persistNow,
  reset(id) {
    if (id) {
      state.inputs[id] = cloneDeep(defaults[id] || {});
    } else {
      state = defaultState();
    }
    emit();
  },
};
