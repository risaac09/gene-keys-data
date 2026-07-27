// Rhythm: the Sun's annual windows over the sphere-gates. The default view
// and the only place the calendar export lives.

import { sunSummary, partnerPhrase, buildCut } from "./export.js";
import { dayStamp, timeLeft } from "./fmt.js";
import { el, download } from "./dom.js";

export function renderRhythm(container, ctx) {
  container.innerHTML = "";
  const windows = ctx.sunWindows();
  const now = Date.now();

  const exportBtn = el("button", { class: "btn primary" }, "Add to calendar");
  const preview = el("div", { style: "display:none" });
  exportBtn.addEventListener("click", () => {
    // Seasons can be a cold cache and take seconds. Say so, then defer, so
    // the button does not just sit there looking broken.
    preview.innerHTML = "";
    preview.style.display = "block";
    preview.append(el("div", { class: "empty" }, "Computing slow seasons…"));
    setTimeout(() => {
      // Pulled at click time, not render time: an app left open for days
      // would otherwise export a stale list under a stale DTSTAMP, and a
      // SEQUENCE below one already imported is a calendar client's cue to
      // ignore the update.
      const nowMs = Date.now();
      const { ics, preview: rows } = buildCut({
        sunWindows: ctx.sunWindows(),
        seasons: ctx.seasons(),
        spheres: ctx.spheres,
        wheel: ctx.wheel,
        host: location.host || "localhost",
        nowMs,
      });
      download(ics, "text/calendar", "gene-keys-rhythm.ics");

      preview.innerHTML = "";
      preview.append(el("h3", {}, "What the file holds"));
      const list = el("div", { class: "row-list" });
      for (const r of rows) {
        const g = el("a", { href: r.gcalUrl, target: "_blank", rel: "noopener" }, "Google");
        list.append(el("div", { class: "row-item" },
          el("span", { class: "row-when" }, r.when),
          el("span", { class: "row-what" }, r.summary + " "),
          g));
      }
      preview.append(list, el("p", { class: "notice" },
        "The .ics downloaded. Google links open only when clicked; nothing else leaves the device. Re-export once a year and re-import: the same event IDs update in place."));
    }, 30);
  });

  container.append(el("div", { class: "toolbar" },
    el("span", { class: "notice", style: "flex:1" },
      "About ten Sun windows a year, six days each, recurring. This is the whole recommended fast layer."),
    exportBtn));

  const list = el("div", { class: "card row-list" });
  for (const w of windows) {
    const open = w.start <= now && now <= w.end;
    const item = el("div", { class: "row-item" });
    const when = el("span", { class: "row-when" }, `${dayStamp(w.start)} to ${dayStamp(w.end)}`);
    const what = el("span", { class: "row-what" });
    if (open) {
      what.append(el("span", { class: "dot-open" }), el("span", { class: "tag-open" }, "open "), ` ${timeLeft(w.end - now)} `);
    }
    what.append(sunSummary(w.gate, ctx.spheres));
    item.append(when, what,
      el("span", { class: "row-note" }, partnerPhrase(w.gate, ctx.spheres, ctx.wheel)));
    list.append(item);
  }
  if (!windows.length) {
    container.append(el("div", { class: "empty" }, "No Sun windows computed."));
  } else {
    container.append(list);
  }
  container.append(preview);
}
