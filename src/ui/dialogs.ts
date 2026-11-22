import { t } from '../i18n';

export interface Field {
  key: string;
  label: string;
  type: 'number' | 'text' | 'checkbox' | 'select';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export type FormResult = Record<string, number | string | boolean>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') e.className = String(v);
    else if (k === 'text') e.textContent = String(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
}

/** Modal dialog shell. Resolves with the dialog element's close value. */
export function modal(title: string, body: HTMLElement, buttons: { label: string; value: string; primary?: boolean }[]): Promise<string> {
  return new Promise((resolve) => {
    const dlg = el('dialog', { class: 'modal' });
    const form = el('form', { method: 'dialog' });
    form.append(el('h2', { text: title }), body);
    const bar = el('div', { class: 'modal-buttons' });
    // primary first in DOM so Enter (implicit submission) triggers it; CSS reverses visual order
    for (const b of [...buttons].sort((a, c) => Number(!!c.primary) - Number(!!a.primary))) {
      bar.append(
        el('button', { value: b.value, class: b.primary ? 'primary' : '', type: 'submit', formnovalidate: !b.primary, text: b.label }),
      );
    }
    form.append(bar);
    dlg.append(form);
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue || 'cancel');
      dlg.remove();
    });
    dlg.showModal();
    // Defer focus: dialogs are often opened from a canvas pointerdown, whose
    // default mousedown action would otherwise steal focus back.
    setTimeout(() => {
      const first = body.querySelector<HTMLElement>('input, select, textarea');
      if (first) {
        first.focus();
        if (first instanceof HTMLInputElement) first.select();
      }
    }, 0);
  });
}

export async function formDialog(title: string, fields: Field[]): Promise<FormResult | null> {
  const body = el('div', { class: 'form-grid' });
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  for (const f of fields) {
    const id = `f_${f.key}_${Math.random().toString(36).slice(2, 6)}`;
    let input: HTMLInputElement | HTMLSelectElement;
    if (f.type === 'select') {
      input = el('select', { id });
      for (const o of f.options ?? []) input.append(el('option', { value: o.value, text: o.label, selected: o.value === f.value }));
    } else {
      input = el('input', {
        id,
        type: f.type,
        min: f.min,
        max: f.max,
        step: f.step ?? (f.type === 'number' ? 'any' : undefined),
        required: f.type === 'number' || undefined,
      });
      if (f.type === 'checkbox') (input as HTMLInputElement).checked = Boolean(f.value);
      else input.value = String(f.value);
    }
    inputs.set(f.key, input);
    body.append(el('label', { for: id, text: f.label }), input);
  }
  const r = await modal(title, body, [
    { label: t('btn.cancel'), value: 'cancel' },
    { label: t('btn.ok'), value: 'ok', primary: true },
  ]);
  if (r !== 'ok') return null;
  const out: FormResult = {};
  for (const f of fields) {
    const i = inputs.get(f.key)!;
    if (f.type === 'checkbox') out[f.key] = (i as HTMLInputElement).checked;
    else if (f.type === 'number') out[f.key] = Number(i.value);
    else out[f.key] = i.value;
  }
  return out;
}

export async function confirmDialog(title: string, message: string): Promise<boolean> {
  const r = await modal(title, el('p', { text: message }), [
    { label: t('btn.cancel'), value: 'cancel' },
    { label: t('btn.ok'), value: 'ok', primary: true },
  ]);
  return r === 'ok';
}

let toastTimer = 0;
export function toast(msg: string): void {
  let box = document.getElementById('toast');
  if (!box) {
    box = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  box.textContent = msg;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => box!.classList.remove('show'), 2600);
}

export function download(name: string, data: BlobPart, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = el('input', { type: 'file', accept });
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
