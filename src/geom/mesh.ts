import earcut from 'earcut';
import type { JointParams, Part } from '../model';
import { buildLoops, ccw, classifyLoops, type Region } from './loops';
import { segmentsForArc, signedArea, type Vec2 } from './vec';

/** Flat triangle soup: 9 floats per triangle (x,y,z ×3). */
export class MeshBuilder {
  data: number[] = [];

  tri(a: number[], b: number[], c: number[]): void {
    this.data.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }

  append(o: MeshBuilder): void {
    for (let i = 0; i < o.data.length; i++) this.data.push(o.data[i]);
  }

  get triangleCount(): number {
    return this.data.length / 9;
  }

  signedVolume(): number {
    const d = this.data;
    let v = 0;
    for (let i = 0; i < d.length; i += 9) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = d.slice(i, i + 9);
      v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    }
    return v / 6;
  }

  flip(): void {
    const d = this.data;
    for (let i = 0; i < d.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = d[i + 3 + k];
        d[i + 3 + k] = d[i + 6 + k];
        d[i + 6 + k] = t;
      }
    }
  }

  toFloat32(): Float32Array {
    return new Float32Array(this.data);
  }
}

/** Extrude regions (CCW outer, CW holes) from z0 to z1 into a closed solid. */
export function extrudeRegions(regions: Region[], z0: number, z1: number, mb: MeshBuilder): void {
  for (const r of regions) {
    const rings = [r.outer, ...r.holes];
    const flat: number[] = [];
    const holeIdx: number[] = [];
    const all: Vec2[] = [];
    for (let k = 0; k < rings.length; k++) {
      if (k > 0) holeIdx.push(all.length);
      for (const p of rings[k]) {
        flat.push(p.x, p.y);
        all.push(p);
      }
    }
    const idx = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
    for (let i = 0; i < idx.length; i += 3) {
      let a = all[idx[i]];
      let b = all[idx[i + 1]];
      const c = all[idx[i + 2]];
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) [a, b] = [b, a];
      mb.tri([a.x, a.y, z1], [b.x, b.y, z1], [c.x, c.y, z1]);
      mb.tri([a.x, a.y, z0], [c.x, c.y, z0], [b.x, b.y, z0]);
    }
    // walls: material is on the left of every ring as oriented
    for (const ring of rings) {
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const p = ring[i];
        const q = ring[(i + 1) % n];
        mb.tri([p.x, p.y, z0], [q.x, q.y, z0], [q.x, q.y, z1]);
        mb.tri([p.x, p.y, z0], [q.x, q.y, z1], [p.x, p.y, z1]);
      }
    }
  }
}

/**
 * Sweep a closed cross-section along a closed planar path.
 * Section coordinates: x = offset along the outward path normal, y = height (z).
 */
export function sweepLoop(path: Vec2[], section: Vec2[], mb: MeshBuilder): void {
  const P = ccw(path);
  const n = P.length;
  const m = section.length;
  if (n < 3 || m < 3) return;
  // outward normal of each segment (CCW path → outward is to the right)
  const segN: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    segN.push({ x: dy / l, y: -dx / l });
  }
  const rings: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const n0 = segN[(i - 1 + n) % n];
    const n1 = segN[i];
    let mx = n0.x + n1.x;
    let my = n0.y + n1.y;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) {
      mx = n1.x;
      my = n1.y;
    } else {
      mx /= ml;
      my /= ml;
    }
    const k = 1 / Math.max(mx * n1.x + my * n1.y, 0.3);
    rings.push(section.map((s) => [P[i].x + mx * s.x * k, P[i].y + my * s.x * k, s.y]));
  }
  const local = new MeshBuilder();
  for (let i = 0; i < n; i++) {
    const A = rings[i];
    const B = rings[(i + 1) % n];
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m;
      local.tri(A[j], B[j], B[j1]);
      local.tri(A[j], B[j1], A[j1]);
    }
  }
  if (local.signedVolume() < 0) local.flip();
  mb.append(local);
}

export function circleSection(d: number, tol: number): Vec2[] {
  const r = d / 2;
  const n = Math.max(16, segmentsForArc(r, Math.PI * 2, tol));
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: r * Math.cos(a), y: r + r * Math.sin(a) });
  }
  return out;
}

export function rectSection(w: number, h: number): Vec2[] {
  return [
    { x: -w / 2, y: 0 },
    { x: w / 2, y: 0 },
    { x: w / 2, y: h },
    { x: -w / 2, y: h },
  ];
}

/** Half-round bead sitting on z = base, with a small embed below for a solid union in slicers. */
export function beadSection(w: number, h: number, base: number, tol: number): Vec2[] {
  const embed = Math.min(0.05, base / 2);
  const n = Math.max(8, Math.ceil(segmentsForArc(Math.max(w / 2, h), Math.PI, tol) / 1));
  const out: Vec2[] = [{ x: -w / 2, y: base - embed }, { x: w / 2, y: base - embed }];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    out.push({ x: (w / 2) * Math.cos(a), y: base + h * Math.sin(a) });
  }
  // remove duplicated end points at base corners
  return out.filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.y - arr[i - 1].y) > 1e-9);
}

export function alignSection(section: Vec2[], align: JointParams['align']): Vec2[] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of section) {
    min = Math.min(min, p.x);
    max = Math.max(max, p.x);
  }
  const shift = align === 'inside' ? -min : align === 'outside' ? -max : -(min + max) / 2;
  return section.map((p) => ({ x: p.x + shift, y: p.y }));
}

/** Ensure a custom section is a valid CCW polygon with y ≥ 0. */
export function normalizeSection(section: Vec2[]): Vec2[] {
  if (section.length < 3) return [];
  let s = section.map((p) => ({ ...p }));
  const minY = Math.min(...s.map((p) => p.y));
  s = s.map((p) => ({ x: p.x, y: p.y - minY }));
  if (signedArea(s) < 0) s.reverse();
  return s;
}

export interface BuildResult {
  mesh: Float32Array;
  triangles: number;
  size: { x: number; y: number; z: number } | null;
  loops: number;
  holes: number;
  openChains: Vec2[][];
  /** i18n keys for problems that prevent a useful mesh. */
  errors: string[];
}

export function washerRegions(j: JointParams, tol: number): Region[] {
  const mk = (r: number, rev: boolean): Vec2[] => {
    const n = Math.max(24, segmentsForArc(r, Math.PI * 2, tol));
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: j.washerC.x + r * Math.cos(a), y: j.washerC.y + r * Math.sin(a) });
    }
    return rev ? pts.reverse() : pts;
  };
  if (j.washerOd <= 0) return [];
  const holes = j.washerId > 0 && j.washerId < j.washerOd ? [mk(j.washerId / 2, true)] : [];
  return [{ outer: mk(j.washerOd / 2, false), holes }];
}

/** Build the printable mesh for one part. */
export function buildPart(part: Part, tol: number): BuildResult {
  const j = part.joint;
  const mb = new MeshBuilder();
  const errors: string[] = [];
  const { loops, open } = buildLoops(part.entities, tol, 'profile');
  let loopCount = loops.length;
  let holeCount = 0;

  switch (j.type) {
    case 'washer': {
      if (!(j.washerOd > j.washerId && j.washerT > 0)) errors.push('err.washer');
      else extrudeRegions(washerRegions(j, tol), 0, j.washerT, mb);
      loopCount = 2;
      holeCount = 1;
      break;
    }
    case 'flat':
    case 'bead': {
      if (!(j.thickness > 0)) {
        errors.push('err.thickness');
        break;
      }
      const regions = classifyLoops(loops);
      holeCount = regions.reduce((s, r) => s + r.holes.length, 0);
      if (regions.length === 0) errors.push('err.noClosed');
      extrudeRegions(regions, 0, j.thickness, mb);
      if (j.type === 'bead' && regions.length) {
        const sec = beadSection(j.beadW, j.beadH, j.thickness, tol);
        const beadPaths = buildLoops(part.entities, tol, 'bead').loops;
        for (const bp of beadPaths) sweepLoop(bp, sec, mb);
        if (j.beadAroundHoles) {
          // hole (CCW-normalized) swept with section shifted outward = into the material
          const shifted = sec.map((p) => ({ x: p.x + j.beadOffset, y: p.y }));
          for (const r of regions) for (const h of r.holes) sweepLoop(h, shifted, mb);
        }
        if (!beadPaths.length && !j.beadAroundHoles) errors.push('err.noBead');
      }
      break;
    }
    case 'oring':
    case 'square':
    case 'custom': {
      let sec: Vec2[];
      if (j.type === 'oring') sec = circleSection(j.cord, tol);
      else if (j.type === 'square') sec = rectSection(j.sqW, j.sqH);
      else sec = normalizeSection(j.section);
      if (sec.length < 3 || (j.type === 'oring' && !(j.cord > 0)) || (j.type === 'square' && !(j.sqW > 0 && j.sqH > 0))) {
        errors.push('err.section');
        break;
      }
      sec = alignSection(sec, j.align);
      if (loops.length === 0) errors.push('err.noClosed');
      for (const l of loops) sweepLoop(l, sec, mb);
      break;
    }
  }

  const mesh = mb.toFloat32();
  return {
    mesh,
    triangles: mb.triangleCount,
    size: meshSize(mesh),
    loops: loopCount,
    holes: holeCount,
    openChains: j.type === 'washer' ? [] : open,
    errors,
  };
}

export function meshSize(m: Float32Array): { x: number; y: number; z: number } | null {
  if (m.length === 0) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (m[i + k] < min[k]) min[k] = m[i + k];
      if (m[i + k] > max[k]) max[k] = m[i + k];
    }
  }
  return { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] };
}
