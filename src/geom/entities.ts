import type { ArcEntity, Entity, RectEntity } from '../model';
import {
  add,
  circleFrom3,
  dist,
  distToSegment,
  mid,
  mirror as mirrorPt,
  normAngle,
  rotate as rotatePt,
  segmentsForArc,
  sub,
  type Vec2,
} from './vec';

export interface SampledPath {
  pts: Vec2[];
  closed: boolean;
}

function arcPoints(c: Vec2, r: number, a0: number, sweep: number, tol: number, includeEnd = true): Vec2[] {
  const n = segmentsForArc(r, sweep, tol, 2);
  const out: Vec2[] = [];
  const last = includeEnd ? n : n - 1;
  for (let i = 0; i <= last; i++) {
    const a = a0 + (sweep * i) / n;
    out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
  }
  return out;
}

export function arcStart(e: ArcEntity): Vec2 {
  return { x: e.c.x + e.r * Math.cos(e.a0), y: e.c.y + e.r * Math.sin(e.a0) };
}
export function arcEnd(e: ArcEntity): Vec2 {
  const a = e.a0 + e.sweep;
  return { x: e.c.x + e.r * Math.cos(a), y: e.c.y + e.r * Math.sin(a) };
}
export function arcMid(e: ArcEntity): Vec2 {
  const a = e.a0 + e.sweep / 2;
  return { x: e.c.x + e.r * Math.cos(a), y: e.c.y + e.r * Math.sin(a) };
}

/** Arc through start, a point on the arc, and end. Null if collinear. */
export function arcFrom3(p1: Vec2, p2: Vec2, p3: Vec2): Omit<ArcEntity, 'id' | 'role' | 'type'> | null {
  const circ = circleFrom3(p1, p2, p3);
  if (!circ) return null;
  const { c, r } = circ;
  const as = Math.atan2(p1.y - c.y, p1.x - c.x);
  const am = Math.atan2(p2.y - c.y, p2.x - c.x);
  const ae = Math.atan2(p3.y - c.y, p3.x - c.x);
  const sweepCcw = normAngle(ae - as);
  const midCcw = normAngle(am - as);
  if (midCcw < sweepCcw) return { c, r, a0: as, sweep: sweepCcw };
  return { c, r, a0: ae, sweep: Math.PI * 2 - sweepCcw };
}

export function rectCorners(e: RectEntity): Vec2[] {
  const hw = e.w / 2;
  const hh = e.h / 2;
  const local = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return local.map((p) => rotatePt(add(e.c, p), e.c, e.angle));
}

function rectOutline(e: RectEntity, tol: number): Vec2[] {
  const hw = Math.abs(e.w) / 2;
  const hh = Math.abs(e.h) / 2;
  const r = Math.max(0, Math.min(e.radius, hw, hh));
  let local: Vec2[];
  if (r < 1e-9) {
    local = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
  } else {
    const corners: [number, number, number][] = [
      [hw - r, -hh + r, -Math.PI / 2],
      [hw - r, hh - r, 0],
      [-hw + r, hh - r, Math.PI / 2],
      [-hw + r, -hh + r, Math.PI],
    ];
    local = [];
    for (const [cx, cy, a0] of corners) {
      local.push(...arcPoints({ x: cx, y: cy }, r, a0, Math.PI / 2, tol));
    }
  }
  return local.map((p) => rotatePt(add(e.c, p), e.c, e.angle));
}

/** Centripetal Catmull-Rom through the control points. */
function splinePoints(pts: Vec2[], closed: boolean, tol: number): Vec2[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  if (n === 2 && !closed) return pts.slice();
  const get = (i: number): Vec2 => {
    if (closed) return pts[((i % n) + n) % n];
    if (i < 0) return sub(pts[0], sub(pts[1], pts[0]));
    if (i >= n) return add(pts[n - 1], sub(pts[n - 1], pts[n - 2]));
    return pts[i];
  };
  const out: Vec2[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const segLen = dist(p1, p2);
    const steps = Math.max(4, Math.min(200, Math.ceil(segLen / Math.max(tol * 10, 0.05))));
    const alpha = 0.5;
    const t0 = 0;
    const t1 = t0 + Math.pow(Math.max(dist(p0, p1), 1e-9), alpha);
    const t2 = t1 + Math.pow(Math.max(dist(p1, p2), 1e-9), alpha);
    const t3 = t2 + Math.pow(Math.max(dist(p2, p3), 1e-9), alpha);
    for (let s = 0; s < steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const A1 = lerpT(p0, p1, t0, t1, t);
      const A2 = lerpT(p1, p2, t1, t2, t);
      const A3 = lerpT(p2, p3, t2, t3, t);
      const B1 = lerpT(A1, A2, t0, t2, t);
      const B2 = lerpT(A2, A3, t1, t3, t);
      out.push(lerpT(B1, B2, t1, t2, t));
    }
  }
  if (!closed) out.push({ ...pts[n - 1] });
  // ensure exact control points at segment starts
  return out;
}

function lerpT(a: Vec2, b: Vec2, ta: number, tb: number, t: number): Vec2 {
  const d = tb - ta;
  if (Math.abs(d) < 1e-12) return { ...a };
  const wa = (tb - t) / d;
  const wb = (t - ta) / d;
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb };
}

/** Tessellate an entity into a polyline with chord error ≤ tol. */
export function sample(e: Entity, tol: number): SampledPath {
  switch (e.type) {
    case 'line':
      return { pts: [{ ...e.a }, { ...e.b }], closed: false };
    case 'polyline':
      return { pts: e.pts.map((p) => ({ ...p })), closed: e.closed };
    case 'spline':
      return { pts: splinePoints(e.pts, e.closed, tol), closed: e.closed };
    case 'arc': {
      const pts = arcPoints(e.c, e.r, e.a0, e.sweep, tol);
      pts[0] = arcStart(e);
      pts[pts.length - 1] = arcEnd(e);
      return { pts, closed: false };
    }
    case 'circle':
      return { pts: arcPoints(e.c, e.r, 0, Math.PI * 2, tol, false), closed: true };
    case 'rect':
      return { pts: rectOutline(e, tol), closed: true };
  }
}

export function entityStartEnd(e: Entity): [Vec2, Vec2] | null {
  switch (e.type) {
    case 'line':
      return [e.a, e.b];
    case 'polyline':
    case 'spline':
      return e.closed || e.pts.length < 2 ? null : [e.pts[0], e.pts[e.pts.length - 1]];
    case 'arc':
      return [arcStart(e), arcEnd(e)];
    default:
      return null;
  }
}

export function hitDistance(e: Entity, p: Vec2, tol: number): number {
  const s = sample(e, tol);
  let best = Infinity;
  const n = s.pts.length;
  const segs = s.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    best = Math.min(best, distToSegment(p, s.pts[i], s.pts[(i + 1) % n]));
  }
  if (n === 1) best = dist(p, s.pts[0]);
  return best;
}

export function bounds(pts: Vec2[]): { min: Vec2; max: Vec2 } | null {
  if (pts.length === 0) return null;
  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };
  for (const p of pts) {
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
  }
  return { min, max };
}

export function entityBounds(e: Entity, tol = 0.1) {
  return bounds(sample(e, tol).pts);
}

export type SnapKind = 'end' | 'mid' | 'center' | 'quadrant' | 'grid' | 'vertex';
export interface SnapPoint {
  p: Vec2;
  kind: SnapKind;
}

export function snapPoints(e: Entity): SnapPoint[] {
  const out: SnapPoint[] = [];
  switch (e.type) {
    case 'line':
      out.push({ p: e.a, kind: 'end' }, { p: e.b, kind: 'end' }, { p: mid(e.a, e.b), kind: 'mid' });
      break;
    case 'polyline': {
      e.pts.forEach((p) => out.push({ p, kind: 'vertex' }));
      const n = e.pts.length;
      const segs = e.closed ? n : n - 1;
      for (let i = 0; i < segs; i++) out.push({ p: mid(e.pts[i], e.pts[(i + 1) % n]), kind: 'mid' });
      break;
    }
    case 'spline':
      e.pts.forEach((p) => out.push({ p, kind: 'vertex' }));
      break;
    case 'arc':
      out.push(
        { p: arcStart(e), kind: 'end' },
        { p: arcEnd(e), kind: 'end' },
        { p: arcMid(e), kind: 'mid' },
        { p: e.c, kind: 'center' },
      );
      break;
    case 'circle':
      out.push({ p: e.c, kind: 'center' });
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        out.push({ p: { x: e.c.x + e.r * Math.cos(a), y: e.c.y + e.r * Math.sin(a) }, kind: 'quadrant' });
      }
      break;
    case 'rect': {
      out.push({ p: e.c, kind: 'center' });
      const cs = rectCorners(e);
      if (e.radius <= 1e-9) cs.forEach((p) => out.push({ p, kind: 'end' }));
      for (let i = 0; i < 4; i++) out.push({ p: mid(cs[i], cs[(i + 1) % 4]), kind: 'mid' });
      break;
    }
  }
  return out;
}

/** Editable handles (in world mm) for a single entity. */
export function handles(e: Entity): Vec2[] {
  switch (e.type) {
    case 'line':
      return [e.a, e.b];
    case 'polyline':
    case 'spline':
      return e.pts;
    case 'arc':
      return [arcStart(e), arcMid(e), arcEnd(e)];
    case 'circle':
      return [e.c, { x: e.c.x + e.r, y: e.c.y }];
    case 'rect':
      return [e.c, ...rectCorners(e)];
  }
}

/** Move handle i of e to p (mutates). */
export function setHandle(e: Entity, i: number, p: Vec2): void {
  switch (e.type) {
    case 'line':
      if (i === 0) e.a = { ...p };
      else e.b = { ...p };
      return;
    case 'polyline':
    case 'spline':
      e.pts[i] = { ...p };
      return;
    case 'arc': {
      const h = handles(e);
      h[i] = p;
      const a = arcFrom3(h[0], h[1], h[2]);
      if (a) Object.assign(e, a);
      return;
    }
    case 'circle':
      if (i === 0) e.c = { ...p };
      else e.r = Math.max(1e-3, dist(e.c, p));
      return;
    case 'rect': {
      if (i === 0) {
        e.c = { ...p };
        return;
      }
      const cs = rectCorners(e);
      const opp = cs[(i - 1 + 2) % 4];
      const lp = rotatePt(p, opp, -e.angle);
      const w = Math.abs(lp.x - opp.x);
      const h = Math.abs(lp.y - opp.y);
      if (w < 1e-3 || h < 1e-3) return;
      const cLocal = { x: (lp.x + opp.x) / 2, y: (lp.y + opp.y) / 2 };
      e.c = rotatePt(cLocal, opp, e.angle);
      e.w = w;
      e.h = h;
      return;
    }
  }
}

function mapPoints(e: Entity, f: (p: Vec2) => Vec2): void {
  switch (e.type) {
    case 'line':
      e.a = f(e.a);
      e.b = f(e.b);
      break;
    case 'polyline':
    case 'spline':
      e.pts = e.pts.map(f);
      break;
    case 'arc':
    case 'circle':
    case 'rect':
      e.c = f(e.c);
      break;
  }
}

export function translateEntity(e: Entity, d: Vec2): void {
  mapPoints(e, (p) => add(p, d));
}

export function rotateEntity(e: Entity, c: Vec2, ang: number): void {
  mapPoints(e, (p) => rotatePt(p, c, ang));
  if (e.type === 'arc') e.a0 = normAngle(e.a0 + ang);
  if (e.type === 'rect') e.angle = e.angle + ang;
}

export function mirrorEntity(e: Entity, a: Vec2, b: Vec2): void {
  mapPoints(e, (p) => mirrorPt(p, a, b));
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  if (e.type === 'arc') e.a0 = normAngle(2 * th - (e.a0 + e.sweep));
  if (e.type === 'rect') e.angle = 2 * th - e.angle;
}

export function cloneEntity<T extends Entity>(e: T, newId: string): T {
  const c = JSON.parse(JSON.stringify(e)) as T;
  c.id = newId;
  return c;
}
