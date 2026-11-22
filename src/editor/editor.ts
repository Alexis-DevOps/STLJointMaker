import { calibrate, imageFor, rectify } from '../background';
import {
  arcFrom3,
  bounds,
  cloneEntity,
  entityBounds,
  handles,
  hitDistance,
  mirrorEntity,
  rotateEntity,
  sample,
  setHandle,
  snapPoints,
  translateEntity,
  type SnapKind,
} from '../geom/entities';
import { buildLoops } from '../geom/loops';
import { washerRegions } from '../geom/mesh';
import { dist, sub, type Vec2 } from '../geom/vec';
import { t } from '../i18n';
import { uid, type Entity, type Role } from '../model';
import { store } from '../store';
import { formDialog, toast } from '../ui/dialogs';

export type ToolId =
  | 'select'
  | 'line'
  | 'polyline'
  | 'arc'
  | 'circle'
  | 'rect'
  | 'rrect'
  | 'spline'
  | 'measure'
  | 'calibrate'
  | 'perspective'
  | 'bgmove'
  | 'mirror'
  | 'rotate'
  | 'cpattern';

interface View {
  cx: number;
  cy: number;
  zoom: number; // px per mm
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'move'; last: Vec2; started: boolean; sx: number; sy: number }
  | { kind: 'handle'; entityId: string; index: number; started: boolean }
  | { kind: 'box'; a: Vec2; b: Vec2 }
  | { kind: 'bg'; last: Vec2; started: boolean };

const GRID_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const SNAP_PX = 10;
const HIT_PX = 7;

export class Editor {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  view: View = { cx: 0, cy: 0, zoom: 4 };
  tool: ToolId = 'select';
  private pts: Vec2[] = [];
  cursor: Vec2 = { x: 0, y: 0 };
  private screenCursor: { x: number; y: number } | null = null;
  private snap: { p: Vec2; kind: SnapKind } | null = null;
  private drag: Drag | null = null;
  private hoverId: string | null = null;
  private spaceDown = false;
  private shiftDown = false;
  private altDown = false;
  measure: { a: Vec2; b: Vec2 } | null = null;
  openChains: Vec2[][] = [];
  onStatus: () => void = () => {};
  private raf = 0;
  private w = 0;
  private h = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.resize();
    this.bind();
  }

  // ---------- coordinates ----------
  toScreen(p: Vec2): { x: number; y: number } {
    return { x: (p.x - this.view.cx) * this.view.zoom + this.w / 2, y: (this.view.cy - p.y) * this.view.zoom + this.h / 2 };
  }
  toWorld(sx: number, sy: number): Vec2 {
    return { x: (sx - this.w / 2) / this.view.zoom + this.view.cx, y: this.view.cy - (sy - this.h / 2) / this.view.zoom };
  }

  gridStep(): number {
    return GRID_STEPS.find((s) => s * this.view.zoom >= 12) ?? 1000;
  }

  private resize(): void {
    const parent = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  private busy = false;
  private setBusy(b: boolean): void {
    this.busy = b;
    document.body.classList.toggle('busy', b);
  }

  // ---------- public API ----------
  setTool(tool: ToolId): void {
    if (tool === 'mirror' || tool === 'rotate' || tool === 'cpattern') {
      if (store.selection.size === 0) {
        toast(t('msg.selectFirst'));
        return;
      }
    }
    if ((tool === 'calibrate' || tool === 'perspective' || tool === 'bgmove') && !store.project.background) {
      toast(t('msg.noImage'));
      return;
    }
    if (tool === 'bgmove' && store.project.background?.locked) {
      toast(t('msg.bgLocked'));
      return;
    }
    this.tool = tool;
    this.pts = [];
    this.drag = null;
    if (tool !== 'measure') this.measure = null;
    store.emit('tool');
    this.render();
  }

  cancel(): void {
    if (this.pts.length && (this.tool === 'polyline' || this.tool === 'spline') && this.pts.length >= 2) {
      this.finishPoly(false);
      return;
    }
    if (this.pts.length) {
      this.pts = [];
    } else if (this.tool !== 'select') {
      this.setTool('select');
      return;
    } else {
      store.clearSelection();
    }
    this.render();
  }

  /** Enter key. */
  confirm(): void {
    if ((this.tool === 'polyline' || this.tool === 'spline') && this.pts.length >= 2) this.finishPoly(false);
  }

  hint(): string {
    const n = this.pts.length;
    switch (this.tool) {
      case 'select':
        return t('hint.select');
      case 'line':
        return n === 0 ? t('hint.line0') : t('hint.line1');
      case 'polyline':
      case 'spline':
        return n === 0 ? t('hint.poly0') : t('hint.poly1');
      case 'arc':
        return [t('hint.arc0'), t('hint.arc1'), t('hint.arc2')][n] ?? '';
      case 'circle':
        return n === 0 ? t('hint.circle0') : t('hint.circle1');
      case 'rect':
      case 'rrect':
        return n === 0 ? t('hint.rect0') : t('hint.rect1');
      case 'measure':
        return n === 0 ? t('hint.measure0') : t('hint.measure1');
      case 'calibrate':
        return n === 0 ? t('hint.calib0') : t('hint.calib1');
      case 'perspective':
        return [t('hint.persp0'), t('hint.persp1'), t('hint.persp2'), t('hint.persp3')][n] ?? '';
      case 'bgmove':
        return t('hint.bgmove');
      case 'mirror':
        return n === 0 ? t('hint.mirror0') : t('hint.mirror1');
      case 'rotate':
      case 'cpattern':
        return t('hint.pickCenter');
    }
  }

  /** Whether the current tool expects a radius as a single number. */
  expectsRadius(): boolean {
    return this.tool === 'circle' && this.pts.length === 1;
  }

  /** Typed coordinate input: "x,y", "@dx,dy" or a radius for circles. */
  feedText(text: string): boolean {
    const s = text.trim().replace(/\s+/g, '');
    if (!s) return false;
    const num = (x: string) => Number(x.replace(',', '.'));
    if (this.expectsRadius() && /^[dr]?[\d.]+$/i.test(s)) {
      let r = num(s.replace(/^[dr]/i, ''));
      if (/^d/i.test(s)) r /= 2;
      if (!(r > 0)) return false;
      this.click({ x: this.pts[0].x + r, y: this.pts[0].y });
      return true;
    }
    // "x,y" or "x;y" (the latter allows French decimal commas: "12,5;3")
    const rel = s.startsWith('@');
    const body = rel ? s.slice(1) : s;
    const parts = body.includes(';') ? body.split(';') : body.split(',');
    if (parts.length !== 2 || parts.some((x) => x === '')) return false;
    const x = num(parts[0]);
    const y = num(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const base = rel && this.pts.length ? this.pts[this.pts.length - 1] : { x: 0, y: 0 };
    const p = { x: base.x + x, y: base.y + y };
    if (this.tool === 'select') {
      this.view.cx = p.x;
      this.view.cy = p.y;
      this.render();
      return true;
    }
    this.click(p);
    return true;
  }

  fit(): void {
    const pts: Vec2[] = [];
    for (const part of store.project.parts) for (const e of part.entities) pts.push(...sample(e, 0.5).pts);
    const bg = store.project.background;
    if (pts.length === 0 && bg && bg.visible) {
      const hw = (bg.pxW * bg.mmPerPx) / 2;
      const hh = (bg.pxH * bg.mmPerPx) / 2;
      pts.push({ x: bg.cx - hw, y: bg.cy - hh }, { x: bg.cx + hw, y: bg.cy + hh });
    }
    const b = bounds(pts);
    if (!b) {
      this.view = { cx: 0, cy: 0, zoom: 4 };
    } else {
      const w = Math.max(b.max.x - b.min.x, 1);
      const h = Math.max(b.max.y - b.min.y, 1);
      this.view.cx = (b.min.x + b.max.x) / 2;
      this.view.cy = (b.min.y + b.max.y) / 2;
      this.view.zoom = Math.max(0.05, Math.min(400, 0.85 * Math.min(this.w / w, this.h / h)));
    }
    this.render();
  }

  zoomBy(k: number, sx = this.w / 2, sy = this.h / 2): void {
    const before = this.toWorld(sx, sy);
    this.view.zoom = Math.max(0.02, Math.min(2000, this.view.zoom * k));
    const after = this.toWorld(sx, sy);
    this.view.cx += before.x - after.x;
    this.view.cy += before.y - after.y;
    this.render();
  }

  // ---------- entity creation ----------
  private role(): Role {
    return 'profile';
  }

  private addEntities(ents: Entity[]): void {
    store.edit(() => store.part.entities.push(...ents));
    store.select(ents.map((e) => e.id));
  }

  private finishPoly(closed: boolean): void {
    const pts = this.pts.slice();
    this.pts = [];
    if (pts.length < 2 || (closed && pts.length < 3)) {
      this.render();
      return;
    }
    const type = this.tool === 'spline' ? 'spline' : 'polyline';
    this.addEntities([{ id: uid(), role: this.role(), type, pts, closed }]);
  }

  private async click(p: Vec2): Promise<void> {
    const tool = this.tool;
    switch (tool) {
      case 'line':
        if (this.pts.length === 0) this.pts = [p];
        else {
          if (dist(this.pts[0], p) > 1e-6) this.addEntities([{ id: uid(), role: this.role(), type: 'line', a: this.pts[0], b: p }]);
          this.pts = [p];
        }
        break;
      case 'polyline':
      case 'spline':
        if (this.pts.length >= 3 && dist(p, this.pts[0]) * this.view.zoom <= SNAP_PX) {
          this.finishPoly(true);
          return;
        }
        if (this.pts.length === 0 || dist(this.pts[this.pts.length - 1], p) > 1e-6) this.pts.push(p);
        break;
      case 'arc':
        this.pts.push(p);
        if (this.pts.length === 3) {
          const a = arcFrom3(this.pts[0], this.pts[2], this.pts[1]);
          this.pts = [];
          if (a) this.addEntities([{ id: uid(), role: this.role(), type: 'arc', ...a }]);
        }
        break;
      case 'circle':
        if (this.pts.length === 0) this.pts = [p];
        else {
          const r = dist(this.pts[0], p);
          const c = this.pts[0];
          this.pts = [];
          if (r > 1e-6) this.addEntities([{ id: uid(), role: this.role(), type: 'circle', c, r }]);
        }
        break;
      case 'rect':
      case 'rrect':
        if (this.pts.length === 0) this.pts = [p];
        else {
          const a = this.pts[0];
          this.pts = [];
          const w = Math.abs(p.x - a.x);
          const h = Math.abs(p.y - a.y);
          if (w > 1e-6 && h > 1e-6) {
            this.addEntities([
              {
                id: uid(),
                role: this.role(),
                type: 'rect',
                c: { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 },
                w,
                h,
                angle: 0,
                radius: tool === 'rrect' ? Math.min(store.settings.rectRadius, w / 2, h / 2) : 0,
              },
            ]);
          }
        }
        break;
      case 'measure':
        if (this.pts.length === 0) {
          this.pts = [p];
          this.measure = null;
        } else {
          this.measure = { a: this.pts[0], b: p };
          this.pts = [];
        }
        break;
      case 'calibrate':
        this.pts.push(p);
        if (this.pts.length === 2) {
          const [a, b] = this.pts;
          this.pts = [];
          this.render();
          const res = await formDialog(t('dlg.calibTitle'), [
            { key: 'd', label: t('dlg.calibDist'), type: 'number', value: Number(dist(a, b).toFixed(2)), min: 0.01 },
          ]);
          if (res && store.project.background) {
            const d = Number(res.d);
            store.edit(() => (store.project.background = calibrate(store.project.background!, a, b, d)));
            toast(t('msg.calibrated'));
            this.setTool('select');
          }
        }
        break;
      case 'perspective':
        this.pts.push(p);
        if (this.pts.length === 4) {
          const corners = this.pts.slice();
          this.render();
          const res = await formDialog(t('dlg.perspTitle'), [
            { key: 'w', label: t('dlg.perspW'), type: 'number', value: Number(dist(corners[0], corners[1]).toFixed(1)), min: 0.1 },
            { key: 'h', label: t('dlg.perspH'), type: 'number', value: Number(dist(corners[0], corners[3]).toFixed(1)), min: 0.1 },
          ]);
          this.pts = [];
          if (res && store.project.background) {
            toast(t('msg.processing'));
            this.setBusy(true);
            await new Promise((r) => setTimeout(r, 30)); // let the toast paint
            try {
              const nb = await rectify(store.project.background, corners, Number(res.w), Number(res.h));
              store.edit(() => (store.project.background = nb));
              toast(t('msg.rectified'));
            } catch {
              toast(t('msg.rectifyFailed'));
            } finally {
              this.setBusy(false);
            }
          }
          if (this.tool === 'perspective') this.setTool('select');
        }
        break;
      case 'mirror':
        this.pts.push(p);
        if (this.pts.length === 2) {
          const [a, b] = this.pts;
          this.pts = [];
          if (dist(a, b) > 1e-6) {
            const copies = store.selected.map((e) => {
              const c = cloneEntity(e, uid());
              mirrorEntity(c, a, b);
              return c;
            });
            this.addEntities(copies);
          }
          this.setTool('select');
        }
        break;
      case 'rotate': {
        const res = await formDialog(t('dlg.rotateTitle'), [
          { key: 'a', label: t('dlg.angle'), type: 'number', value: 90 },
          { key: 'copy', label: t('dlg.keepOriginal'), type: 'checkbox', value: false },
        ]);
        if (res) {
          const ang = (Number(res.a) * Math.PI) / 180;
          if (res.copy) {
            const copies = store.selected.map((e) => {
              const c = cloneEntity(e, uid());
              rotateEntity(c, p, ang);
              return c;
            });
            this.addEntities(copies);
          } else {
            store.edit(() => store.selected.forEach((e) => rotateEntity(e, p, ang)));
          }
        }
        this.setTool('select');
        break;
      }
      case 'cpattern': {
        const res = await formDialog(t('dlg.cpatternTitle'), [
          { key: 'n', label: t('dlg.count'), type: 'number', value: 4, min: 2, step: 1 },
          { key: 'a', label: t('dlg.totalAngle'), type: 'number', value: 360 },
        ]);
        if (res) {
          const n = Math.max(2, Math.round(Number(res.n)));
          const total = Number(res.a);
          const full = Math.abs(Math.abs(total) - 360) < 1e-6;
          const stepA = ((total / (full ? n : n - 1)) * Math.PI) / 180;
          const copies: Entity[] = [];
          for (let k = 1; k < n; k++) {
            for (const e of store.selected) {
              const c = cloneEntity(e, uid());
              rotateEntity(c, p, stepA * k);
              copies.push(c);
            }
          }
          this.addEntities(copies);
        }
        this.setTool('select');
        break;
      }
      default:
        break;
    }
    store.emit('tool');
    this.render();
  }

  // ---------- snapping ----------
  private computeSnap(raw: Vec2, exclude?: Set<string>): Vec2 {
    this.snap = null;
    if (this.altDown) return raw;
    const tolW = SNAP_PX / this.view.zoom;
    let best: { p: Vec2; kind: SnapKind } | null = null;
    let bestD = tolW;
    const consider = (p: Vec2, kind: SnapKind) => {
      const d = dist(p, raw);
      if (d < bestD) {
        bestD = d;
        best = { p, kind };
      }
    };
    if (store.settings.snapPoints) {
      const parts = store.settings.showGhosts ? store.project.parts : [store.part];
      for (const part of parts) {
        for (const e of part.entities) {
          if (exclude?.has(e.id)) continue;
          for (const s of snapPoints(e)) consider(s.p, s.kind);
        }
      }
      for (const p of this.pts) consider(p, 'vertex');
      consider({ x: 0, y: 0 }, 'center');
    }
    if (best) {
      this.snap = best;
      return { ...(best as { p: Vec2 }).p };
    }
    let p = raw;
    // ortho / 45° constraint while drawing from a previous point
    if (this.shiftDown && this.pts.length && ['line', 'polyline', 'spline', 'measure'].includes(this.tool)) {
      const o = this.pts[this.pts.length - 1];
      const d = sub(raw, o);
      const ang = Math.round(Math.atan2(d.y, d.x) / (Math.PI / 4)) * (Math.PI / 4);
      const l = Math.hypot(d.x, d.y);
      p = { x: o.x + l * Math.cos(ang), y: o.y + l * Math.sin(ang) };
      return p;
    }
    if (store.settings.snapGrid) {
      const g = this.gridStep();
      p = { x: Math.round(raw.x / g) * g, y: Math.round(raw.y / g) * g };
      this.snap = { p, kind: 'grid' };
    }
    return p;
  }

  // ---------- hit testing ----------
  private hit(p: Vec2): Entity | null {
    const tol = HIT_PX / this.view.zoom;
    let best: Entity | null = null;
    let bestD = tol;
    for (const e of store.part.entities) {
      const d = hitDistance(e, p, Math.max(0.5 / this.view.zoom, 0.01));
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private hitHandle(sx: number, sy: number): { id: string; index: number } | null {
    const sel = store.selected;
    if (sel.length !== 1) return null;
    const hs = handles(sel[0]);
    for (let i = hs.length - 1; i >= 0; i--) {
      const s = this.toScreen(hs[i]);
      if (Math.hypot(s.x - sx, s.y - sy) <= HIT_PX) return { id: sel[0].id, index: i };
    }
    return null;
  }

  // ---------- events ----------
  private bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      this.zoomBy(k, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    c.addEventListener('pointerdown', (e) => {
      if (this.busy) return;
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
      c.setPointerCapture(e.pointerId);
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      this.shiftDown = e.shiftKey;
      this.altDown = e.altKey;
      if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
        this.drag = { kind: 'pan', sx, sy, cx: this.view.cx, cy: this.view.cy };
        c.style.cursor = 'grabbing';
        return;
      }
      if (e.button === 2) {
        this.cancel();
        return;
      }
      if (e.button !== 0) return;
      const raw = this.toWorld(sx, sy);
      if (this.tool === 'select') {
        const hh = this.hitHandle(sx, sy);
        if (hh) {
          this.drag = { kind: 'handle', entityId: hh.id, index: hh.index, started: false };
          return;
        }
        const hit = this.hit(raw);
        if (hit) {
          if (e.shiftKey) store.toggle(hit.id);
          else if (!store.selection.has(hit.id)) store.select([hit.id]);
          if (store.selection.has(hit.id)) {
            this.drag = { kind: 'move', last: this.computeSnap(raw, store.selection), started: false, sx, sy };
          }
        } else {
          if (!e.shiftKey) store.clearSelection();
          this.drag = { kind: 'box', a: raw, b: raw };
        }
        this.render();
        return;
      }
      if (this.tool === 'bgmove') {
        this.drag = { kind: 'bg', last: raw, started: false };
        return;
      }
      const p = this.computeSnap(raw);
      void this.click(p);
    });

    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      this.shiftDown = e.shiftKey;
      this.altDown = e.altKey;
      this.screenCursor = { x: sx, y: sy };
      const raw = this.toWorld(sx, sy);
      const d = this.drag;
      if (d?.kind === 'pan') {
        this.view.cx = d.cx - (sx - d.sx) / this.view.zoom;
        this.view.cy = d.cy + (sy - d.sy) / this.view.zoom;
        this.cursor = raw;
      } else if (d?.kind === 'move') {
        const p = this.computeSnap(raw, store.selection);
        if (!d.started && Math.hypot(sx - d.sx, sy - d.sy) < 3) return;
        if (!d.started) {
          store.checkpoint();
          d.started = true;
        }
        const delta = sub(p, d.last);
        d.last = p;
        store.selected.forEach((en) => translateEntity(en, delta));
        store.changed();
        this.cursor = p;
      } else if (d?.kind === 'handle') {
        const p = this.computeSnap(raw, new Set([d.entityId]));
        const en = store.part.entities.find((x) => x.id === d.entityId);
        if (en) {
          if (!d.started) {
            store.checkpoint();
            d.started = true;
          }
          setHandle(en, d.index, p);
          store.changed();
        }
        this.cursor = p;
      } else if (d?.kind === 'box') {
        d.b = raw;
        this.cursor = raw;
      } else if (d?.kind === 'bg') {
        const bg = store.project.background;
        if (bg) {
          if (!d.started) {
            store.checkpoint();
            d.started = true;
          }
          bg.cx += raw.x - d.last.x;
          bg.cy += raw.y - d.last.y;
          d.last = raw;
          store.changed();
        }
        this.cursor = raw;
      } else {
        this.cursor = this.tool === 'select' ? raw : this.computeSnap(raw);
        if (this.tool === 'select') {
          const h = this.hit(raw);
          const id = h?.id ?? null;
          const handle = this.hitHandle(sx, sy);
          c.style.cursor = handle ? 'move' : id ? 'pointer' : 'default';
          this.hoverId = id;
        } else {
          c.style.cursor = this.spaceDown ? 'grab' : 'crosshair';
        }
      }
      this.onStatus();
      this.render();
    });

    const end = (e: PointerEvent) => {
      const d = this.drag;
      this.drag = null;
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      if (d?.kind === 'pan') c.style.cursor = this.spaceDown ? 'grab' : 'default';
      if (d?.kind === 'box') {
        const minX = Math.min(d.a.x, d.b.x);
        const maxX = Math.max(d.a.x, d.b.x);
        const minY = Math.min(d.a.y, d.b.y);
        const maxY = Math.max(d.a.y, d.b.y);
        if ((maxX - minX) * this.view.zoom > 3 || (maxY - minY) * this.view.zoom > 3) {
          const crossing = d.b.x < d.a.x;
          const ids = store.part.entities
            .filter((en) => {
              const b = entityBounds(en);
              if (!b) return false;
              if (crossing) return b.max.x >= minX && b.min.x <= maxX && b.max.y >= minY && b.min.y <= maxY;
              return b.min.x >= minX && b.max.x <= maxX && b.min.y >= minY && b.max.y <= maxY;
            })
            .map((en) => en.id);
          store.select(ids, e.shiftKey);
        }
      }
      this.render();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => {
      this.screenCursor = null;
      this.render();
    });
    c.addEventListener('dblclick', () => {
      if ((this.tool === 'polyline' || this.tool === 'spline') && this.pts.length >= 2) {
        // the dblclick's second click added a duplicate point; it is filtered in click()
        this.finishPoly(false);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !isTyping(e)) {
        this.spaceDown = true;
        if (!this.drag) this.canvas.style.cursor = 'grab';
      }
      this.shiftDown = e.shiftKey;
      this.altDown = e.altKey;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        this.canvas.style.cursor = 'default';
      }
      this.shiftDown = e.shiftKey;
      this.altDown = e.altKey;
    });
  }

  // ---------- rendering ----------
  render(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    const ctx = this.ctx;
    const cs = getComputedStyle(document.documentElement);
    const col = (n: string) => cs.getPropertyValue(n).trim();
    const C = {
      bg: col('--canvas-bg'),
      grid: col('--grid'),
      gridMajor: col('--grid-major'),
      axis: col('--axis'),
      profile: col('--profile'),
      construction: col('--construction'),
      bead: col('--bead'),
      sel: col('--selection'),
      hover: col('--hover'),
      fill: col('--fill'),
      ghost: col('--ghost'),
      snap: col('--snap'),
      error: col('--error'),
      preview: col('--preview'),
      text: col('--text'),
    };
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    this.drawBackground(ctx);
    this.drawGrid(ctx, C);

    const tol = Math.max(0.4 / this.view.zoom, 0.005);
    const part = store.part;

    // ghost parts
    if (store.settings.showGhosts) {
      ctx.strokeStyle = C.ghost;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      for (const other of store.project.parts) {
        if (other.id === part.id) continue;
        for (const e of other.entities) this.strokePath(ctx, sample(e, tol).pts, sample(e, tol).closed);
      }
    }

    // filled preview of the gasket area
    const j = part.joint;
    if (j.type === 'flat' || j.type === 'bead') {
      const loops = buildLoops(part.entities, tol, 'profile').loops;
      if (loops.length) {
        ctx.beginPath();
        for (const l of loops) this.tracePath(ctx, l, true);
        ctx.fillStyle = C.fill;
        ctx.fill('evenodd');
      }
    } else if (j.type === 'washer') {
      ctx.beginPath();
      for (const r of washerRegions(j, tol)) {
        this.tracePath(ctx, r.outer, true);
        r.holes.forEach((h) => this.tracePath(ctx, h, true));
      }
      ctx.fillStyle = C.fill;
      ctx.fill('evenodd');
      ctx.strokeStyle = C.profile;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (j.type === 'oring' || j.type === 'square' || j.type === 'custom') {
      // show the swept band width
      const width = j.type === 'oring' ? j.cord : j.type === 'square' ? j.sqW : sectionWidth(j.section);
      const shift = j.align === 'inside' ? width / 2 : j.align === 'outside' ? -width / 2 : 0;
      const loops = buildLoops(part.entities, tol, 'profile').loops;
      ctx.save();
      ctx.strokeStyle = C.fill;
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, width * this.view.zoom);
      for (const l of loops) {
        const pts = shift === 0 ? l : offsetLoop(l, shift);
        this.strokePath(ctx, pts, true);
      }
      ctx.restore();
    }

    // entities
    for (const e of part.entities) {
      const s = sample(e, tol);
      const selected = store.selection.has(e.id);
      const hover = e.id === this.hoverId && this.tool === 'select';
      ctx.setLineDash(e.role === 'construction' ? [6, 4] : []);
      ctx.strokeStyle = selected ? C.sel : hover ? C.hover : e.role === 'construction' ? C.construction : e.role === 'bead' ? C.bead : C.profile;
      ctx.lineWidth = selected || hover ? 2.5 : 1.6;
      this.strokePath(ctx, s.pts, s.closed);
    }
    ctx.setLineDash([]);

    // open chain ends
    ctx.fillStyle = C.error;
    for (const ch of this.openChains) {
      for (const p of [ch[0], ch[ch.length - 1]]) {
        const s = this.toScreen(p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // handles
    if (this.tool === 'select' && store.selection.size === 1) {
      const e = store.selected[0];
      if (e) {
        ctx.fillStyle = C.bg;
        ctx.strokeStyle = C.sel;
        ctx.lineWidth = 1.5;
        for (const h of handles(e)) {
          const s = this.toScreen(h);
          ctx.beginPath();
          ctx.rect(s.x - 4, s.y - 4, 8, 8);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    this.drawToolPreview(ctx, C, tol);

    // box selection
    if (this.drag?.kind === 'box') {
      const a = this.toScreen(this.drag.a);
      const b = this.toScreen(this.drag.b);
      const crossing = this.drag.b.x < this.drag.a.x;
      ctx.setLineDash(crossing ? [5, 4] : []);
      ctx.strokeStyle = C.sel;
      ctx.fillStyle = crossing ? 'rgba(80,200,120,0.08)' : 'rgba(80,140,255,0.08)';
      ctx.lineWidth = 1;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.setLineDash([]);
    }

    // measure
    if (this.measure) this.drawDim(ctx, this.measure.a, this.measure.b, C.snap, C.text);

    // snap marker
    if (this.snap && this.snap.kind !== 'grid' && this.tool !== 'select' && this.screenCursor) {
      const s = this.toScreen(this.snap.p);
      ctx.strokeStyle = C.snap;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (this.snap.kind === 'center') ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      else if (this.snap.kind === 'mid') {
        ctx.moveTo(s.x, s.y - 7);
        ctx.lineTo(s.x + 7, s.y + 5);
        ctx.lineTo(s.x - 7, s.y + 5);
        ctx.closePath();
      } else ctx.rect(s.x - 6, s.y - 6, 12, 12);
      ctx.stroke();
    }

    // crosshair cursor dot
    if (this.screenCursor && this.tool !== 'select' && this.tool !== 'bgmove') {
      const s = this.toScreen(this.cursor);
      ctx.fillStyle = C.snap;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const bg = store.project.background;
    if (!bg || !bg.visible) return;
    const img = imageFor(bg.dataUrl);
    if (!img) return;
    const s = this.toScreen({ x: bg.cx, y: bg.cy });
    ctx.save();
    ctx.globalAlpha = bg.opacity;
    ctx.translate(s.x, s.y);
    ctx.rotate((-bg.rotation * Math.PI) / 180);
    const k = bg.mmPerPx * this.view.zoom;
    ctx.scale(k, k);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -bg.pxW / 2, -bg.pxH / 2, bg.pxW, bg.pxH);
    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, C: Record<string, string>): void {
    const g = this.gridStep();
    const major = g * 10;
    const tl = this.toWorld(0, 0);
    const br = this.toWorld(this.w, this.h);
    const line = (step: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.floor(tl.x / step) * step; x <= br.x; x += step) {
        const s = Math.round(this.toScreen({ x, y: 0 }).x) + 0.5;
        ctx.moveTo(s, 0);
        ctx.lineTo(s, this.h);
      }
      for (let y = Math.floor(br.y / step) * step; y <= tl.y; y += step) {
        const s = Math.round(this.toScreen({ x: 0, y }).y) + 0.5;
        ctx.moveTo(0, s);
        ctx.lineTo(this.w, s);
      }
      ctx.stroke();
    };
    line(g, C.grid);
    line(major, C.gridMajor);
    const o = this.toScreen({ x: 0, y: 0 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(o.x + 0.5, 0);
    ctx.lineTo(o.x + 0.5, this.h);
    ctx.moveTo(0, o.y + 0.5);
    ctx.lineTo(this.w, o.y + 0.5);
    ctx.stroke();
    // scale bar
    ctx.fillStyle = C.text;
    ctx.font = '11px system-ui, sans-serif';
    const barPx = major * this.view.zoom;
    if (barPx < this.w / 2) {
      const y = this.h - 14;
      ctx.fillRect(12, y, barPx, 2);
      ctx.fillText(`${fmt(major)} mm`, 12, y - 4);
    }
  }

  private tracePath(ctx: CanvasRenderingContext2D, pts: Vec2[], closed: boolean): void {
    if (!pts.length) return;
    const s0 = this.toScreen(pts[0]);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < pts.length; i++) {
      const s = this.toScreen(pts[i]);
      ctx.lineTo(s.x, s.y);
    }
    if (closed) ctx.closePath();
  }

  private strokePath(ctx: CanvasRenderingContext2D, pts: Vec2[], closed: boolean): void {
    ctx.beginPath();
    this.tracePath(ctx, pts, closed);
    ctx.stroke();
  }

  private drawDim(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, color: string, text: string): void {
    const sa = this.toScreen(a);
    const sb = this.toScreen(b);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const label = `${fmt(dist(a, b))} mm`;
    ctx.font = '12px system-ui, sans-serif';
    const mx = (sa.x + sb.x) / 2;
    const my = (sa.y + sb.y) / 2;
    const w = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mx - w / 2, my - 20, w, 17);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, mx - w / 2 + 4, my - 7);
    void text;
  }

  private drawToolPreview(ctx: CanvasRenderingContext2D, C: Record<string, string>, tol: number): void {
    const pts = this.pts;
    if (!pts.length) return;
    const cur = this.cursor;
    ctx.strokeStyle = C.preview;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    const tmp = (e: Entity) => {
      const s = sample(e, tol);
      this.strokePath(ctx, s.pts, s.closed);
    };
    switch (this.tool) {
      case 'line':
      case 'measure':
      case 'calibrate':
      case 'mirror':
        this.strokePath(ctx, [pts[0], cur], false);
        if (this.tool !== 'mirror') this.drawDim(ctx, pts[0], cur, C.snap, C.text);
        break;
      case 'polyline':
        this.strokePath(ctx, [...pts, cur], false);
        break;
      case 'spline':
        tmp({ id: '', role: 'profile', type: 'spline', pts: [...pts, cur], closed: false });
        break;
      case 'arc':
        if (pts.length === 1) this.strokePath(ctx, [pts[0], cur], false);
        else {
          const a = arcFrom3(pts[0], cur, pts[1]);
          if (a) tmp({ id: '', role: 'profile', type: 'arc', ...a });
        }
        break;
      case 'circle':
        tmp({ id: '', role: 'profile', type: 'circle', c: pts[0], r: dist(pts[0], cur) });
        this.drawDim(ctx, pts[0], cur, C.snap, C.text);
        break;
      case 'rect':
      case 'rrect': {
        const w = Math.abs(cur.x - pts[0].x);
        const h = Math.abs(cur.y - pts[0].y);
        tmp({
          id: '',
          role: 'profile',
          type: 'rect',
          c: { x: (cur.x + pts[0].x) / 2, y: (cur.y + pts[0].y) / 2 },
          w,
          h,
          angle: 0,
          radius: this.tool === 'rrect' ? Math.min(store.settings.rectRadius, w / 2, h / 2) : 0,
        });
        break;
      }
      case 'perspective':
        this.strokePath(ctx, [...pts, cur], pts.length === 3);
        break;
      default:
        break;
    }
    ctx.setLineDash([]);
    ctx.fillStyle = C.preview;
    for (const p of pts) {
      const s = this.toScreen(p);
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    if (this.tool === 'perspective') {
      ctx.font = 'bold 12px system-ui, sans-serif';
      pts.forEach((p, i) => {
        const s = this.toScreen(p);
        ctx.fillText(String(i + 1), s.x + 6, s.y - 6);
      });
    }
  }
}

export function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function sectionWidth(s: Vec2[]): number {
  if (!s.length) return 0;
  return Math.max(...s.map((p) => p.x)) - Math.min(...s.map((p) => p.x));
}

/** Simple miter offset of a loop (positive = outward), for display only. */
function offsetLoop(loop: Vec2[], d: number): Vec2[] {
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  const sgn = area >= 0 ? 1 : -1;
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = loop[(i - 1 + n) % n];
    const p1 = loop[i];
    const p2 = loop[(i + 1) % n];
    const n0 = normal(p0, p1, sgn);
    const n1 = normal(p1, p2, sgn);
    let mx = n0.x + n1.x;
    let my = n0.y + n1.y;
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    const k = 1 / Math.max(mx * n1.x + my * n1.y, 0.3);
    out.push({ x: p1.x + mx * d * k, y: p1.y + my * d * k });
  }
  return out;
}

function normal(a: Vec2, b: Vec2, sgn: number): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: (sgn * dy) / l, y: (-sgn * dx) / l };
}
