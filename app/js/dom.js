// One element helper, shared by every view. Attributes set as attributes,
// `on*` keys attached as listeners, children appended in order.

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    e.append(c);
  }
  return e;
}

let uid = 0;

export const DOWNLOAD_REVOKE_DELAY_MS = 60 * 1000;

export function labelFor(control, text) {
  // A label needs `for` or it needs to wrap its control; a bare sibling leaves
  // the field unnamed to a screen reader and dead to a tap on its own label.
  // Ids are generated because two copies of the birth form can sit in the DOM
  // at once (the first-run one and the edit panel's).
  if (!control.id) control.id = `f${++uid}`;
  return el("label", { for: control.id }, text);
}

export function download(text, mime, filename, {
  createObjectURL = (blob) => URL.createObjectURL(blob),
  revokeObjectURL = (url) => URL.revokeObjectURL(url),
  schedule = (fn, delay) => setTimeout(fn, delay),
  click = (anchor) => anchor.click(),
} = {}) {
  // Keep the object URL alive well past the click task. Some browsers do not
  // start reading a download immediately, so next-turn revocation is still a
  // race. The injected operations keep this lifecycle testable without
  // starting real downloads in the browser selftest.
  let url = null;
  let anchor = null;
  try {
    url = createObjectURL(new Blob([text], { type: mime }));
    anchor = el("a", { href: url, download: filename, style: "display:none" });
    document.body.appendChild(anchor);
    click(anchor);
    schedule(() => {
      anchor.remove();
      revokeObjectURL(url);
    }, DOWNLOAD_REVOKE_DELAY_MS);
  } catch (error) {
    anchor?.remove();
    if (url !== null) revokeObjectURL(url);
    throw error;
  }
}
