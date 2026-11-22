import type { Vec2 } from './vec';

export interface Outline {
  loops: Vec2[][];
  open: Vec2[][];
}

function bbox(o: Outline) {
  const all = [...o.loops, ...o.open].flat();
  if (!all.length) return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  return {
    minX: Math.min(...all.map((p) => p.x)),
    minY: Math.min(...all.map((p) => p.y)),
    maxX: Math.max(...all.map((p) => p.x)),
    maxY: Math.max(...all.map((p) => p.y)),
  };
}

const f = (n: number) => Number(n.toFixed(4)).toString();

/** SVG in real millimetres (prints/cuts at 1:1). */
export function toSVG(o: Outline, title: string): string {
  const b = bbox(o);
  const m = 2;
  const w = b.maxX - b.minX + 2 * m;
  const h = b.maxY - b.minY + 2 * m;
  const tx = (p: Vec2) => `${f(p.x - b.minX + m)},${f(b.maxY - p.y + m)}`;
  const closedD = o.loops.map((l) => 'M' + l.map(tx).join(' L') + ' Z').join(' ');
  const openPaths = o.open
    .map((l) => `  <path d="M${l.map(tx).join(' L')}" fill="none" stroke="#000" stroke-width="0.1"/>`)
    .join('\n');
  const esc = title.replace(/[<>&"]/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="0 0 ${f(w)} ${f(h)}">
  <title>${esc}</title>
  <path d="${closedD}" fill="none" stroke="#000" stroke-width="0.1" fill-rule="evenodd"/>
${openPaths}
</svg>
`;
}

/** Minimal AutoCAD R12 DXF (mm), one POLYLINE per contour. */
export function toDXF(o: Outline): string {
  const L: string[] = [];
  const g = (code: number, val: string | number) => L.push(String(code), String(val));
  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1009');
  g(9, '$INSUNITS'); g(70, 4);
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  const poly = (pts: Vec2[], closed: boolean) => {
    g(0, 'POLYLINE'); g(8, 'JOINT'); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, closed ? 1 : 0);
    for (const p of pts) {
      g(0, 'VERTEX'); g(8, 'JOINT'); g(10, f(p.x)); g(20, f(p.y)); g(30, 0);
    }
    g(0, 'SEQEND'); g(8, 'JOINT');
  };
  o.loops.forEach((l) => poly(l, true));
  o.open.forEach((l) => poly(l, false));
  g(0, 'ENDSEC');
  g(0, 'EOF');
  return L.join('\n') + '\n';
}
