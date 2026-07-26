// Now: what is lit at this minute, per body, with time remaining. Recomputes
// locally on a one-minute timer; no network.

import { BODY_LABELS, sphereNamesFor } from "./export.js";
import { gateDotLine, timeLeft } from "./fmt.js";
import { el } from "./dom.js";

export function renderNow(container, ctx) {
  const draw = () => {
    container.innerHTML = "";
    const states = ctx.nowStates();
    const now = new Date();
    const table = el("table");
    table.append(el("thead", {}, el("tr", {},
      el("th", {}, "Body"), el("th", {}, "Position"), el("th", {}, "In your chart"), el("th", {}, "Time remaining"))));
    const tbody = el("tbody");
    for (const s of states) {
      const lit = ctx.gates.has(s.gate);
      const here = lit ? sphereNamesFor(s.gate, ctx.spheres) : [];
      const names = [...new Set(here.map((x) => x.sphereName))].join(", ");
      tbody.append(el("tr", {},
        el("td", {}, (BODY_LABELS[s.body] || s.body) + (s.alias ? ` (${s.alias})` : "")),
        el("td", { class: "mono" }, gateDotLine(s.gate, s.line)),
        lit
          ? el("td", { class: "tag-open" }, `yes: ${names}`)
          : el("td", { class: "mono" }, "·"),
        el("td", { class: "mono" }, s.exitMs ? timeLeft(s.exitMs - Date.now()) : "…")));
    }
    table.append(tbody);
    container.append(
      el("p", { class: "notice" },
        `As of ${now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}, updates each minute. Earth mirrors the Sun; the South Node mirrors the North.`),
      table);
  };
  draw();
  // The timer repaints the shared #view element, so it belongs to this view
  // and dies with it. The caller runs the returned cleanup before the next
  // view draws.
  const timer = setInterval(draw, 60000);
  return () => clearInterval(timer);
}
