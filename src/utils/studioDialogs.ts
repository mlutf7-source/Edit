// Shared application dialogs. Native file pickers and sharing remain unchanged.
type Field = { label: string; value?: string };
let queue = Promise.resolve();
function ask(message: string, fields: Field[] = [], title = 'تأكيد العملية'): Promise<string[] | null> {
  const run = () => new Promise<string[] | null>(resolve => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.createElement('dialog');
    dialog.className = 'studio-shared-dialog'; dialog.dir = 'rtl';
    dialog.setAttribute('aria-label', title);
    const form = document.createElement('form'); form.method = 'dialog';
    const heading = document.createElement('h3'); heading.textContent = title; form.append(heading);
    if (message) { const p = document.createElement('p'); p.textContent = message; form.append(p); }
    const inputs = fields.map(field => { const label = document.createElement('label'); label.textContent = field.label; const input = document.createElement('input'); input.value = field.value ?? ''; input.required = true; label.append(input); form.append(label); return input; });
    const actions = document.createElement('div'); actions.className = 'studio-shared-actions';
    const ok = document.createElement('button'); ok.type = 'submit'; ok.textContent = fields.length ? 'إضافة' : 'تأكيد';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'إلغاء'; cancel.onclick = () => dialog.close('cancel'); actions.append(ok, cancel); form.append(actions); dialog.append(form);
    form.onsubmit = e => { e.preventDefault(); if (inputs.some(i => !i.value.trim())) return; dialog.close('ok'); };
    dialog.addEventListener('close', () => { const result = dialog.returnValue === 'ok' ? inputs.map(i => i.value.trim()) : null; dialog.remove(); previous?.focus(); resolve(result); }, {once:true});
    for (const event of ['keydown','keyup','pointerdown','pointerup','click']) dialog.addEventListener(event, e => e.stopPropagation());
    document.body.append(dialog); dialog.showModal(); (inputs[0] ?? cancel).focus(); inputs[0]?.select();
  });
  const result = queue.then(run); queue = result.then(() => undefined, () => undefined); return result;
}
export async function studioConfirm(message: string): Promise<boolean> { return (await ask(message)) !== null; }
export function studioFields(title: string, fields: Field[]) { return ask('', fields, title); }
export function studioNotify(message: string): void {
  let host = document.getElementById('studio-notifications');
  if (!host) { host = document.createElement('div'); host.id = 'studio-notifications'; host.dir = 'rtl'; document.body.append(host); }
  const notice = document.createElement('div'); notice.className = 'studio-notice'; notice.setAttribute('role','status');
  const text = document.createElement('span'); text.textContent = message; const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label','إغلاق'); close.onclick = () => notice.remove(); notice.append(text,close); host.append(notice); window.setTimeout(() => notice.remove(), 6500);
}
