import { fmt } from '../editor/editor';
import { distToSegment, type Vec2 } from '../geom/vec';
import { t } from '../i18n';
import { DEFAULT_SECTION } from '../model';
import { el, modal } from './dialogs';

const PRESETS: Record<string, () => Vec2[]> = {
  dring: () => DEFAULT_SECTION.map((p) => ({ ...p })),
  lip: () => [
    { x: -1.5, y: 0 },
    { x: 1.5, y: 0 },
    { x: 1.5, y: 1.2 },
    { x: 0.4, y: 2.8 },
    { x: 0, y: 2.8 },
    { x: 0.6, y: 1.2 },
    { x: -1.5, y: 1.2 },
  ],
  xring: () => [
    { x: -1.2, y: 0 },
    { x: -0.4, y: 0 },
    { x: 0, y: 0.5 },
    { x: 0.4, y: 0 },
    { x: 1.2, y: 0 },
    { x: 0.8, y: 1.2 },
    { x: 1.2, y: 2.4 },
    { x: 0.4, y: 2.4 },
    { x: 0, y: 1.9 },
    { x: -0.4, y: 2.4 },
    { x: -1.2, y: 2.4 },
    { x: -0.8, y: 1.2 },
  ],
  halfround: () => {
    const out: Vec2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      out.push({ x: 1.5 * Math.cos(a), y: 1.5 * Math.sin(a) });
    }
    return out;
  },
  trapezoid: () => [
    { x: -1.5, y: 0 },
    { x: 1.5, y: 0 },
    { x: 0.8, y: 2 },
    { x: -0.8, y: 2 },
  ],
};

function parse(text: string): Vec2[] | null {
  const out: Vec2[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let parts: string[];
    if (/[;\s]/.test(line)) parts = line.split(/[;\s]+/).map((s) => s.replace(',', '.'));
    else parts = line.split(',');
    if (parts.length !== 2) return null;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push({ x, y });
  }
  return out.length >= 3 ? out : null;
}

/** Interactive cross-section editor. Resolves with the new section or null. */
export async function sectionEditor(initial: Vec2[]): Promise<Vec2[] | null> {
  let pts = initial.map((p) => ({ ...p }));
  const W = 420;
  const H = 280;
  const canvas = el('canvas', { width: W, height: H, class: 'section-canvas' });
  const ctx = canvas.getContext('2d')!;
  const text = el('textarea', { rows: 8, spellcheck: 'false', class: 'section-text', 'aria-label': t('sec.points') });
  const err = el('div', { class: 'msg error', hidden: true, text: t('sec.invalid') });
  let view = { k: 50, ox: W / 2, oy: H - 30 };

  const fitView = () => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs, -1), maxX = Math.max(...xs, 1), minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
    const k = Math.min((W - 60) / (maxX - minX), (H - 60) / (maxY - minY));
    view = { k, ox: W / 2 - ((minX + maxX) / 2) * k, oy: H / 2 + ((minY + maxY) / 2) * k };
  };
  const toS = (p: Vec2) => ({ x: view.ox + p.x * view.k, y: view.oy - p.y * view.k });
  const toW = (x: number, y: number): Vec2 => ({ x: (x - view.ox) / view.k, y: (view.oy - y) / view.k });
  const snap = (v: number) => Math.round(v * 20) / 20;

  const syncText = () => (text.value = pts.map((p) => `${fmt(p.x)}; ${fmt(p.y)}`).join('\n'));

  const draw = () => {
    const css = getComputedStyle(document.documentElement);
    ctx.fillStyle = css.getPropertyValue('--canvas-bg');
    ctx.fillRect(0, 0, W, H);
    // mm grid
    const step = view.k > 40 ? 0.5 : view.k > 15 ? 1 : 5;
    ctx.strokeStyle = css.getPropertyValue('--grid');
    ctx.beginPath();
    const tl = toW(0, 0);
    const br = toW(W, H);
    for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
      const s = toS({ x, y: 0 }).x;
      ctx.moveTo(s, 0);
      ctx.lineTo(s, H);
    }
    for (let y = Math.floor(br.y / step) * step; y <= tl.y; y += step) {
      const s = toS({ x: 0, y }).y;
      ctx.moveTo(0, s);
      ctx.lineTo(W, s);
    }
    ctx.stroke();
    // bed (z = 0) and path axis (u = 0)
    const o = toS({ x: 0, y: 0 });
    ctx.strokeStyle = css.getPropertyValue('--axis');
    ctx.beginPath();
    ctx.moveTo(0, o.y);
    ctx.lineTo(W, o.y);
    ctx.moveTo(o.x, 0);
    ctx.lineTo(o.x, H);
    ctx.stroke();
    ctx.fillStyle = css.getPropertyValue('--text-muted');
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(t('sec.bed'), 6, o.y - 4);
    ctx.fillText(t('sec.outward') + ' →', W - 90, o.y + 14);
    // polygon
    ctx.beginPath();
    pts.forEach((p, i) => {
      const s = toS(p);
      if (i) ctx.lineTo(s.x, s.y);
      else ctx.moveTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.fillStyle = css.getPropertyValue('--fill');
    ctx.fill();
    ctx.strokeStyle = css.getPropertyValue('--profile');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const p of pts) {
      const s = toS(p);
      ctx.fillStyle = css.getPropertyValue('--selection');
      ctx.fillRect(s.x - 4, s.y - 4, 8, 8);
    }
  };

  let dragIdx = -1;
  const pick = (sx: number, sy: number) => pts.findIndex((p) => {
    const s = toS(p);
    return Math.hypot(s.x - sx, s.y - sy) < 8;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const i = pick(sx, sy);
    if (e.button === 2) {
      if (i >= 0 && pts.length > 3) {
        pts.splice(i, 1);
        syncText();
        draw();
      }
      return;
    }
    if (i >= 0) {
      dragIdx = i;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    // insert on nearest edge
    const w = toW(sx, sy);
    let best = -1;
    let bestD = 10 / view.k;
    for (let k = 0; k < pts.length; k++) {
      const d = distToSegment(w, pts[k], pts[(k + 1) % pts.length]);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best >= 0) {
      pts.splice(best + 1, 0, { x: snap(w.x), y: snap(w.y) });
      dragIdx = best + 1;
      canvas.setPointerCapture(e.pointerId);
      syncText();
      draw();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragIdx < 0) return;
    const r = canvas.getBoundingClientRect();
    const w = toW(e.clientX - r.left, e.clientY - r.top);
    pts[dragIdx] = { x: snap(w.x), y: snap(w.y) };
    syncText();
    draw();
  });
  canvas.addEventListener('pointerup', () => {
    dragIdx = -1;
    fitView();
    draw();
  });
  text.addEventListener('input', () => {
    const p = parse(text.value);
    err.hidden = !!p;
    if (p) {
      pts = p;
      fitView();
      draw();
    }
  });

  const presets = el('div', { class: 'row-buttons' });
  for (const key of Object.keys(PRESETS)) {
    const b = el('button', { type: 'button', text: t(`sec.${key}`) });
    b.addEventListener('click', () => {
      pts = PRESETS[key]();
      syncText();
      fitView();
      draw();
      err.hidden = true;
    });
    presets.append(b);
  }

  const body = el('div', { class: 'section-editor' },
    el('p', { class: 'muted small', text: t('sec.help') }),
    presets,
    el('div', { class: 'section-layout' }, canvas, el('div', {}, el('label', { class: 'small', text: t('sec.points') }), text, err)),
  );
  syncText();
  fitView();
  requestAnimationFrame(draw);
  const r = await modal(t('sec.title'), body, [
    { label: t('btn.cancel'), value: 'cancel' },
    { label: t('btn.ok'), value: 'ok', primary: true },
  ]);
  if (r !== 'ok') return null;
  return pts.length >= 3 ? pts : null;
}
