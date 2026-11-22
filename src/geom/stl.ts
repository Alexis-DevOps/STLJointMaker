/** Binary STL (the format Cura, PrusaSlicer, Bambu Studio… expect). Units: mm. */
export function toBinarySTL(tris: Float32Array, header = 'STL Joint Maker'): ArrayBuffer {
  const count = tris.length / 9;
  const buf = new ArrayBuffer(84 + count * 50);
  const dv = new DataView(buf);
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) & 0x7f : 0x20);
  dv.setUint32(80, count, true);
  let o = 84;
  for (let t = 0; t < count; t++) {
    const i = t * 9;
    const ax = tris[i], ay = tris[i + 1], az = tris[i + 2];
    const bx = tris[i + 3], by = tris[i + 4], bz = tris[i + 5];
    const cx = tris[i + 6], cy = tris[i + 7], cz = tris[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const vals = [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz];
    for (const val of vals) {
      dv.setFloat32(o, val, true);
      o += 4;
    }
    dv.setUint16(o, 0, true);
    o += 2;
  }
  return buf;
}

/** Parse a binary STL back into a triangle soup (used by tests). */
export function parseBinarySTL(buf: ArrayBuffer): Float32Array {
  const dv = new DataView(buf);
  const count = dv.getUint32(80, true);
  const out = new Float32Array(count * 9);
  let o = 84;
  for (let t = 0; t < count; t++) {
    o += 12;
    for (let k = 0; k < 9; k++) {
      out[t * 9 + k] = dv.getFloat32(o, true);
      o += 4;
    }
    o += 2;
  }
  return out;
}
