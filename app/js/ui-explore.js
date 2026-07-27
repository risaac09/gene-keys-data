// Explore: the maximalist view. Any body over any gate, conjunction and
// partner axis, precise enter and exit times. Never feeds the calendar export.

import { BODY_LABELS } from "./export.js";
import { partnerOf } from "./engine/wheel.js";
import { TRANSIT_BODIES } from "./engine/astro.js";
import { utcStamp, localStamp, percent, contactsPhrase } from "./fmt.js";
import { el, labelFor } from "./dom.js";

export function renderExplore(container, ctx) {
  container.innerHTML = "";

  container.append(el("p", { class: "banner" },
    `Your gates cover ${percent(ctx.coverageConj)} of the wheel, ${percent(ctx.coverageBoth)} with the partner axis. Past that, something is always lit. Highlighting everything highlights nothing. This view never feeds the calendar.`));

  const bodySelect = el("select");
  for (const b of TRANSIT_BODIES) {
    bodySelect.append(el("option", { value: b }, BODY_LABELS[b] || b));
  }

  const gateSelect = el("select");
  const mine = el("optgroup", { label: "Your gates" });
  for (const g of [...ctx.gates].sort((a, b) => a - b)) {
    mine.append(el("option", { value: g }, `gate ${g}`));
  }
  // The second group is the complement, not all 64: listing a sphere gate in
  // both puts the same value in the select twice.
  const rest = el("optgroup", { label: "The other gates" });
  for (let g = 1; g <= 64; g++) {
    if (ctx.gates.has(g)) continue;
    rest.append(el("option", { value: g }, `gate ${g}`));
  }
  gateSelect.append(mine);
  if (rest.childElementCount) gateSelect.append(rest);

  const partnerToggle = el("input", { type: "checkbox" });
  const runBtn = el("button", { class: "btn primary" }, "Compute windows");
  const results = el("div");

  runBtn.addEventListener("click", () => {
    results.innerHTML = "";
    results.append(el("div", { class: "empty" }, "Computing…"));
    setTimeout(() => {
      const body = bodySelect.value;
      const gate = Number(gateSelect.value);
      const gates = [gate];
      if (partnerToggle.checked) gates.push(partnerOf(gate, ctx.wheel));
      const windows = ctx.exploreWindows(body, gates);
      results.innerHTML = "";
      if (!windows.length) {
        results.append(el("div", { class: "empty" },
          `${BODY_LABELS[body]} does not touch ${gates.length > 1 ? "this axis" : `gate ${gate}`} in the computed span.`));
        return;
      }
      const list = el("div", { class: "card row-list" });
      for (const w of windows) {
        const axis = w.gate !== gate ? " (partner axis)" : "";
        list.append(el("div", { class: "row-item" },
          el("span", { class: "row-what" }, `${BODY_LABELS[body]} in gate ${w.gate}${axis}, ${contactsPhrase(w.contacts)}`),
          el("span", { class: "row-note mono" },
            `enter ${utcStamp(w.start)} (${localStamp(w.start)} local)` +
            (w.clamped_start ? " [range edge]" : "") +
            ` · exit ${utcStamp(w.end)} (${localStamp(w.end)} local)` +
            (w.clamped_end ? " [range edge]" : ""))));
      }
      results.append(list);
    }, 30);
  });

  container.append(
    el("div", { class: "field-grid" },
      el("div", {}, labelFor(bodySelect, "Body"), bodySelect),
      el("div", {}, labelFor(gateSelect, "Gate"), gateSelect),
      el("div", {}, labelFor(partnerToggle, "Include partner axis"), partnerToggle),
      // The button labels itself; the spacer keeps it on the grid's baseline.
      el("div", {}, el("div", { class: "label-spacer" }), runBtn)),
    results);
}
