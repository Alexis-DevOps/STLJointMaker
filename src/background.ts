import type { Background } from './model';
import { applyH, homography, invert3 } from './geom/homography';
import type { Vec2 } from './geom/vec';

const MAX_DIM = 4096;
const cache = new Map<string, HTMLImageElement>();
let onLoad: () => void = () => {};

export function setImageLoadedCallback(fn: () => void): void {
  onLoad = fn;
}

/** Cached image element for a data URL (null until decoded). */
export function imageFor(dataUrl: string): HTMLImageElement | null {
  let img = cache.get(dataUrl);
  if (!img) {
    img = new Image();
    img.onload = () => onLoad();
    img.src = dataUrl;
    cache.set(dataUrl, img);
    if (cache.size > 4) cache.delete(cache.keys().next().value!);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode image'));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Load a PNG/JPG, downscaling very large photos to keep projects light. */
export async function loadImageFile(file: File, center: Vec2): Promise<Background> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error('unsupported');
  let dataUrl = await readAsDataUrl(file);
  let img = await decode(dataUrl);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > MAX_DIM) {
    const k = MAX_DIM / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    dataUrl = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
    img = await decode(dataUrl);
  }
  return {
    dataUrl,
    pxW: w,
    pxH: h,
    cx: center.x,
    cy: center.y,
    mmPerPx: 150 / Math.max(w, h), // arbitrary until calibrated: ~150 mm across
    rotation: 0,
    opacity: 0.6,
    locked: false,
    visible: true,
    calibrated: false,
  };
}

/** World mm → image pixel (top-left origin, y down). */
export function worldToImage(bg: Background, p: Vec2): Vec2 {
  const r = (-bg.rotation * Math.PI) / 180;
  const dx = p.x - bg.cx;
  const dy = p.y - bg.cy;
  const rx = dx * Math.cos(r) - dy * Math.sin(r);
  const ry = dx * Math.sin(r) + dy * Math.cos(r);
  return { x: rx / bg.mmPerPx + bg.pxW / 2, y: -ry / bg.mmPerPx + bg.pxH / 2 };
}

/** Scale the background around a fixed world point so a measured distance becomes `realMm`. */
export function calibrate(bg: Background, a: Vec2, b: Vec2, realMm: number): Background {
  const measured = Math.hypot(b.x - a.x, b.y - a.y);
  if (measured < 1e-9 || !(realMm > 0)) return bg;
  const k = realMm / measured;
  return {
    ...bg,
    mmPerPx: bg.mmPerPx * k,
    cx: a.x + (bg.cx - a.x) * k,
    cy: a.y + (bg.cy - a.y) * k,
    calibrated: true,
  };
}

/**
 * Perspective-correct the background. `corners` are world points clicked on the
 * image in order: top-left, top-right, bottom-right, bottom-left of a real
 * rectangle measuring wMm × hMm. The result is a new, flat, calibrated image
 * whose top-left reference corner stays where it was clicked.
 */
export async function rectify(bg: Background, corners: Vec2[], wMm: number, hMm: number): Promise<Background> {
  const img = await decode(bg.dataUrl);
  const src = corners.map((c) => worldToImage(bg, c));
  const dst = [
    { x: 0, y: hMm },
    { x: wMm, y: hMm },
    { x: wMm, y: 0 },
    { x: 0, y: 0 },
  ];
  const H = homography(src, dst);
  const Hi = H && invert3(H);
  if (!H || !Hi) throw new Error('degenerate');

  // Extent of the whole photo in rectified space, limited to avoid horizon blow-up.
  const imgCorners = [
    { x: 0, y: 0 },
    { x: bg.pxW, y: 0 },
    { x: bg.pxW, y: bg.pxH },
    { x: 0, y: bg.pxH },
  ];
  const limit = 3 * Math.max(wMm, hMm);
  let minX = 0, minY = 0, maxX = wMm, maxY = hMm;
  for (const c of imgCorners) {
    const w = H[6] * c.x + H[7] * c.y + H[8];
    if (w <= 0) continue;
    const p = applyH(H, c);
    minX = Math.max(-limit, Math.min(minX, p.x));
    minY = Math.max(-limit, Math.min(minY, p.y));
    maxX = Math.min(wMm + limit, Math.max(maxX, p.x));
    maxY = Math.min(hMm + limit, Math.max(maxY, p.y));
  }
  // Keep native-ish resolution: px per mm from the reference rectangle in the source.
  const srcW = Math.hypot(src[1].x - src[0].x, src[1].y - src[0].y);
  let ppm = Math.max(2, srcW / wMm);
  const maxPx = 4096;
  ppm = Math.min(ppm, maxPx / (maxX - minX), maxPx / (maxY - minY));
  const outW = Math.max(1, Math.round((maxX - minX) * ppm));
  const outH = Math.max(1, Math.round((maxY - minY) * ppm));

  const sc = document.createElement('canvas');
  sc.width = bg.pxW;
  sc.height = bg.pxH;
  const sctx = sc.getContext('2d')!;
  sctx.drawImage(img, 0, 0, bg.pxW, bg.pxH);
  const sd = sctx.getImageData(0, 0, bg.pxW, bg.pxH).data;
  const oc = document.createElement('canvas');
  oc.width = outW;
  oc.height = outH;
  const octx = oc.getContext('2d')!;
  const out = octx.createImageData(outW, outH);
  const od = out.data;
  const sw = bg.pxW;
  const sh = bg.pxH;
  for (let y = 0; y < outH; y++) {
    const my = maxY - (y + 0.5) / ppm;
    for (let x = 0; x < outW; x++) {
      const mx = minX + (x + 0.5) / ppm;
      const w = Hi[6] * mx + Hi[7] * my + Hi[8];
      const sx = (Hi[0] * mx + Hi[1] * my + Hi[2]) / w - 0.5;
      const sy = (Hi[3] * mx + Hi[4] * my + Hi[5]) / w - 0.5;
      const o = (y * outW + x) * 4;
      if (w <= 0 || sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        od[o] = od[o + 1] = od[o + 2] = 128;
        od[o + 3] = 255;
        continue;
      }
      const x0 = sx | 0;
      const y0 = sy | 0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      for (let k = 0; k < 3; k++) {
        const top = sd[i00 + k] * (1 - fx) + sd[i10 + k] * fx;
        const bot = sd[i01 + k] * (1 - fx) + sd[i11 + k] * fx;
        od[o + k] = top * (1 - fy) + bot * fy;
      }
      od[o + 3] = 255;
    }
  }
  octx.putImageData(out, 0, 0);
  const dataUrl = oc.toDataURL('image/jpeg', 0.9);
  // Place so that rectified (0, hMm) — the top-left reference corner — lands on corners[0].
  const mmPerPx = 1 / ppm;
  const centerRect = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  return {
    ...bg,
    dataUrl,
    pxW: outW,
    pxH: outH,
    mmPerPx,
    rotation: 0,
    cx: corners[0].x + (centerRect.x - 0),
    cy: corners[0].y + (centerRect.y - hMm),
    calibrated: true,
  };
}
