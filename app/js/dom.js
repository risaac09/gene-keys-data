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

export function labelFor(control, text) {
  // A label needs `for` or it needs to wrap its control; a bare sibling leaves
  // the field unnamed to a screen reader and dead to a tap on its own label.
  // Ids are generated because two copies of the birth form can sit in the DOM
  // at once (the first-run one and the edit panel's).
  if (!control.id) control.id = `f${++uid}`;
  return el("label", { for: control.id }, text);
}

export function download(text, mime, filename) {
  // The anchor joins the document and the object URL outlives the click by a
  // turn. Revoking on the statement after click() races the browser's own read
  // of the blob, and a lost race is a download that silently never happens.
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = el("a", { href: url, download: filename, style: "display:none" });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
