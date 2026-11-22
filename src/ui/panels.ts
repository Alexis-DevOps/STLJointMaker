import { loadImageFile } from '../background';
import type { Editor, ToolId } from '../editor/editor';
import { fmt } from '../editor/editor';
import { arcEnd, cloneEntity, translateEntity } from '../geom/entities';
import type { BuildResult } from '../geom/mesh';
import { t } from '../i18n';
import { newPart, uid, type Entity, type JointParams, type JointType, type MaterialId, type Role } from '../model';
import { AS568, MATERIALS, METRIC, material } from '../presets';
import { store } from '../store';
import { confirmDialog, el, formDialog, pickFile, toast } from './dialogs';
import { ICONS, JOINT_ICONS } from './icons';
import { sectionEditor } from './sectionEditor';

export interface PanelContext {
  editor: Editor;
  getBuild: () => BuildResult | null;
  exportPart: (kind: 'stl' | 'svg' | 'dxf') => void;
}

const JOINT_TYPES: JointType[] = ['flat', 'oring', 'square', 'custom', 'bead', 'washer'];
const DEG = 180 / Math.PI;

/** Re-render a panel unless the user is typing inside it. */
function mount(host: HTMLElement, render: () => Node[]): () => void {
  const refresh = () => {
    const a = document.activeElement;
    if (a && host.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) {
      host.dataset.stale = '1';
      return;
    }
    delete host.dataset.stale;
    host.replaceChildren(...render());
  };
  host.addEventListener('focusout', () => {
    setTimeout(() => {
      if (host.dataset.stale && !host.contains(document.activeElement)) refresh();
    }, 0);
  });
  refresh();
  return refresh;
}

function numField(label: string, value: number, onCommit: (v: number) => void, opts: { min?: number; step?: number; unit?: string } = {}): HTMLElement {
  const input = el('input', { type: 'number', step: opts.step ?? 'any', min: opts.min });
  input.value = fmt(value);
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (!Number.isFinite(v) || (opts.min !== undefined && v < opts.min)) {
      input.value = fmt(value);
      return;
    }
    onCommit(v);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  return el('label', { class: 'field' }, el('span', { text: label }), el('span', { class: 'input-unit' }, input, opts.unit ? el('em', { text: opts.unit }) : null));
}

function checkField(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = el('input', { type: 'checkbox' });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'check' }, input, el('span', { text: label }));
}

function selectField(label: string, value: string, options: { value: string; label: string }[], onChange: (v: string) => void): HTMLElement {
  const s = el('select');
  for (const o of options) s.append(el('option', { value: o.value, text: o.label, selected: o.value === value }));
  s.addEventListener('change', () => onChange(s.value));
  return el('label', { class: 'field' }, el('span', { text: label }), s);
}

function button(label: string, onClick: () => void, opts: { icon?: string; cls?: string; title?: string } = {}): HTMLButtonElement {
  const b = el('button', { type: 'button', class: opts.cls ?? '', title: opts.title ?? label });
  if (opts.icon) b.innerHTML = ICONS[opts.icon] ?? '';
  b.append(el('span', { text: label }));
  b.addEventListener('click', onClick);
  return b;
}

function editJoint(patch: Partial<JointParams>): void {
  store.edit(() => Object.assign(store.part.joint, patch));
}

// ---------------------------------------------------------------- joint panel
export function mountJointPanel(host: HTMLElement, preview: HTMLElement, ctx: PanelContext): { refreshTypes: () => void; refreshParams: () => void; refreshInfo: () => void } {
  const types = el('div', { class: 'joint-types', role: 'radiogroup' });
  const params = el('div', { class: 'joint-params' });
  const info = el('div', { class: 'joint-info' });
  const exportBar = el('div', { class: 'export-bar' });
  host.append(types, preview, params, info, exportBar);

  const refreshTypes = () => {
    types.replaceChildren(
      ...JOINT_TYPES.map((jt) => {
        const active = store.part.joint.type === jt;
        const b = el('button', { type: 'button', class: `jt ${active ? 'active' : ''}`, role: 'radio', 'aria-checked': String(active), title: t(`jt.${jt}.desc`) });
        b.innerHTML = JOINT_ICONS[jt];
        b.append(el('span', { text: t(`jt.${jt}`) }));
        b.addEventListener('click', () => {
          if (store.part.joint.type !== jt) editJoint({ type: jt });
        });
        return b;
      }),
    );
    exportBar.replaceChildren(
      button(t('export.stl'), () => ctx.exportPart('stl'), { icon: 'download', cls: 'primary' }),
      button('SVG', () => ctx.exportPart('svg'), { title: t('export.svg') }),
      button('DXF', () => ctx.exportPart('dxf'), { title: t('export.dxf') }),
    );
  };

  const alignField = (j: JointParams) =>
    selectField(t('p.align'), j.align, [
      { value: 'center', label: t('align.center') },
      { value: 'inside', label: t('align.inside') },
      { value: 'outside', label: t('align.outside') },
    ], (v) => editJoint({ align: v as JointParams['align'] }));

  const renderParams = (): Node[] => {
    const j = store.part.joint;
    const out: Node[] = [el('p', { class: 'muted small', text: t(`jt.${j.type}.desc`) })];
    switch (j.type) {
      case 'flat':
        out.push(numField(t('p.thickness'), j.thickness, (v) => editJoint({ thickness: v }), { min: 0.05, step: 0.1, unit: 'mm' }));
        break;
      case 'bead':
        out.push(
          numField(t('p.thickness'), j.thickness, (v) => editJoint({ thickness: v }), { min: 0.05, step: 0.1, unit: 'mm' }),
          numField(t('p.beadW'), j.beadW, (v) => editJoint({ beadW: v }), { min: 0.1, step: 0.1, unit: 'mm' }),
          numField(t('p.beadH'), j.beadH, (v) => editJoint({ beadH: v }), { min: 0.05, step: 0.1, unit: 'mm' }),
          checkField(t('p.beadAroundHoles'), j.beadAroundHoles, (v) => editJoint({ beadAroundHoles: v })),
          numField(t('p.beadOffset'), j.beadOffset, (v) => editJoint({ beadOffset: v }), { min: 0, step: 0.1, unit: 'mm' }),
          el('p', { class: 'muted small', text: t('p.beadHint') }),
        );
        break;
      case 'oring': {
        out.push(numField(t('p.cord'), j.cord, (v) => editJoint({ cord: v }), { min: 0.1, step: 0.1, unit: 'mm' }), alignField(j));
        const sel = el('select');
        sel.append(el('option', { value: '', text: t('p.presetChoose') }));
        const g1 = el('optgroup', { label: 'AS568' });
        AS568.forEach((p, i) => g1.append(el('option', { value: `a${i}`, text: `${p.name} — ${p.id} × ${p.cs} mm` })));
        const g2 = el('optgroup', { label: t('p.metric') });
        METRIC.forEach((p, i) => g2.append(el('option', { value: `m${i}`, text: `${p.name} mm` })));
        sel.append(g1, g2);
        sel.addEventListener('change', () => {
          const v = sel.value;
          if (!v) return;
          const p = (v[0] === 'a' ? AS568 : METRIC)[Number(v.slice(1))];
          applyORingPreset(p.id, p.cs, ctx);
        });
        out.push(el('label', { class: 'field' }, el('span', { text: t('p.preset') }), sel), el('p', { class: 'muted small', text: t('p.presetHint') }));
        break;
      }
      case 'square':
        out.push(
          numField(t('p.width'), j.sqW, (v) => editJoint({ sqW: v }), { min: 0.1, step: 0.1, unit: 'mm' }),
          numField(t('p.height'), j.sqH, (v) => editJoint({ sqH: v }), { min: 0.1, step: 0.1, unit: 'mm' }),
          alignField(j),
        );
        break;
      case 'custom': {
        const thumb = sectionThumb(j.section);
        out.push(
          el('div', { class: 'section-row' }, thumb, button(t('p.editSection'), async () => {
            const s = await sectionEditor(j.section);
            if (s) editJoint({ section: s });
          })),
          alignField(j),
        );
        break;
      }
      case 'washer':
        out.push(
          numField(t('p.washerId'), j.washerId, (v) => editJoint({ washerId: v }), { min: 0, step: 0.1, unit: 'mm' }),
          numField(t('p.washerOd'), j.washerOd, (v) => editJoint({ washerOd: v }), { min: 0.1, step: 0.1, unit: 'mm' }),
          numField(t('p.thickness'), j.washerT, (v) => editJoint({ washerT: v }), { min: 0.05, step: 0.1, unit: 'mm' }),
          numField('X', j.washerC.x, (v) => editJoint({ washerC: { ...j.washerC, x: v } }), { unit: 'mm' }),
          numField('Y', j.washerC.y, (v) => editJoint({ washerC: { ...j.washerC, y: v } }), { unit: 'mm' }),
        );
        break;
    }
    return out;
  };
  const refreshParams = mount(params, renderParams);

  const refreshInfo = () => {
    const b = ctx.getBuild();
    const items: Node[] = [];
    if (b) {
      if (b.size) {
        items.push(
          el('div', { class: 'stats' },
            el('span', { text: `${fmt(b.size.x)} × ${fmt(b.size.y)} × ${fmt(b.size.z)} mm` }),
            el('span', { text: t('info.tris', { n: b.triangles }) }),
          ),
        );
      }
      if (store.part.joint.type === 'flat' || store.part.joint.type === 'bead') {
        items.push(el('div', { class: 'muted small', text: t('info.loops', { n: b.loops, h: b.holes }) }));
      }
      for (const e of b.errors) items.push(el('div', { class: 'msg error', text: t(e) }));
      if (b.openChains.length) items.push(el('div', { class: 'msg error', text: t('info.open', { n: b.openChains.length }) }));
      for (const w of materialWarnings()) items.push(el('div', { class: 'msg warn', text: w }));
    }
    info.replaceChildren(...items);
  };

  refreshTypes();
  return { refreshTypes, refreshParams, refreshInfo };
}

function materialWarnings(): string[] {
  const m = material(store.project.material);
  const j = store.part.joint;
  const out: string[] = [];
  const thin = (v: number) => v > 0 && v < m.minThickness;
  const small = (v: number) => v > 0 && v < m.minSection;
  if ((j.type === 'flat' || j.type === 'bead') && thin(j.thickness)) out.push(t('warn.thin', { v: m.minThickness }));
  if (j.type === 'washer' && thin(j.washerT)) out.push(t('warn.thin', { v: m.minThickness }));
  if (j.type === 'oring' && small(j.cord)) out.push(t('warn.section', { v: m.minSection }));
  if (j.type === 'square' && (small(j.sqW) || small(j.sqH))) out.push(t('warn.section', { v: m.minSection }));
  if (j.type === 'bead' && j.beadH > j.thickness * 1.5) out.push(t('warn.beadTall'));
  if (!m.flexible) out.push(t('warn.rigid'));
  else out.push(t('warn.fuel'));
  return out;
}

function applyORingPreset(id: number, cs: number, ctx: PanelContext): void {
  const sel = store.selected;
  store.edit(() => {
    const j = store.part.joint;
    j.cord = cs;
    j.align = 'inside';
    const circle = sel.length === 1 && sel[0].type === 'circle' ? sel[0] : null;
    if (circle) circle.r = id / 2;
    else {
      const c = { x: ctx.editor.view.cx, y: ctx.editor.view.cy };
      const e: Entity = { id: uid(), role: 'profile', type: 'circle', c, r: id / 2 };
      store.part.entities.push(e);
      store.selection.clear();
      store.selection.add(e.id);
    }
  });
  store.emit('selection');
  toast(t('msg.presetApplied', { id, cs }));
}

function sectionThumb(section: { x: number; y: number }[]): HTMLElement {
  const xs = section.map((p) => p.x);
  const ys = section.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 0.1);
  const h = Math.max(maxY - minY, 0.1);
  const k = Math.min(70 / w, 50 / h);
  const pts = section.map((p) => `${((p.x - minX) * k + 5).toFixed(1)},${((maxY - p.y) * k + 5).toFixed(1)}`).join(' ');
  const box = el('div', { class: 'section-thumb', title: `${fmt(w)} × ${fmt(h)} mm` });
  box.innerHTML = `<svg viewBox="0 0 ${w * k + 10} ${h * k + 10}" width="80" height="60"><polygon points="${pts}" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/></svg>`;
  box.append(el('small', { text: `${fmt(w)} × ${fmt(h)} mm` }));
  return box;
}

// ---------------------------------------------------------------- parts
export function mountPartsPanel(host: HTMLElement): () => void {
  return mount(host, () => {
    const list = el('ul', { class: 'parts' });
    store.project.parts.forEach((p) => {
      const active = p.id === store.project.activePartId;
      const name = el('input', { type: 'text', value: p.name, 'aria-label': t('parts.name') });
      name.addEventListener('change', () => store.edit(() => (p.name = name.value.trim() || p.name)));
      name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
      const li = el('li', { class: active ? 'active' : '' },
        el('span', { class: 'part-badge', text: t(`jt.${p.joint.type}`) }),
        name,
        el('span', { class: 'muted small', text: String(p.entities.length) }),
      );
      li.addEventListener('mousedown', (e) => {
        if (active || e.target === name) return;
        store.project.activePartId = p.id;
        store.selection.clear();
        store.emit('doc', 'selection', 'project');
      });
      name.addEventListener('focus', () => {
        if (!active) {
          store.project.activePartId = p.id;
          store.selection.clear();
          store.emit('doc', 'selection');
        }
      });
      list.append(li);
    });
    const bar = el('div', { class: 'row-buttons' },
      button(t('parts.add'), () => {
        const np = newPart(`${t('parts.part')} ${store.project.parts.length + 1}`);
        store.edit(() => {
          store.project.parts.push(np);
          store.project.activePartId = np.id;
        });
        store.clearSelection();
        store.emit('project');
      }, { icon: 'plus' }),
      button(t('parts.duplicate'), () => {
        const src = store.part;
        const np = JSON.parse(JSON.stringify(src));
        np.id = uid();
        np.name = `${src.name} (2)`;
        np.entities.forEach((e: Entity) => (e.id = uid()));
        store.edit(() => {
          store.project.parts.push(np);
          store.project.activePartId = np.id;
        });
        store.clearSelection();
        store.emit('project');
      }, { icon: 'duplicate' }),
      button(t('parts.delete'), async () => {
        if (store.project.parts.length <= 1) {
          toast(t('msg.lastPart'));
          return;
        }
        if (!(await confirmDialog(t('parts.delete'), t('parts.confirmDelete', { name: store.part.name })))) return;
        store.edit(() => {
          const idx = store.project.parts.findIndex((x) => x.id === store.project.activePartId);
          store.project.parts.splice(idx, 1);
          store.project.activePartId = store.project.parts[Math.max(0, idx - 1)].id;
        });
        store.clearSelection();
        store.emit('project');
      }, { icon: 'delete' }),
    );
    return [list, bar];
  });
}

// ---------------------------------------------------------------- properties
export function duplicateSelection(): void {
  const copies = store.selected.map((e) => {
    const c = cloneEntity(e, uid());
    translateEntity(c, { x: 5, y: -5 });
    return c;
  });
  if (!copies.length) return;
  store.edit(() => store.part.entities.push(...copies));
  store.select(copies.map((c) => c.id));
}

export function deleteSelection(): void {
  if (!store.selection.size) return;
  store.edit(() => (store.part.entities = store.part.entities.filter((e) => !store.selection.has(e.id))));
  store.clearSelection();
}

export async function linearPattern(): Promise<void> {
  if (!store.selection.size) {
    toast(t('msg.selectFirst'));
    return;
  }
  const r = await formDialog(t('dlg.lpatternTitle'), [
    { key: 'n', label: t('dlg.count'), type: 'number', value: 3, min: 2, step: 1 },
    { key: 'dx', label: t('dlg.dx'), type: 'number', value: 10 },
    { key: 'dy', label: t('dlg.dy'), type: 'number', value: 0 },
  ]);
  if (!r) return;
  const n = Math.max(2, Math.round(Number(r.n)));
  const copies: Entity[] = [];
  for (let k = 1; k < n; k++) {
    for (const e of store.selected) {
      const c = cloneEntity(e, uid());
      translateEntity(c, { x: Number(r.dx) * k, y: Number(r.dy) * k });
      copies.push(c);
    }
  }
  store.edit(() => store.part.entities.push(...copies));
  store.select(copies.map((c) => c.id));
}

export function mountPropsPanel(host: HTMLElement, editor: Editor): () => void {
  const setTool = (tool: ToolId) => editor.setTool(tool);
  return mount(host, () => {
    const sel = store.selected;
    if (sel.length === 0) {
      return [el('p', { class: 'muted small', text: t('props.none') })];
    }
    const out: Node[] = [];
    const roleOpts = (['profile', 'construction', 'bead'] as Role[]).map((r) => ({ value: r, label: t(`role.${r}`) }));
    const role = sel.every((e) => e.role === sel[0].role) ? sel[0].role : '';
    out.push(
      el('div', { class: 'muted small', text: sel.length === 1 ? t(`ent.${sel[0].type}`) : t('props.count', { n: sel.length }) }),
      selectField(t('props.role'), role, role ? roleOpts : [{ value: '', label: '—' }, ...roleOpts], (v) => {
        if (v) store.edit(() => store.selected.forEach((e) => (e.role = v as Role)));
      }),
    );
    if (sel.length === 1) out.push(...entityFields(sel[0]));
    out.push(
      el('div', { class: 'icon-row' },
        iconBtn('duplicate', t('op.duplicate') + ' (Ctrl+D)', duplicateSelection),
        iconBtn('mirror', t('tool.mirror'), () => setTool('mirror')),
        iconBtn('rotate', t('tool.rotate'), () => setTool('rotate')),
        iconBtn('cpattern', t('tool.cpattern'), () => setTool('cpattern')),
        iconBtn('lpattern', t('tool.lpattern'), () => void linearPattern()),
        iconBtn('delete', t('op.delete') + ' (Del)', deleteSelection),
      ),
    );
    return out;
  });
}

function iconBtn(icon: string, title: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'icon', title, 'aria-label': title });
  b.innerHTML = ICONS[icon];
  b.addEventListener('click', onClick);
  return b;
}

function entityFields(e: Entity): Node[] {
  const set = (fn: () => void) => store.edit(fn);
  const mm = { unit: 'mm' };
  switch (e.type) {
    case 'line': {
      const l = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y);
      const ang = Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x);
      return [
        grid2(
          numField('X1', e.a.x, (v) => set(() => (e.a.x = v)), mm),
          numField('Y1', e.a.y, (v) => set(() => (e.a.y = v)), mm),
          numField('X2', e.b.x, (v) => set(() => (e.b.x = v)), mm),
          numField('Y2', e.b.y, (v) => set(() => (e.b.y = v)), mm),
        ),
        grid2(
          numField(t('props.length'), l, (v) => set(() => (e.b = { x: e.a.x + v * Math.cos(ang), y: e.a.y + v * Math.sin(ang) })), { min: 0.001, unit: 'mm' }),
          numField(t('props.angle'), ang * DEG, (v) => set(() => (e.b = { x: e.a.x + l * Math.cos(v / DEG), y: e.a.y + l * Math.sin(v / DEG) })), { unit: '°' }),
        ),
      ];
    }
    case 'circle':
      return [
        grid2(
          numField('X', e.c.x, (v) => set(() => (e.c.x = v)), mm),
          numField('Y', e.c.y, (v) => set(() => (e.c.y = v)), mm),
          numField('Ø', e.r * 2, (v) => set(() => (e.r = v / 2)), { min: 0.001, unit: 'mm' }),
          numField('R', e.r, (v) => set(() => (e.r = v)), { min: 0.001, unit: 'mm' }),
        ),
      ];
    case 'arc': {
      const end = arcEnd(e);
      return [
        grid2(
          numField(t('props.cx'), e.c.x, (v) => set(() => (e.c.x = v)), mm),
          numField(t('props.cy'), e.c.y, (v) => set(() => (e.c.y = v)), mm),
          numField('R', e.r, (v) => set(() => (e.r = v)), { min: 0.001, unit: 'mm' }),
          numField(t('props.start'), e.a0 * DEG, (v) => set(() => (e.a0 = v / DEG)), { unit: '°' }),
          numField(t('props.sweep'), e.sweep * DEG, (v) => set(() => (e.sweep = Math.max(0.01, Math.min(359.99, v)) / DEG)), { unit: '°' }),
        ),
        el('div', { class: 'muted small', text: `→ ${fmt(end.x)}, ${fmt(end.y)}` }),
      ];
    }
    case 'rect':
      return [
        grid2(
          numField(t('props.cx'), e.c.x, (v) => set(() => (e.c.x = v)), mm),
          numField(t('props.cy'), e.c.y, (v) => set(() => (e.c.y = v)), mm),
          numField(t('p.width'), e.w, (v) => set(() => (e.w = v)), { min: 0.001, unit: 'mm' }),
          numField(t('p.height'), e.h, (v) => set(() => (e.h = v)), { min: 0.001, unit: 'mm' }),
          numField(t('props.angle'), e.angle * DEG, (v) => set(() => (e.angle = v / DEG)), { unit: '°' }),
          numField(t('props.radius'), e.radius, (v) => set(() => (e.radius = v)), { min: 0, unit: 'mm' }),
        ),
      ];
    case 'polyline':
    case 'spline':
      return [
        el('div', { class: 'muted small', text: t('props.points', { n: e.pts.length }) }),
        checkField(t('props.closed'), e.closed, (v) => set(() => (e.closed = v))),
      ];
  }
}

function grid2(...children: Node[]): HTMLElement {
  return el('div', { class: 'grid2' }, ...children);
}

// ---------------------------------------------------------------- background
export function mountBackgroundPanel(host: HTMLElement, editor: Editor): () => void {
  return mount(host, () => {
    const bg = store.project.background;
    const load = async () => {
      const f = await pickFile('image/png,image/jpeg');
      if (f) await loadBackground(f, editor);
    };
    if (!bg) {
      return [
        el('p', { class: 'muted small', text: t('bg.empty') }),
        button(t('bg.load'), load, { icon: 'image', cls: 'primary wide' }),
      ];
    }
    const opacity = el('input', { type: 'range', min: 0.05, max: 1, step: 0.05 });
    opacity.value = String(bg.opacity);
    opacity.addEventListener('input', () => {
      bg.opacity = Number(opacity.value);
      editor.render();
    });
    opacity.addEventListener('change', () => store.changed());
    const set = (fn: () => void) => store.edit(fn);
    const widthMm = bg.pxW * bg.mmPerPx;
    return [
      el('div', { class: `badge ${bg.calibrated ? 'ok' : 'warn'}`, text: bg.calibrated ? t('bg.calibrated') : t('bg.notCalibrated') }),
      el('label', { class: 'field' }, el('span', { text: t('bg.opacity') }), opacity),
      el('div', { class: 'grid2' },
        checkField(t('bg.visible'), bg.visible, (v) => set(() => (bg.visible = v))),
        checkField(t('bg.locked'), bg.locked, (v) => set(() => (bg.locked = v))),
      ),
      el('div', { class: 'grid2' },
        numField('X', bg.cx, (v) => set(() => (bg.cx = v)), { unit: 'mm' }),
        numField('Y', bg.cy, (v) => set(() => (bg.cy = v)), { unit: 'mm' }),
        numField(t('bg.rotation'), bg.rotation, (v) => set(() => (bg.rotation = v)), { unit: '°', step: 0.5 }),
        numField(t('bg.width'), widthMm, (v) => set(() => {
          bg.mmPerPx = v / bg.pxW;
          bg.calibrated = true;
        }), { min: 0.1, unit: 'mm' }),
      ),
      el('div', { class: 'row-buttons' },
        button(t('tool.calibrate'), () => editor.setTool('calibrate'), { icon: 'calibrate', cls: bg.calibrated ? '' : 'primary' }),
        button(t('tool.perspective'), () => editor.setTool('perspective'), { icon: 'perspective' }),
        button(t('tool.bgmove'), () => editor.setTool('bgmove'), { icon: 'bgmove' }),
      ),
      el('div', { class: 'row-buttons' },
        button(t('bg.replace'), load, { icon: 'image' }),
        button(t('bg.remove'), async () => {
          if (await confirmDialog(t('bg.remove'), t('bg.confirmRemove'))) set(() => (store.project.background = null));
        }, { icon: 'delete' }),
      ),
    ];
  });
}

export async function loadBackground(file: File, editor: Editor): Promise<void> {
  try {
    const bg = await loadImageFile(file, { x: editor.view.cx, y: editor.view.cy });
    store.edit(() => (store.project.background = bg));
    editor.fit();
    toast(t('msg.imageLoaded'));
  } catch (err) {
    toast(t((err as Error).message === 'unsupported' ? 'msg.imageType' : 'msg.imageFailed'));
  }
}

// ---------------------------------------------------------------- settings
export function mountSettingsPanel(host: HTMLElement): () => void {
  return mount(host, () => {
    const s = store.settings;
    const p = store.project;
    return [
      selectField(t('set.material'), p.material, MATERIALS.map((m) => ({ value: m.id, label: t(`mat.${m.id}`) })), (v) =>
        store.edit(() => (p.material = v as MaterialId)),
      ),
      numField(t('set.tolerance'), p.tolerance, (v) => store.edit(() => (p.tolerance = Math.max(0.005, v))), { min: 0.005, step: 0.01, unit: 'mm' }),
      numField(t('set.rectRadius'), s.rectRadius, (v) => store.updateSettings({ rectRadius: v }), { min: 0, step: 0.5, unit: 'mm' }),
      checkField(t('set.snapGrid'), s.snapGrid, (v) => store.updateSettings({ snapGrid: v })),
      checkField(t('set.snapPoints'), s.snapPoints, (v) => store.updateSettings({ snapPoints: v })),
      checkField(t('set.ghosts'), s.showGhosts, (v) => store.updateSettings({ showGhosts: v })),
    ];
  });
}
