import type { Entity, Role } from '../model';
import { sample } from './entities';
import { dist, pointInPolygon, signedArea, type Vec2 } from './vec';

/** Endpoints closer than this (mm) are considered connected. */
export const JOIN_TOL = 0.05;

export interface LoopResult {
  /** Closed loops, without a repeated closing point. */
  loops: Vec2[][];
  /** Chains that could not be closed. */
  open: Vec2[][];
}

/** Remove consecutive duplicates (and closing duplicate for closed loops). */
export function cleanLoop(pts: Vec2[], closed: boolean, eps = 1e-6): Vec2[] {
  const out: Vec2[] = [];
  for (const p of pts) {
    if (out.length === 0 || dist(out[out.length - 1], p) > eps) out.push(p);
  }
  if (closed) {
    while (out.length > 1 && dist(out[0], out[out.length - 1]) <= Math.max(eps, 1e-6)) out.pop();
  }
  return out;
}

/**
 * Turn the entities with the given role into closed loops by chaining open
 * entities end-to-end (in either direction).
 */
export function buildLoops(entities: Entity[], tol: number, role: Role = 'profile'): LoopResult {
  const loops: Vec2[][] = [];
  const chains: Vec2[][] = [];
  for (const e of entities) {
    if (e.role !== role) continue;
    const s = sample(e, tol);
    if (s.pts.length < 2) continue;
    if (s.closed) {
      const l = cleanLoop(s.pts, true);
      if (l.length >= 3) loops.push(l);
    } else if (dist(s.pts[0], s.pts[s.pts.length - 1]) <= JOIN_TOL && s.pts.length > 2) {
      const l = cleanLoop(s.pts, true, JOIN_TOL);
      if (l.length >= 3) loops.push(l);
    } else {
      chains.push(s.pts);
    }
  }

  const used = new Array(chains.length).fill(false);
  const open: Vec2[][] = [];
  for (let i = 0; i < chains.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let cur = chains[i].slice();
    let closed = false;
    // extend forward, then backward
    for (let pass = 0; pass < 2 && !closed; pass++) {
      let extended = true;
      while (extended && !closed) {
        extended = false;
        const end = cur[cur.length - 1];
        if (cur.length > 2 && dist(end, cur[0]) <= JOIN_TOL) {
          closed = true;
          break;
        }
        let best = -1;
        let bestRev = false;
        let bestD = JOIN_TOL;
        for (let j = 0; j < chains.length; j++) {
          if (used[j]) continue;
          const c = chains[j];
          const d0 = dist(end, c[0]);
          const d1 = dist(end, c[c.length - 1]);
          if (d0 <= bestD) {
            best = j;
            bestRev = false;
            bestD = d0;
          }
          if (d1 <= bestD) {
            best = j;
            bestRev = true;
            bestD = d1;
          }
        }
        if (best >= 0) {
          used[best] = true;
          const add = bestRev ? chains[best].slice().reverse() : chains[best];
          cur = cur.concat(add.slice(1));
          extended = true;
        }
      }
      if (!closed) cur.reverse();
    }
    if (closed) {
      const l = cleanLoop(cur, true, 1e-6);
      if (l.length >= 3) loops.push(l);
    } else {
      open.push(cur);
    }
  }
  return { loops, open };
}

export interface Region {
  /** Counter-clockwise outer boundary. */
  outer: Vec2[];
  /** Clockwise holes. */
  holes: Vec2[][];
}

/**
 * Classify loops by nesting depth: even depth = material boundary,
 * odd depth = hole. Islands inside holes become new regions.
 */
export function classifyLoops(loops: Vec2[][]): Region[] {
  const info = loops
    .map((pts) => ({ pts, area: Math.abs(signedArea(pts)) }))
    .filter((l) => l.area > 1e-9);
  const n = info.length;
  const parent = new Array<number>(n).fill(-1);
  const depth = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let bestArea = Infinity;
    const probe = info[i].pts;
    for (let j = 0; j < n; j++) {
      if (i === j || info[j].area <= info[i].area) continue;
      if (contains(info[j].pts, probe)) {
        depth[i]++;
        if (info[j].area < bestArea) {
          bestArea = info[j].area;
          parent[i] = j;
        }
      }
    }
  }
  const regions = new Map<number, Region>();
  for (let i = 0; i < n; i++) {
    if (depth[i] % 2 === 0) {
      const pts = info[i].pts.slice();
      if (signedArea(pts) < 0) pts.reverse();
      regions.set(i, { outer: pts, holes: [] });
    }
  }
  for (let i = 0; i < n; i++) {
    if (depth[i] % 2 === 1 && parent[i] >= 0) {
      const r = regions.get(parent[i]);
      if (!r) continue;
      const pts = info[i].pts.slice();
      if (signedArea(pts) > 0) pts.reverse();
      r.holes.push(pts);
    }
  }
  return [...regions.values()];
}

/** True if most sample points of `inner` lie inside `outer` (robust to touching edges). */
function contains(outer: Vec2[], inner: Vec2[]): boolean {
  const step = Math.max(1, Math.floor(inner.length / 7));
  let inside = 0;
  let total = 0;
  for (let k = 0; k < inner.length; k += step) {
    total++;
    if (pointInPolygon(inner[k], outer)) inside++;
  }
  return inside * 2 > total;
}

/** Make a loop counter-clockwise (copy). */
export function ccw(pts: Vec2[]): Vec2[] {
  const c = pts.slice();
  if (signedArea(c) < 0) c.reverse();
  return c;
}
