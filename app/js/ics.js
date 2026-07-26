// RFC 5545 writer. Pure string work: CRLF line endings, 75-octet folding that
// never splits a UTF-8 sequence, DTEND exclusive on all-day events. A minimal
// parser lives here too, only so the selftest can round-trip.

import { yyyymmddUTC as dateBasic } from "./fmt.js";

const CRLF = "\r\n";
const ENCODER = new TextEncoder();

export function escapeText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function foldLine(line) {
  // Fold at 75 octets; continuation lines start with one space and carry at
  // most 74 octets of payload. Walk by code point and break before any code
  // point whose UTF-8 bytes would overflow the budget.
  const out = [];
  let current = "";
  let octets = 0;
  let budget = 75;
  for (const ch of line) {
    const size = ENCODER.encode(ch).length;
    if (octets + size > budget) {
      out.push(current);
      current = " ";
      octets = 1;
      budget = 75;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.join(CRLF);
}

export function unfold(text) {
  return text.replace(/\r\n[ \t]/g, "");
}

export function unescapeText(s) {
  return String(s).replace(/\\(.)/g, (_, c) => {
    if (c === "n" || c === "N") return "\n";
    return c;
  });
}

function dateTimeBasic(ms) {
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

export function allDayEvent({ uid, summary, description, url, startDayMs, endDayMsExclusive, rrule, alarm, dtstampMs, sequence }) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dateTimeBasic(dtstampMs)}`,
  ];
  if (sequence !== undefined) lines.push(`SEQUENCE:${sequence}`);
  lines.push(
    `DTSTART;VALUE=DATE:${dateBasic(startDayMs)}`,
    `DTEND;VALUE=DATE:${dateBasic(endDayMsExclusive)}`,
  );
  if (rrule) lines.push(`RRULE:${rrule}`);
  lines.push(`SUMMARY:${escapeText(summary)}`);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (url) lines.push(`URL:${url}`);
  if (alarm) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(summary)}`,
      `TRIGGER:${alarm}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

export function calendar({ name, events }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//risaac09//gene-keys-data app//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flat(),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

export function parse(text) {
  // Minimal: unfold, split VEVENTs, read property values. Alarm properties
  // are skipped so a VALARM's own DESCRIPTION, ACTION, and TRIGGER never land
  // on the event record. Selftest use only.
  const events = [];
  let current = null;
  let inAlarm = false;
  for (const line of unfold(text).split(CRLF)) {
    if (line === "BEGIN:VALARM") inAlarm = true;
    else if (line === "END:VALARM") inAlarm = false;
    else if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") { events.push(current); current = null; }
    else if (current && !inAlarm && line && !line.startsWith("BEGIN:") && !line.startsWith("END:")) {
      const i = line.indexOf(":");
      if (i > 0) {
        const key = line.slice(0, i).split(";")[0];
        if (!(key in current)) current[key] = line.slice(i + 1);
      }
    }
  }
  return events;
}
