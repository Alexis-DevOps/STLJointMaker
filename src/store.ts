import { normalizeProject, newProject, type Entity, type Part, type Project } from './model';

export type StoreEvent = 'doc' | 'selection' | 'view' | 'tool' | 'lang' | 'project' | 'settings';

export interface Settings {
  lang: 'en' | 'fr';
  snapGrid: boolean;
  snapPoints: boolean;
  showGhosts: boolean;
  rectRadius: number;
}

const SETTINGS_KEY = 'sjm.settings';

function loadSettings(): Settings {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const def: Settings = { lang, snapGrid: true, snapPoints: true, showGhosts: true, rectRadius: 2 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}

interface Snapshot {
  json: string;
  dataUrl: string | null;
}

const MAX_HISTORY = 150;

export class Store {
  project: Project = newProject();
  selection = new Set<string>();
  settings: Settings = loadSettings();
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private listeners = new Map<StoreEvent, Set<() => void>>();

  on(evt: StoreEvent, fn: () => void): void {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    this.listeners.get(evt)!.add(fn);
  }

  emit(...evts: StoreEvent[]): void {
    for (const e of evts) this.listeners.get(e)?.forEach((fn) => fn());
  }

  get part(): Part {
    return this.project.parts.find((p) => p.id === this.project.activePartId) ?? this.project.parts[0];
  }

  get selected(): Entity[] {
    return this.part.entities.filter((e) => this.selection.has(e.id));
  }

  private snap(): Snapshot {
    const bg = this.project.background;
    const json = JSON.stringify({ ...this.project, background: bg ? { ...bg, dataUrl: '' } : null });
    return { json, dataUrl: bg ? bg.dataUrl : null };
  }

  private restore(s: Snapshot): void {
    const p = JSON.parse(s.json) as Project;
    if (p.background && s.dataUrl) p.background.dataUrl = s.dataUrl;
    this.project = p;
    const ids = new Set(this.part.entities.map((e) => e.id));
    for (const id of [...this.selection]) if (!ids.has(id)) this.selection.delete(id);
  }

  /** Record the current state before a mutation so it can be undone. */
  checkpoint(): void {
    this.past.push(this.snap());
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
  }

  /** Signal that the document changed (after mutating). */
  changed(): void {
    this.project.updatedAt = Date.now();
    this.emit('doc');
  }

  /** checkpoint + mutate + changed. */
  edit(fn: () => void): void {
    this.checkpoint();
    fn();
    this.changed();
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    const s = this.past.pop();
    if (!s) return;
    this.future.push(this.snap());
    this.restore(s);
    this.changed();
    this.emit('selection');
  }

  redo(): void {
    const s = this.future.pop();
    if (!s) return;
    this.past.push(this.snap());
    this.restore(s);
    this.changed();
    this.emit('selection');
  }

  setProject(p: Project): void {
    this.project = normalizeProject(p);
    this.past = [];
    this.future = [];
    this.selection.clear();
    this.emit('project', 'doc', 'selection');
  }

  select(ids: Iterable<string>, additive = false): void {
    if (!additive) this.selection.clear();
    for (const id of ids) this.selection.add(id);
    this.emit('selection');
  }

  toggle(id: string): void {
    if (this.selection.has(id)) this.selection.delete(id);
    else this.selection.add(id);
    this.emit('selection');
  }

  clearSelection(): void {
    if (this.selection.size === 0) return;
    this.selection.clear();
    this.emit('selection');
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    this.emit('settings');
    if ('lang' in patch) this.emit('lang');
  }
}

export const store = new Store();
