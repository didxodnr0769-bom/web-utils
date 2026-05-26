import { store } from '../store.js';
import { parseColor, toHex, toRgb, toRgba, toHsl, toHsla, nearestTailwind } from '../utils/color.js';
import { el, viewHeader, panel, kvTable } from '../ui/widgets.js';

export default {
  id: 'color',
  label: 'Color Converter',
  group: 'tools',

  mount(root) {
    const s = store.getInputs('color');

    const picker = el('input', {
      type: 'color',
      class: 'color-picker-native',
      title: '컬러 피커 열기',
    });

    const input = el('input', {
      type: 'text',
      placeholder: '#3b82f6, rgb(59 130 246), hsl(217 91% 60% / 0.8) ...',
      spellcheck: 'false',
    });
    input.value = s.text;

    const swatch = el('div', { class: 'color-swatch clickable', title: '클릭해서 컬러 피커 열기' });
    const formatsWrap = el('div');
    const twWrap = el('div');
    const err = el('div', { class: 'hint error', style: { display: 'none' } });

    function pickerHex(color) {
      // 네이티브 picker 는 #rrggbb (opaque) 만 받음
      const h = '#'
        + color.r.toString(16).padStart(2, '0')
        + color.g.toString(16).padStart(2, '0')
        + color.b.toString(16).padStart(2, '0');
      return h;
    }

    function render({ skipPickerSync = false } = {}) {
      const color = parseColor(s.text);
      if (!color) {
        err.style.display = '';
        err.textContent = s.text.trim() ? '인식할 수 없는 색상 형식 (HEX / RGB(A) / HSL(A) 지원).' : '색상 값을 입력하세요.';
        swatch.style.background = '';
        swatch.classList.remove('checker');
        formatsWrap.innerHTML = '';
        twWrap.innerHTML = '';
        return;
      }
      err.style.display = 'none';

      const hex = toHex(color);
      swatch.style.background = hex;
      swatch.classList.toggle('checker', color.a < 1);
      if (!skipPickerSync) picker.value = pickerHex(color);

      formatsWrap.innerHTML = '';
      formatsWrap.appendChild(kvTable([
        ['HEX', copyableValue(hex)],
        ['RGB', copyableValue(toRgb(color))],
        ['RGBA', copyableValue(toRgba(color))],
        ['HSL', copyableValue(toHsl(color))],
        ['HSLA', copyableValue(toHsla(color))],
      ]));

      twWrap.innerHTML = '';
      const matches = nearestTailwind(color, 6);
      if (matches.length) {
        const list = el('div', { class: 'tw-matches' });
        for (const m of matches) {
          const chip = el('button', { class: 'tw-chip', type: 'button', title: `클릭해서 ${m.hex} 적용` }, [
            el('span', { class: 'tw-swatch', style: { background: m.hex } }),
            el('div', { class: 'tw-info' }, [
              el('div', { class: 'tw-name' }, m.name),
              el('div', { class: 'tw-hex' }, m.hex),
            ]),
            el('span', { class: 'tw-dist' }, `Δ ${m.distance.toFixed(1)}`),
          ]);
          chip.addEventListener('click', () => {
            applyHex(m.hex);
          });
          list.appendChild(chip);
        }
        twWrap.appendChild(list);
      }
    }

    function applyHex(hex) {
      s.text = hex;
      input.value = hex;
      store.persistNow();
      render();
    }

    input.addEventListener('input', () => {
      s.text = input.value;
      store.persistNow();
      render();
    });

    // 피커 드래그 중에는 input(연속), 닫을 때는 change. 둘 다 처리.
    const onPick = () => {
      s.text = picker.value;
      input.value = picker.value;
      store.persistNow();
      render({ skipPickerSync: true });
    };
    picker.addEventListener('input', onPick);
    picker.addEventListener('change', onPick);

    swatch.addEventListener('click', () => {
      if (typeof picker.showPicker === 'function') {
        try { picker.showPicker(); return; } catch { /* 일부 브라우저 거부 — fallback */ }
      }
      picker.click();
    });

    const inputRow = el('div', { class: 'color-input-row' }, [picker, input]);

    root.appendChild(viewHeader(
      'Color Converter',
      'HEX / RGB(A) / HSL(A) 사이를 상호 변환합니다. 텍스트에 직접 입력하거나 옆 피커 / 미리보기 swatch 클릭으로 색을 고를 수 있고, 가장 가까운 Tailwind 색상도 함께 표시합니다.',
    ));
    root.appendChild(panel('Input', [inputRow, err]));
    root.appendChild(panel('Preview', swatch));
    root.appendChild(panel('Formats', formatsWrap));
    root.appendChild(panel('Tailwind palette matches', twWrap));
    render();
  },
};

function copyableValue(text) {
  const span = el('span', { class: 'copyable', title: '클릭해서 복사' }, text);
  span.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      span.classList.add('copied');
      setTimeout(() => span.classList.remove('copied'), 800);
    } catch {
      // 클립보드 권한 거부 등 — 조용히 무시
    }
  });
  return span;
}
