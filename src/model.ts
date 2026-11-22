import type { Vec2 } from './geom/vec';

/** How an entity participates in the joint geometry. */
export type Role = 'profile' | 'construction' | 'bead';

interface EntityBase {
  id: string;
  role: Role;
}

export interface LineEntity extends EntityBase {
  type: 'line';
  a: Vec2;
  b: Vec2;
}
export interface PolylineEntity extends EntityBase {
  type: 'polyline';
  pts: Vec2[];
  closed: boolean;
}
export interface SplineEntity extends EntityBase {
  type: 'spline';
  pts: Vec2[];
  closed: boolean;
}
/** Arc: counter-clockwise from a0 over `sweep` radians. */
export interface ArcEntity extends EntityBase {
  type: 'arc';
  c: Vec2;
  r: number;
  a0: number;
  sweep: number;
}
export interface CircleEntity extends EntityBase {
  type: 'circle';
  c: Vec2;
  r: number;
}
/** Rectangle centered at c, rotated by `angle` radians, optional corner radius. */
export interface RectEntity extends EntityBase {
  type: 'rect';
  c: Vec2;
  w: number;
  h: number;
  angle: number;
  radius: number;
}

export type Entity =
  | LineEntity
  | PolylineEntity
  | SplineEntity
  | ArcEntity
  | CircleEntity
  | RectEntity;

export type JointType = 'flat' | 'oring' | 'square' | 'custom' | 'bead' | 'washer';
export type Align = 'center' | 'inside' | 'outside';

export interface JointParams {
  type: JointType;
  /** Flat / bead gasket thickness (mm). */
  thickness: number;
  /** O-ring cord diameter (mm). */
  cord: number;
  /** Square section width/height (mm). */
  sqW: number;
  sqH: number;
  /** Where the drawn path sits relative to the swept section. */
  align: Align;
  /** Custom cross-section, (u = across path, outward; y = height) in mm. */
  section: Vec2[];
  /** Bead (raised ridge) on top of a flat gasket. */
  beadW: number;
  beadH: number;
  beadAroundHoles: boolean;
  beadOffset: number;
  /** Washer shortcut. */
  washerId: number;
  washerOd: number;
  washerT: number;
  washerC: Vec2;
}

export interface Part {
  id: string;
  name: string;
  entities: Entity[];
  joint: JointParams;
}

export interface Background {
  dataUrl: string;
  /** Natural pixel size. */
  pxW: number;
  pxH: number;
  /** World position (mm) of the image center. */
  cx: number;
  cy: number;
  mmPerPx: number;
  /** Rotation in degrees (CCW). */
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  calibrated: boolean;
}

export type MaterialId = 'tpu95' | 'tpu85' | 'tpe' | 'petg';

export interface Project {
  format: 'stl-joint-maker';
  version: 1;
  id: string;
  name: string;
  parts: Part[];
  activePartId: string;
  background: Background | null;
  material: MaterialId;
  /** Chord tolerance used to tessellate curves (mm). */
  tolerance: number;
  updatedAt: number;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_SECTION: Vec2[] = [
  // D-ring: flat bottom, rounded top
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.8 },
  { x: 0.7, y: 1.5 },
  { x: 0, y: 1.8 },
  { x: -0.7, y: 1.5 },
  { x: -1, y: 0.8 },
];

export function defaultJoint(): JointParams {
  return {
    type: 'flat',
    thickness: 1.0,
    cord: 2.0,
    sqW: 2.0,
    sqH: 2.0,
    align: 'center',
    section: DEFAULT_SECTION.map((p) => ({ ...p })),
    beadW: 1.2,
    beadH: 0.5,
    beadAroundHoles: true,
    beadOffset: 1.5,
    washerId: 10,
    washerOd: 16,
    washerT: 1.0,
    washerC: { x: 0, y: 0 },
  };
}

export function newPart(name: string): Part {
  return { id: uid(), name, entities: [], joint: defaultJoint() };
}

export function newProject(name = 'Untitled'): Project {
  const part = newPart('Part 1');
  return {
    format: 'stl-joint-maker',
    version: 1,
    id: uid(),
    name,
    parts: [part],
    activePartId: part.id,
    background: null,
    material: 'tpu95',
    tolerance: 0.05,
    updatedAt: Date.now(),
  };
}

/** Validate and fill defaults for a loaded project (tolerant of older/partial files). */
export function normalizeProject(raw: unknown): Project {
  const p = raw as Partial<Project>;
  if (!p || p.format !== 'stl-joint-maker' || !Array.isArray(p.parts)) {
    throw new Error('Not a STL Joint Maker project file');
  }
  const base = newProject(p.name ?? 'Untitled');
  const parts: Part[] = p.parts.map((pt, i) => ({
    id: pt.id ?? uid(),
    name: pt.name ?? `Part ${i + 1}`,
    entities: Array.isArray(pt.entities) ? pt.entities : [],
    joint: { ...defaultJoint(), ...(pt.joint ?? {}) },
  }));
  if (parts.length === 0) parts.push(newPart('Part 1'));
  return {
    ...base,
    ...p,
    format: 'stl-joint-maker',
    version: 1,
    id: p.id ?? base.id,
    parts,
    activePartId: parts.some((x) => x.id === p.activePartId) ? p.activePartId! : parts[0].id,
    background: p.background ?? null,
    material: p.material ?? 'tpu95',
    tolerance: p.tolerance && p.tolerance > 0 ? p.tolerance : 0.05,
  };
}
