import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { missingKeys, setLang, t } from '../src/i18n';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|html)$/.test(p) ? [p] : [];
  });
}

(globalThis as any).document = { documentElement: {} };

describe('i18n', () => {
  it('both languages define the same keys', () => {
    expect(missingKeys()).toEqual({ en: [], fr: [] });
  });

  it('every key used in the source exists', () => {
    const src = [...files('src'), 'index.html'].map((f) => readFileSync(f, 'utf8')).join('\n');
    const keys = new Set<string>();
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
    for (const m of src.matchAll(/data-i18n(?:-title|-aria)?="([^"]+)"/g)) keys.add(m[1]);
    for (const m of src.matchAll(/errors\.push\('([^']+)'\)/g)) keys.add(m[1]);
    const dynamic = {
      jt: ['flat', 'oring', 'square', 'custom', 'bead', 'washer'].flatMap((x) => [`jt.${x}`, `jt.${x}.desc`]),
      tool: ['select', 'line', 'polyline', 'arc', 'circle', 'rect', 'rrect', 'spline', 'measure', 'calibrate', 'perspective', 'bgmove', 'mirror', 'rotate', 'cpattern', 'lpattern', 'fit'].map((x) => `tool.${x}`),
      role: ['profile', 'construction', 'bead'].map((x) => `role.${x}`),
      ent: ['line', 'polyline', 'spline', 'arc', 'circle', 'rect'].map((x) => `ent.${x}`),
      mat: ['tpu95', 'tpu85', 'tpe', 'petg'].map((x) => `mat.${x}`),
      sec: ['dring', 'lip', 'xring', 'halfround', 'trapezoid'].map((x) => `sec.${x}`),
    };
    Object.values(dynamic).flat().forEach((k) => keys.add(k));
    setLang('en');
    const missing = [...keys].filter((k) => t(k) === k);
    expect(missing).toEqual([]);
  });
});
