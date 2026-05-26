// CSS 색상 파싱 + HEX/RGB/HSL 상호 변환 + Tailwind v3 팔레트 매칭.
// DOM 의존 없음. 색상명(red, blue 등 CSS named color)은 지원하지 않음 — 브라우저에 의존하지 않기 위해.

const TW_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const TW_RAW = {
  slate:   ['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#020617'],
  gray:    ['#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827','#030712'],
  zinc:    ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b'],
  neutral: ['#fafafa','#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717','#0a0a0a'],
  stone:   ['#fafaf9','#f5f5f4','#e7e5e4','#d6d3d1','#a8a29e','#78716c','#57534e','#44403c','#292524','#1c1917','#0c0a09'],
  red:     ['#fef2f2','#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a'],
  orange:  ['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12','#431407'],
  amber:   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03'],
  yellow:  ['#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12','#422006'],
  lime:    ['#f7fee7','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#4d7c0f','#3f6212','#365314','#1a2e05'],
  green:   ['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d','#052e16'],
  emerald: ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
  teal:    ['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a','#042f2e'],
  cyan:    ['#ecfeff','#cffafe','#a5f3fc','#67e8f9','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75','#164e63','#083344'],
  sky:     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49'],
  blue:    ['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554'],
  indigo:  ['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b'],
  violet:  ['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#2e1065'],
  purple:  ['#faf5ff','#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87','#3b0764'],
  fuchsia: ['#fdf4ff','#fae8ff','#f5d0fe','#f0abfc','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75','#4a044e'],
  pink:    ['#fdf2f8','#fce7f3','#fbcfe8','#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d','#831843','#500724'],
  rose:    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519'],
};

export const TAILWIND_PALETTE = [];
for (const [hue, hexes] of Object.entries(TW_RAW)) {
  hexes.forEach((hex, i) => {
    const rgb = hexToRgbRaw(hex);
    if (rgb) TAILWIND_PALETTE.push({ name: `${hue}-${TW_SHADES[i]}`, hex, ...rgb });
  });
}

function hexToRgbRaw(hex) {
  const m = String(hex).replace(/^#/, '');
  if (m.length !== 6) return null;
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

export function parseColor(input) {
  if (input == null) return null;
  const t = String(input).trim().toLowerCase();
  if (!t) return null;

  // HEX (with or without #): 3, 4, 6, 8 chars
  const hex = t.match(/^#?([0-9a-f]+)$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) return rgba(dbl(h[0]), dbl(h[1]), dbl(h[2]), 1);
    if (h.length === 4) return rgba(dbl(h[0]), dbl(h[1]), dbl(h[2]), dbl(h[3]) / 255);
    if (h.length === 6) return rgba(p16(h, 0), p16(h, 2), p16(h, 4), 1);
    if (h.length === 8) return rgba(p16(h, 0), p16(h, 2), p16(h, 4), p16(h, 6) / 255);
    return null;
  }

  // rgb / rgba
  const rgbM = t.match(/^rgba?\(\s*([^)]+)\s*\)$/);
  if (rgbM) {
    const parts = splitArgs(rgbM[1]);
    if (parts.length < 3) return null;
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    const a = parts[3] != null ? parseAlpha(parts[3]) : 1;
    if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
    return rgba(r, g, b, a);
  }

  // hsl / hsla
  const hslM = t.match(/^hsla?\(\s*([^)]+)\s*\)$/);
  if (hslM) {
    const parts = splitArgs(hslM[1]);
    if (parts.length < 3) return null;
    const h = parseHue(parts[0]);
    const s = parsePercent(parts[1]);
    const l = parsePercent(parts[2]);
    const a = parts[3] != null ? parseAlpha(parts[3]) : 1;
    if ([h, s, l, a].some((v) => Number.isNaN(v))) return null;
    const { r, g, b } = hslToRgb(h, s, l);
    return rgba(r, g, b, a);
  }

  return null;
}

function dbl(c) { return parseInt(c + c, 16); }
function p16(s, i) { return parseInt(s.slice(i, i + 2), 16); }
function rgba(r, g, b, a) {
  return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clamp01(a) };
}
function splitArgs(s) {
  // 콤마, 공백, 슬래시 모두 허용
  return s.split(/[\s,/]+/).map((x) => x.trim()).filter(Boolean);
}
function parseChannel(s) {
  if (s.endsWith('%')) return Math.round(parseFloat(s) * 2.55);
  return parseInt(s, 10);
}
function parseHue(s) {
  if (s.endsWith('deg')) return parseFloat(s);
  if (s.endsWith('turn')) return parseFloat(s) * 360;
  if (s.endsWith('rad')) return parseFloat(s) * 180 / Math.PI;
  return parseFloat(s);
}
function parsePercent(s) {
  return parseFloat(s);
}
function parseAlpha(s) {
  if (s.endsWith('%')) return parseFloat(s) / 100;
  return parseFloat(s);
}
function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function clamp01(v) {
  if (Number.isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
}

export function rgbToHsl(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h, s, l) {
  const ss = s / 100, ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) { r1 = c; g1 = x; }
  else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; }
  else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = ll - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

const hh = (v) => v.toString(16).padStart(2, '0');

export function toHex({ r, g, b, a = 1 }) {
  let s = `#${hh(r)}${hh(g)}${hh(b)}`;
  if (a < 1) s += hh(Math.round(a * 255));
  return s;
}

export function toRgb({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function toRgba({ r, g, b, a = 1 }) {
  return `rgba(${r}, ${g}, ${b}, ${trimAlpha(a)})`;
}

export function toHsl(c) {
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function toHsla(c) {
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
  const a = c.a ?? 1;
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${trimAlpha(a)})`;
}

function trimAlpha(a) {
  return Number(Number(a).toFixed(3)).toString();
}

export function nearestTailwind({ r, g, b }, n = 5) {
  const scored = TAILWIND_PALETTE.map((p) => ({
    name: p.name,
    hex: p.hex,
    distance: Math.sqrt((p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2),
  }));
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, n);
}
