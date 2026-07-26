// Seasons: the six slow bodies crossing sphere-gates or returning to their
// own natal gates, ten years out. Open seasons first. About one begins a year.

import { seasonLine } from "./export.js";
import { dayStamp, duration, timeLeft, contactsPhrase } from "./fmt.js";
import { el } from "./dom.js";

const HORIZON_NOTE = "still open past the ten-year horizon";

function seasonWhen(s) {
  // A clamped edge is where the computed range stopped, not where the season
  // did, so it never gets shown as a date.
  if (s.clamped_start && s.clamped_end) return "open across the whole computed range";
  if (s.clamped_end) return `${dayStamp(s.start)} onward`;
  if (s.clamped_start) return `already open, to ${dayStamp(s.end)}`;
  return `${dayStamp(s.start)} to ${dayStamp(s.end)}`;
}

function openNote(s, now) {
  const held = s.clamped_start || s.clamped_end
    ? `Holds the gate at least ${duration(s.end - s.start)}`
    : `Holds the gate ${duration(s.end - s.start)} in all`;
  const left = s.clamped_end ? HORIZON_NOTE : timeLeft(s.end - now);
  return `${left.charAt(0).toUpperCase()}${left.slice(1)}. ${held}; ${contactsPhrase(s.contacts)}.`;
}

function upcomingNote(s, now) {
  const held = s.clamped_end
    ? `Holds the gate at least ${duration(s.end - s.start)}, ${HORIZON_NOTE}`
    : `Holds the gate ${duration(s.end - s.start)}`;
  return `Begins in ${duration(s.start - now)}. ${held}; ${contactsPhrase(s.contacts)}.`;
}

export function renderSeasons(container, ctx) {
  container.innerHTML = "";
  container.append(el("div", { class: "empty" }, "Computing ten years of slow seasons…"));
  // The heavy work is deferred so the placeholder paints. If the view changes
  // first, this callback must not write into #view behind the next view's back.
  let cancelled = false;
  const timer = setTimeout(() => {
    if (cancelled) return;
    const seasons = ctx.seasons();
    const now = Date.now();
    container.innerHTML = "";

    const open = seasons.filter((s) => s.start <= now && now <= s.end);
    const upcoming = seasons.filter((s) => s.start > now).sort((a, b) => a.start - b.start);

    container.append(el("p", { class: "notice" },
      "Jupiter, Saturn, Uranus, Neptune, Pluto, and the North Node, ten years out. About one season begins a year. Calendar export marks the start day and the end day, not the whole span."));

    const list = el("div", { class: "card row-list" });
    for (const s of open) {
      list.append(el("div", { class: "row-item" },
        el("span", { class: "row-when" }, seasonWhen(s)),
        el("span", { class: "row-what" },
          el("span", { class: "dot-open" }), el("span", { class: "tag-open" }, "open "),
          ` ${seasonLine(s, ctx.spheres)}`),
        el("span", { class: "row-note" }, openNote(s, now))));
    }
    for (const s of upcoming) {
      list.append(el("div", { class: "row-item" },
        el("span", { class: "row-when" }, seasonWhen(s)),
        el("span", { class: "row-what" }, seasonLine(s, ctx.spheres)),
        el("span", { class: "row-note" }, upcomingNote(s, now))));
    }
    if (!open.length && !upcoming.length) {
      container.append(el("div", { class: "empty" }, "No slow season opens in the next ten years over this chart."));
    } else {
      if (!open.length && upcoming.length) {
        const nxt = upcoming[0];
        container.append(el("p", { class: "notice" },
          `No slow season is open. The next begins ${dayStamp(nxt.start)}: ${seasonLine(nxt, ctx.spheres)}.`));
      }
      container.append(list);
    }
  }, 30);
  return () => { cancelled = true; clearTimeout(timer); };
}
