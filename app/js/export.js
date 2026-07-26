// Assembles "the recommended cut" for calendar export: the Sun's annual
// windows over the sphere-gates, and slow-season boundary days. This module
// only ever consumes those two streams; the Explore view has no path here.

import * as ICS from "./ics.js";
import { templateLink } from "./gcal.js";
import { partnerOf } from "./engine/wheel.js";
import { GENEKEYS_URL, yyyymmddUTC } from "./fmt.js";

const DAY = 86400000;

export const BODY_LABELS = {
  Sun: "Sun", Moon: "Moon", Mercury: "Mercury", Venus: "Venus", Mars: "Mars",
  Jupiter: "Jupiter", Saturn: "Saturn", Uranus: "Uranus", Neptune: "Neptune",
  Pluto: "Pluto", TrueNode: "North Node", Earth: "Earth", SouthNode: "South Node",
};

function dayFloor(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function yearlyAnchor(dayMs) {
  // RFC 5545 drops generated dates that do not exist, so a yearly rule
  // anchored on February 29 fires only in leap years. Shift the anchor back
  // a day; the export already tells people the day can drift by one.
  const d = new Date(dayMs);
  if (d.getUTCMonth() === 1 && d.getUTCDate() === 29) return dayMs - DAY;
  return dayMs;
}

export function sphereNamesFor(gate, spheres) {
  return spheres.filter((s) => s.gate === gate);
}

export function sunSummary(gate, spheres) {
  const here = sphereNamesFor(gate, spheres);
  if (!here.length) return `Sun in gate ${gate}`;
  const names = [...new Set(here.map((s) => s.sphereName))].join(", ");
  const lines = [...new Set(here.map((s) => s.line))];
  const lineLabel = lines.length === 1 ? `line ${lines[0]}` : `lines ${lines.join(", ")}`;
  return `Sun in gate ${gate} (${names}, ${lineLabel})`;
}

export function partnerSentence(gate, spheres, wheel) {
  // The partner-axis fact on its own, with no claim about what sits there.
  const p = partnerOf(gate, wheel);
  const held = sphereNamesFor(p, spheres);
  if (held.length) {
    const names = [...new Set(held.map((s) => s.sphereName))].join(", ");
    return `Gate ${p} (${names}) sits on the partner axis, so the two light together.`;
  }
  return `Partner gate: ${p}.`;
}

export function partnerPhrase(gate, spheres, wheel) {
  // Sun windows only. The Earth sits opposite the Sun by definition, so it
  // holds the partner gate for exactly as long as the Sun holds this one.
  // Nothing else in the sky does that, which is why the sentence is built
  // here rather than edited back out of the season copy downstream.
  const p = partnerOf(gate, wheel);
  return `${partnerSentence(gate, spheres, wheel)} The Earth holds gate ${p} for this whole window.`;
}

export function sunDescription(w, spheres, wheel) {
  return [
    `The Sun crosses gate ${w.gate}. About six days. Returns every year near this date.`,
    partnerPhrase(w.gate, spheres, wheel),
    `Meaning stays with Richard Rudd's material: ${GENEKEYS_URL}`,
  ].join("\n");
}

export function seasonWhat(season, spheres) {
  // What the body is doing, without naming it. One phrasing for all three
  // kinds, shared by the Seasons view and the calendar summary. "both" is not
  // an edge case: the Pearl derives spheres from Jupiter, so a Jupiter return
  // is always a sphere hit too.
  const here = sphereNamesFor(season.gate, spheres);
  const names = here.length
    ? ` (${[...new Set(here.map((s) => s.sphereName))].join(", ")})`
    : "";
  if (season.kind === "return") return `returns to its natal gate ${season.gate}`;
  if (season.kind === "both") return `over gate ${season.gate}${names}, its own natal gate too`;
  return `over gate ${season.gate}${names}`;
}

export function seasonLine(season, spheres) {
  const body = BODY_LABELS[season.body] || season.body;
  return `${body} ${seasonWhat(season, spheres)}`;
}

export function seasonSummary(season, edge, spheres) {
  const body = BODY_LABELS[season.body] || season.body;
  return `${body} season ${edge === "start" ? "begins" : "ends"}: ${seasonWhat(season, spheres)}`;
}

export function seasonDescription(season, spheres, wheel) {
  const body = BODY_LABELS[season.body] || season.body;
  const from = season.clamped_start
    ? "from before the computed range"
    : `from ${yyyymmddUTC(season.start)}`;
  const to = season.clamped_end
    ? "past the ten-year horizon"
    : `to ${yyyymmddUTC(season.end)}`;
  const parts = [
    `This is a season, not a week. ${body} holds gate ${season.gate} ${from} ${to}.`,
  ];
  if (season.contacts > 1) {
    parts.push(`It touches ${season.contacts} times across retrograde loops.`);
  }
  parts.push(partnerSentence(season.gate, spheres, wheel));
  parts.push(`Meaning stays with Richard Rudd's material: ${GENEKEYS_URL}`);
  return parts.filter(Boolean).join("\n");
}

export function buildCut({ sunWindows, seasons, spheres, wheel, host, nowMs }) {
  // Returns {ics, preview:[{summary, gcalUrl, when}]}. Sun windows become
  // yearly all-day events with stable per-gate UIDs; seasons become two
  // boundary events each, never a multi-year span.
  const events = [];
  const preview = [];
  const sequence = Number(yyyymmddUTC(nowMs));

  const seenGates = new Set();
  for (const w of sunWindows) {
    if (seenGates.has(w.gate)) continue; // one yearly event per gate
    seenGates.add(w.gate);
    const startDay = yearlyAnchor(dayFloor(w.start));
    const endDayExclusive = dayFloor(w.end) + DAY;
    const summary = sunSummary(w.gate, spheres);
    const description = sunDescription(w, spheres, wheel);
    events.push(ICS.allDayEvent({
      uid: `gk-sun-gate-${w.gate}@${host}`,
      summary, description, url: GENEKEYS_URL,
      startDayMs: startDay, endDayMsExclusive: endDayExclusive,
      rrule: "FREQ=YEARLY", alarm: "-P1D",
      dtstampMs: nowMs, sequence,
    }));
    preview.push({
      summary, when: `${yyyymmddUTC(startDay)}, yearly`,
      gcalUrl: templateLink({ summary, description, startDayMs: startDay, endDayMsExclusive: endDayExclusive, yearly: true }),
    });
  }

  for (const s of seasons) {
    for (const edge of ["start", "end"]) {
      // A clamped edge is the computed range running out, not the season
      // ending. Exporting it would date a "season ends" event ten years out
      // on a boundary the sky never crosses.
      if (edge === "start" && s.clamped_start) continue;
      if (edge === "end" && s.clamped_end) continue;
      const ms = s[edge];
      if (ms < nowMs - DAY) continue; // boundary already past
      const day = dayFloor(ms);
      const summary = seasonSummary(s, edge, spheres);
      const description = seasonDescription(s, spheres, wheel);
      events.push(ICS.allDayEvent({
        uid: `gk-season-${s.body.toLowerCase()}-gate-${s.gate}-${edge}-${yyyymmddUTC(day)}@${host}`,
        summary, description, url: GENEKEYS_URL,
        startDayMs: day, endDayMsExclusive: day + DAY,
        alarm: "-P1D", dtstampMs: nowMs, sequence,
      }));
      preview.push({
        summary, when: yyyymmddUTC(day),
        gcalUrl: templateLink({ summary, description, startDayMs: day, endDayMsExclusive: day + DAY, yearly: false }),
      });
    }
  }

  return { ics: ICS.calendar({ name: "Gene Keys rhythm", events }), preview };
}
