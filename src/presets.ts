import type { MaterialId } from './model';

export interface ORingPreset {
  name: string;
  /** Inner diameter, mm */
  id: number;
  /** Cross-section (cord) diameter, mm */
  cs: number;
}

const IN = 25.4;
const as568 = (dash: string, idIn: number, csIn: number): ORingPreset => ({
  name: `AS568-${dash}`,
  id: Math.round(idIn * IN * 100) / 100,
  cs: Math.round(csIn * IN * 100) / 100,
});

const S0 = 0.07, S1 = 0.103, S2 = 0.139, S3 = 0.21;

export const AS568: ORingPreset[] = [
  ...([
    ['004', 0.07], ['005', 0.101], ['006', 0.114], ['007', 0.145], ['008', 0.176], ['009', 0.208],
    ['010', 0.239], ['011', 0.301], ['012', 0.364], ['013', 0.426], ['014', 0.489], ['015', 0.551],
    ['016', 0.614], ['017', 0.676], ['018', 0.739], ['019', 0.801], ['020', 0.864], ['021', 0.926],
    ['022', 0.989], ['023', 1.051], ['024', 1.114], ['025', 1.176], ['026', 1.239], ['027', 1.301], ['028', 1.364],
  ] as [string, number][]).map(([d, i]) => as568(d, i, S0)),
  ...([
    ['110', 0.362], ['111', 0.424], ['112', 0.487], ['113', 0.549], ['114', 0.612], ['115', 0.674],
    ['116', 0.737], ['117', 0.799], ['118', 0.862], ['119', 0.924], ['120', 0.987], ['121', 1.049],
    ['122', 1.112], ['123', 1.174], ['124', 1.237], ['125', 1.299], ['126', 1.362], ['127', 1.424],
    ['128', 1.487], ['129', 1.549], ['130', 1.612], ['131', 1.674], ['132', 1.737], ['133', 1.799],
  ] as [string, number][]).map(([d, i]) => as568(d, i, S1)),
  ...([
    ['210', 0.734], ['211', 0.796], ['212', 0.859], ['213', 0.921], ['214', 0.984], ['215', 1.046],
    ['216', 1.109], ['217', 1.171], ['218', 1.234], ['219', 1.296], ['220', 1.359], ['221', 1.421],
    ['222', 1.484], ['223', 1.609], ['224', 1.734], ['225', 1.859], ['226', 1.984], ['227', 2.109], ['228', 2.234],
  ] as [string, number][]).map(([d, i]) => as568(d, i, S2)),
  ...([
    ['325', 1.475], ['326', 1.6], ['327', 1.725], ['328', 1.85], ['329', 1.975], ['330', 2.1],
  ] as [string, number][]).map(([d, i]) => as568(d, i, S3)),
];

export const METRIC: ORingPreset[] = (
  [
    [3, 1], [4, 1], [5, 1], [6, 1], [5, 1.5], [6, 1.5], [8, 1.5], [10, 1.5], [12, 1.5],
    [6, 2], [8, 2], [10, 2], [12, 2], [14, 2], [15, 2], [16, 2], [18, 2], [20, 2], [22, 2], [25, 2],
    [20, 2.5], [22, 2.5], [25, 2.5], [28, 2.5], [30, 2.5],
    [25, 3], [28, 3], [30, 3], [32, 3], [35, 3], [38, 3], [40, 3], [45, 3], [50, 3], [55, 3], [60, 3],
    [40, 4], [50, 4], [60, 4], [70, 4], [80, 4],
  ] as [number, number][]
).map(([id, cs]) => ({ name: `${id} × ${cs}`, id, cs }));

export interface MaterialInfo {
  id: MaterialId;
  /** Minimum recommended flat thickness, mm. */
  minThickness: number;
  /** Minimum recommended cord / section size, mm. */
  minSection: number;
  flexible: boolean;
  color: number;
}

export const MATERIALS: MaterialInfo[] = [
  { id: 'tpu95', minThickness: 0.6, minSection: 1.5, flexible: true, color: 0x2f9e8f },
  { id: 'tpu85', minThickness: 0.8, minSection: 2.0, flexible: true, color: 0x3b82c4 },
  { id: 'tpe', minThickness: 1.0, minSection: 2.0, flexible: true, color: 0x8a63d2 },
  { id: 'petg', minThickness: 0.4, minSection: 1.0, flexible: false, color: 0xd08a2c },
];

export const material = (id: MaterialId) => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
