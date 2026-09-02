// Small helper so UI code can grab required elements without sprinkling
// null checks or non-null assertions everywhere.
export function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el as T;
}
