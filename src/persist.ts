import { normalizeProject, type Project } from './model';

const DB = 'stl-joint-maker';
const STORE = 'projects';
const LAST_KEY = 'sjm.lastProject';

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  parts: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(r.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function saveProject(p: Project): Promise<void> {
  await tx('readwrite', (s) => s.put(JSON.parse(JSON.stringify(p))));
  try {
    localStorage.setItem(LAST_KEY, p.id);
  } catch {
    /* storage unavailable */
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  const raw = await tx('readonly', (s) => s.get(id));
  return raw ? normalizeProject(raw) : null;
}

export async function deleteProject(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = (await tx('readonly', (s) => s.getAll())) as Project[];
  return all
    .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, parts: p.parts?.length ?? 0 }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function lastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
