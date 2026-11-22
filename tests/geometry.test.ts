import { describe, expect, it } from 'vitest';
import { buildPart } from '../src/geom/mesh';
import { buildLoops, classifyLoops } from '../src/geom/loops';
import { arcFrom3, mirrorEntity, sample } from '../src/geom/entities';
import { parseBinarySTL, toBinarySTL } from '../src/geom/stl';
import { applyH, homography } from '../src/geom/homography';
import { newPart, type Entity, type JointType, type Part } from '../src/model';

/** Every directed edge must be matched by exactly one reversed edge → closed, consistently oriented. */
function checkWatertight(m: Float32Array) {
  const key = (i: number) => `${m[i].toFixed(4)},${m[i + 1].toFixed(4)},${m[i + 2].toFixed(4)}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < m.length; t += 9) {
    const v = [key(t), key(t + 3), key(t + 6)];
    for (let k = 0; k < 3; k++) {
      const e = `${v[k]}|${v[(k + 1) % 3]}`;
      edges.set(e, (edges.get(e) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const [e, n] of edges) {
    const [a, b] = e.split('|');
    if (n !== 1 || edges.get(`${b}|${a}`) !== 1) bad++;
  }
  return bad;
}

function volume(m: Float32Array) {
  let v = 0;
  for (let i = 0; i < m.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = m.slice(i, i + 9);
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

const circle = (x: number, y: number, r: number, id = 'c' + Math.random()): Entity => ({ id, role: 'profile', type: 'circle', c: { x, y }, r });

function part(type: JointType, entities: Entity[]): Part {
  const p = newPart('t');
  p.entities = entities;
  p.joint.type = type;
  return p;
}

describe('loops', () => {
  it('chains open lines into a closed loop in any direction', () => {
    const ents: Entity[] = [
      { id: '1', role: 'profile', type: 'line', a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { id: '2', role: 'profile', type: 'line', a: { x: 10, y: 10 }, b: { x: 10, y: 0 } },
      { id: '3', role: 'profile', type: 'line', a: { x: 10, y: 10 }, b: { x: 0, y: 10 } },
      { id: '4', role: 'profile', type: 'line', a: { x: 0, y: 0 }, b: { x: 0, y: 10 } },
    ];
    const r = buildLoops(ents, 0.05);
    expect(r.loops.length).toBe(1);
    expect(r.loops[0].length).toBe(4);
    expect(r.open.length).toBe(0);
  });

  it('reports open chains', () => {
    const r = buildLoops([{ id: '1', role: 'profile', type: 'line', a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }], 0.05);
    expect(r.open.length).toBe(1);
  });

  it('classifies outer, holes and islands', () => {
    const loops = buildLoops([circle(0, 0, 20), circle(0, 0, 10), circle(0, 0, 5), circle(15, 0, 2)], 0.05).loops;
    const regions = classifyLoops(loops);
    expect(regions.length).toBe(2);
    const big = regions.find((r) => r.holes.length === 2)!;
    expect(big).toBeTruthy();
  });

  it('ignores construction geometry', () => {
    const c = circle(0, 0, 5);
    c.role = 'construction';
    expect(buildLoops([c], 0.05).loops.length).toBe(0);
  });
});

describe('meshes are watertight', () => {
  const tol = 0.05;
  it('flat gasket with holes', () => {
    const p = part('flat', [
      { id: 'r', role: 'profile', type: 'rect', c: { x: 0, y: 0 }, w: 60, h: 40, angle: 0.3, radius: 5 },
      circle(0, 0, 12),
      circle(-22, 0, 2.5),
      circle(22, 0, 2.5),
    ]);
    p.joint.thickness = 1.2;
    const r = buildPart(p, tol);
    expect(r.errors).toEqual([]);
    expect(r.holes).toBe(3);
    expect(checkWatertight(r.mesh)).toBe(0);
    const expected = (60 * 40 - (4 - Math.PI) * 25 - Math.PI * (144 + 2 * 6.25)) * 1.2;
    expect(volume(r.mesh)).toBeGreaterThan(0);
    expect(Math.abs(volume(r.mesh) - expected) / expected).toBeLessThan(0.01);
  });

  it('o-ring along a circle has torus volume', () => {
    const p = part('oring', [circle(0, 0, 20)]);
    p.joint.cord = 3;
    const r = buildPart(p, 0.01);
    expect(checkWatertight(r.mesh)).toBe(0);
    const expected = 2 * Math.PI * 20 * Math.PI * 1.5 * 1.5;
    expect(Math.abs(volume(r.mesh) - expected) / expected).toBeLessThan(0.01);
    expect(r.size!.z).toBeCloseTo(3, 2);
  });

  it('square ring along a polyline path, aligned inside', () => {
    const p = part('square', [
      { id: 'p', role: 'profile', type: 'polyline', closed: true, pts: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 10, y: 25 }, { x: 0, y: 20 }] },
    ]);
    p.joint.align = 'inside';
    const r = buildPart(p, tol);
    expect(checkWatertight(r.mesh)).toBe(0);
    expect(volume(r.mesh)).toBeGreaterThan(0);
    expect(r.size!.x).toBeGreaterThan(30 + 3.9);
  });

  it('custom section along a spline', () => {
    const p = part('custom', [
      { id: 's', role: 'profile', type: 'spline', closed: true, pts: [{ x: 0, y: 0 }, { x: 30, y: -5 }, { x: 40, y: 20 }, { x: 5, y: 25 }] },
    ]);
    const r = buildPart(p, tol);
    expect(checkWatertight(r.mesh)).toBe(0);
    expect(volume(r.mesh)).toBeGreaterThan(0);
  });

  it('bead gasket produces closed components', () => {
    const p = part('bead', [circle(0, 0, 20), circle(0, 0, 8)]);
    const r = buildPart(p, tol);
    expect(r.errors).toEqual([]);
    expect(checkWatertight(r.mesh)).toBe(0);
    expect(r.size!.z).toBeCloseTo(p.joint.thickness + p.joint.beadH, 2);
  });

  it('washer', () => {
    const p = part('washer', []);
    const r = buildPart(p, tol);
    expect(checkWatertight(r.mesh)).toBe(0);
    expect(r.size!.x).toBeCloseTo(16, 1);
  });
});

describe('entities', () => {
  it('3-point arc passes through its points', () => {
    const a = arcFrom3({ x: 10, y: 0 }, { x: 0, y: 10 }, { x: -10, y: 0 })!;
    expect(a.r).toBeCloseTo(10);
    expect(a.sweep).toBeCloseTo(Math.PI);
    const b = arcFrom3({ x: 10, y: 0 }, { x: 0, y: -10 }, { x: -10, y: 0 })!;
    expect(b.sweep).toBeCloseTo(Math.PI);
    expect(Math.sin(b.a0 + b.sweep / 2)).toBeCloseTo(-1);
  });

  it('mirrored arc keeps its endpoints mirrored', () => {
    const arc = { id: 'a', role: 'profile' as const, type: 'arc' as const, ...arcFrom3({ x: 10, y: 0 }, { x: 7, y: 7 }, { x: 0, y: 10 })! };
    mirrorEntity(arc, { x: 0, y: 0 }, { x: 0, y: 1 });
    const pts = sample(arc, 0.05).pts;
    const xs = pts.map((p) => p.x);
    expect(Math.max(...xs)).toBeLessThan(1e-6);
  });
});

describe('io', () => {
  it('binary STL round-trip', () => {
    const r = buildPart(part('washer', []), 0.1);
    const back = parseBinarySTL(toBinarySTL(r.mesh));
    expect(back.length).toBe(r.mesh.length);
    expect(back[5]).toBeCloseTo(r.mesh[5], 4);
  });

  it('homography maps the four corners', () => {
    const src = [{ x: 10, y: 20 }, { x: 300, y: 40 }, { x: 280, y: 250 }, { x: 5, y: 200 }];
    const dst = [{ x: 0, y: 100 }, { x: 150, y: 100 }, { x: 150, y: 0 }, { x: 0, y: 0 }];
    const H = homography(src, dst)!;
    src.forEach((s, i) => {
      const p = applyH(H, s);
      expect(p.x).toBeCloseTo(dst[i].x, 6);
      expect(p.y).toBeCloseTo(dst[i].y, 6);
    });
  });
});
