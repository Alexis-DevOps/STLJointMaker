import './style.css';
import { setImageLoadedCallback } from './background';
import { Editor, fmt, isTyping, type ToolId } from './editor/editor';
import { toDXF, toSVG } from './geom/export2d';
import { buildLoops } from './geom/loops';
import { buildPart, washerRegions, type BuildResult } from './geom/mesh';
import { toBinarySTL } from './geom/stl';
import { applyI18n, setLang, t } from './i18n';
import { newProject, normalizeProject, type Part } from './model';
import { deleteProject, lastProjectId, listProjects, loadProject, saveProject } from './persist';
import { Preview3D } from './preview3d';
import { material } from './presets';
import { store } from './store';
import { confirmDialog, download, el, modal, pickFile, toast } from './ui/dialogs';
import { ICONS } from './ui/icons';
import {
  deleteSelection,
  duplicateSelection,
  linearPattern,
  loadBackground,
  mountBackgroundPanel,
  mountJointPanel,
  mountPartsPanel,
  mountPropsPanel,
  mountSettingsPanel,
} from './ui/panels';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

setLang(store.settings.lang);
applyI18n(document.body);
document.querySelectorAll<HTMLElement>('[data-icon]').forEach((e) => (e.innerHTML = ICONS[e.dataset.icon!] ?? ''));

const editor = new Editor($<HTMLCanvasElement>('canvas'));
setImageLoadedCallback(() => editor.render());
const preview = new Preview3D($('preview'));

// ------------------------------------------------------------------ build
let lastBuild: BuildResult | null = null;
let buildTimer = 0;
let lastBuiltPartId = '';
function scheduleBuild(): void {
  clearTimeout(buildTimer);
  buildTimer = window.setTimeout(() => {
    try {
      lastBuild = buildPart(store.part, store.project.tolerance);
    } catch (err) {
      console.error(err);
      lastBuild = null;
    }
    editor.openChains = lastBuild?.openChains ?? [];
    preview.setColor(material(store.project.material).color);
    preview.update(lastBuild?.mesh ?? new Float32Array(), lastBuiltPartId !== store.part.id);
    lastBuiltPartId = store.part.id;
    joint.refreshInfo();
    editor.render();
  }, 120);
}

// ------------------------------------------------------------------ export
const safe = (s: string) => s.trim().replace(/[^\w\-.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'joint';
function fileBase(part: Part): string {
  const j = part.joint;
  const dims: Record<string, string> = {
    flat: `${fmt(j.thickness)}mm`,
    bead: `${fmt(j.thickness)}mm_bead`,
    oring: `cs${fmt(j.cord)}`,
    square: `${fmt(j.sqW)}x${fmt(j.sqH)}`,
    custom: 'custom',
    washer: `${fmt(j.washerId)}x${fmt(j.washerOd)}x${fmt(j.washerT)}`,
  };
  return `${safe(store.project.name)}_${safe(part.name)}_${j.type}_${dims[j.type]}`;
}

function exportPart(kind: 'stl' | 'svg' | 'dxf'): void {
  const part = store.part;
  const tol = store.project.tolerance;
  if (kind === 'stl') {
    const b = buildPart(part, tol);
    if (!b.triangles) {
      toast(t('msg.nothingToExport'));
      return;
    }
    download(`${fileBase(part)}.stl`, toBinarySTL(b.mesh, `STL Joint Maker - ${part.name}`), 'model/stl');
    if (b.openChains.length) toast(t('info.open', { n: b.openChains.length }));
    else toast(t('msg.exported'));
    return;
  }
  let outline;
  if (part.joint.type === 'washer') {
    const r = washerRegions(part.joint, tol);
    outline = { loops: r.flatMap((x) => [x.outer, ...x.holes]), open: [] };
  } else {
    const l = buildLoops(part.entities, tol, 'profile');
    outline = { loops: l.loops, open: l.open };
  }
  if (!outline.loops.length && !outline.open.length) {
    toast(t('msg.nothingToExport'));
    return;
  }
  if (kind === 'svg') download(`${fileBase(part)}.svg`, toSVG(outline, part.name), 'image/svg+xml');
  else download(`${fileBase(part)}.dxf`, toDXF(outline), 'application/dxf');
  toast(t('msg.exported'));
}

// ------------------------------------------------------------------ panels
const joint = mountJointPanel($('jointPanel'), $('preview'), { editor, getBuild: () => lastBuild, exportPart });
const refreshParts = mountPartsPanel($('partsPanel'));
const refreshProps = mountPropsPanel($('propsPanel'), editor);
const refreshBg = mountBackgroundPanel($('bgPanel'), editor);
const refreshSettings = mountSettingsPanel($('settingsPanel'));

// ------------------------------------------------------------------ toolbar
interface ToolDef {
  id: ToolId | 'lpattern' | 'fit';
  key?: string;
}
const TOOLS: (ToolDef | '|')[] = [
  { id: 'select', key: 'V' },
  '|',
  { id: 'line', key: 'L' },
  { id: 'polyline', key: 'P' },
  { id: 'arc', key: 'A' },
  { id: 'circle', key: 'C' },
  { id: 'rect', key: 'R' },
  { id: 'rrect', key: 'O' },
  { id: 'spline', key: 'S' },
  '|',
  { id: 'mirror' },
  { id: 'rotate' },
  { id: 'cpattern' },
  { id: 'lpattern' },
  '|',
  { id: 'measure', key: 'M' },
  { id: 'calibrate', key: 'K' },
  { id: 'perspective' },
  { id: 'bgmove' },
  '|',
  { id: 'fit', key: 'F' },
];
const toolbar = $('toolbar');
function renderToolbar(): void {
  toolbar.replaceChildren(
    ...TOOLS.map((d) => {
      if (d === '|') return el('div', { class: 'sep' });
      const title = `${t(`tool.${d.id}`)}${d.key ? ` (${d.key})` : ''}`;
      const b = el('button', { type: 'button', class: `tool ${editor.tool === d.id ? 'active' : ''}`, title, 'aria-label': title });
      b.innerHTML = ICONS[d.id];
      b.addEventListener('click', () => runTool(d.id));
      return b;
    }),
  );
}
function runTool(id: ToolDef['id']): void {
  if (id === 'fit') editor.fit();
  else if (id === 'lpattern') void linearPattern();
  else editor.setTool(id);
}

// ------------------------------------------------------------------ top bar
const nameInput = $<HTMLInputElement>('projectName');
nameInput.addEventListener('change', () => store.edit(() => (store.project.name = nameInput.value.trim() || t('proj.untitled'))));
nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && nameInput.blur());

$('btnUndo').addEventListener('click', () => store.undo());
$('btnRedo').addEventListener('click', () => store.redo());
$('btnNew').addEventListener('click', async () => {
  await flushSave();
  store.setProject(newProject(t('proj.untitled')));
  editor.view = { cx: 0, cy: 0, zoom: 4 };
  editor.render();
  void persist();
});
$('btnOpen').addEventListener('click', async () => {
  const f = await pickFile('.json,.sjm.json,application/json');
  if (!f) return;
  try {
    const p = normalizeProject(JSON.parse(await f.text()));
    await flushSave();
    store.setProject(p);
    editor.fit();
    void persist();
    toast(t('msg.opened'));
  } catch {
    toast(t('msg.badFile'));
  }
});
$('btnSave').addEventListener('click', () => saveFile());
function saveFile(): void {
  download(`${safe(store.project.name)}.sjm.json`, JSON.stringify(store.project), 'application/json');
}
$('btnProjects').addEventListener('click', () => void projectsDialog());
$('btnHelp').addEventListener('click', () => void helpDialog());
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => store.updateSettings({ lang: b.dataset.lang as 'en' | 'fr' })),
);

async function projectsDialog(): Promise<void> {
  await flushSave();
  const list = el('ul', { class: 'project-list' });
  const metas = await listProjects().catch(() => []);
  const dlgBody = el('div', {}, list);
  if (!metas.length) list.append(el('li', { class: 'muted', text: t('proj.none') }));
  let chosen: string | null = null;
  for (const m of metas) {
    const open = el('button', { type: 'submit', value: 'open', class: m.id === store.project.id ? 'current' : '' },
      el('strong', { text: m.name }),
      el('span', { class: 'muted small', text: `${new Date(m.updatedAt).toLocaleString(store.settings.lang)} · ${t('proj.parts', { n: m.parts })}` }),
    );
    open.addEventListener('click', () => (chosen = m.id));
    const del = el('button', { type: 'button', class: 'icon', title: t('op.delete'), 'aria-label': t('op.delete') });
    del.innerHTML = ICONS.delete;
    del.addEventListener('click', async () => {
      if (m.id === store.project.id) {
        toast(t('proj.cantDeleteCurrent'));
        return;
      }
      if (await confirmDialog(t('op.delete'), t('proj.confirmDelete', { name: m.name }))) {
        await deleteProject(m.id);
        li.remove();
      }
    });
    const li = el('li', {}, open, del);
    list.append(li);
  }
  dlgBody.append(el('p', { class: 'muted small', text: t('proj.storageNote') }));
  const r = await modal(t('proj.title'), dlgBody, [{ label: t('btn.close'), value: 'cancel' }]);
  if (r === 'open' && chosen && chosen !== store.project.id) {
    const p = await loadProject(chosen);
    if (p) {
      store.setProject(p);
      editor.fit();
    }
  }
}

async function helpDialog(): Promise<void> {
  const body = el('div', { class: 'help' });
  body.innerHTML = t('help.html');
  await modal(t('help.title'), body, [{ label: t('btn.close'), value: 'cancel', primary: true }]);
}

// ------------------------------------------------------------------ status bar
const coords = $('coords');
const hint = $('hint');
const coordInput = $<HTMLInputElement>('coordInput');
editor.onStatus = () => {
  const c = editor.cursor;
  const m = editor.measure;
  coords.textContent = `X ${fmt(c.x)}  Y ${fmt(c.y)} mm` + (m ? `  ·  ${t('tool.measure')}: ${fmt(Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y))} mm` : '');
};
coordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (editor.feedText(coordInput.value)) coordInput.value = '';
    else coordInput.classList.add('invalid');
    e.preventDefault();
  } else if (e.key === 'Escape') {
    coordInput.value = '';
    coordInput.blur();
  } else coordInput.classList.remove('invalid');
});
const snapGrid = $<HTMLInputElement>('snapGrid');
const snapPts = $<HTMLInputElement>('snapPoints');
snapGrid.addEventListener('change', () => store.updateSettings({ snapGrid: snapGrid.checked }));
snapPts.addEventListener('change', () => store.updateSettings({ snapPoints: snapPts.checked }));
function refreshStatus(): void {
  hint.textContent = editor.hint();
  snapGrid.checked = store.settings.snapGrid;
  snapPts.checked = store.settings.snapPoints;
  coordInput.placeholder = editor.expectsRadius() ? t('status.radiusPh') : t('status.coordPh');
  ($('btnUndo') as HTMLButtonElement).disabled = !store.canUndo;
  ($('btnRedo') as HTMLButtonElement).disabled = !store.canRedo;
  if (document.activeElement !== nameInput) nameInput.value = store.project.name;
}

// ------------------------------------------------------------------ keyboard
const keyTools: Record<string, ToolDef['id']> = {};
for (const d of TOOLS) if (d !== '|' && d.key) keyTools[d.key.toLowerCase()] = d.id;
window.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveFile();
    return;
  }
  if (isTyping(e)) return;
  if (mod) {
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) store.undo();
    else if (k === 'y' || (k === 'z' && e.shiftKey)) store.redo();
    else if (k === 'd') duplicateSelection();
    else if (k === 'a') store.select(store.part.entities.map((x) => x.id));
    else return;
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') editor.cancel();
  else if (e.key === 'Enter') editor.confirm();
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
  else if (e.key === '+' || e.key === '=') editor.zoomBy(1.25);
  else if (e.key === '-' && editor.tool === 'select') editor.zoomBy(0.8);
  else if (/^[0-9@.\-]$/.test(e.key) && editor.tool !== 'select') {
    coordInput.focus(); // the typed character lands in the coordinate box
    return;
  } else if (!e.altKey && keyTools[e.key.toLowerCase()]) runTool(keyTools[e.key.toLowerCase()]);
  else return;
  e.preventDefault();
});

// drag & drop an image (or project file) onto the canvas
const wrap = $('canvasWrap');
wrap.addEventListener('dragover', (e) => {
  e.preventDefault();
  wrap.classList.add('drop');
});
wrap.addEventListener('dragleave', () => wrap.classList.remove('drop'));
wrap.addEventListener('drop', async (e) => {
  e.preventDefault();
  wrap.classList.remove('drop');
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  if (/^image\//.test(f.type)) await loadBackground(f, editor);
  else if (f.name.endsWith('.json')) {
    try {
      store.setProject(normalizeProject(JSON.parse(await f.text())));
      editor.fit();
    } catch {
      toast(t('msg.badFile'));
    }
  }
});

// ------------------------------------------------------------------ persistence
let saveTimer = 0;
let pendingSave = false;
const saveState = $('saveState');
function persist(): Promise<void> {
  pendingSave = false;
  saveState.textContent = t('status.saving');
  return saveProject(store.project)
    .then(() => (saveState.textContent = t('status.saved')))
    .catch((err) => {
      console.error(err);
      saveState.textContent = t('status.saveFailed');
      toast(t('msg.saveFailed'));
    })
    .then(() => undefined);
}
function scheduleSave(): void {
  pendingSave = true;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persist(), 700);
}
async function flushSave(): Promise<void> {
  if (pendingSave) {
    clearTimeout(saveTimer);
    await persist();
  }
}
window.addEventListener('beforeunload', () => {
  if (pendingSave) void persist();
});

// ------------------------------------------------------------------ events
store.on('doc', () => {
  scheduleBuild();
  scheduleSave();
  joint.refreshTypes();
  joint.refreshParams();
  refreshParts();
  refreshProps();
  refreshBg();
  refreshSettings();
  refreshStatus();
  editor.render();
});
store.on('selection', () => {
  refreshProps();
  editor.render();
});
store.on('tool', () => {
  renderToolbar();
  refreshStatus();
});
store.on('project', () => {
  refreshParts();
  refreshStatus();
});
store.on('settings', () => {
  refreshSettings();
  refreshStatus();
  editor.render();
});
store.on('lang', () => {
  setLang(store.settings.lang);
  applyI18n(document.body);
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === store.settings.lang));
  renderToolbar();
  joint.refreshTypes();
  joint.refreshParams();
  joint.refreshInfo();
  refreshParts();
  refreshProps();
  refreshBg();
  refreshSettings();
  refreshStatus();
});

// ------------------------------------------------------------------ boot
async function boot(): Promise<void> {
  renderToolbar();
  store.emit('lang');
  let p = null;
  const last = lastProjectId();
  if (last) p = await loadProject(last).catch(() => null);
  if (!p) {
    const metas = await listProjects().catch(() => []);
    if (metas[0]) p = await loadProject(metas[0].id).catch(() => null);
  }
  store.setProject(p ?? newProject(t('proj.untitled')));
  editor.fit();
  if (!p) void persist();
  else saveState.textContent = t('status.saved');
}
void boot();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
