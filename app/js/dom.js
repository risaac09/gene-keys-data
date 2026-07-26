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
