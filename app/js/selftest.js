// The app's selftest, mirroring the three Python --selftest suites plus the
// app's own concerns (ICS, timezone, storage). Every instant here is synthetic
// or an astronomical epoch; no real birth moment appears, per CONTRIBUTING.md.

import { loadWheel, gateOfLongitude, partnerOf, norm360 } from "./engine/wheel.js";
import {
  bodyLongitude, meeusSunLongitude, meanNodeLongitude, trueNodeLongitude,
  verifyEphemeris,
} from "./engine/astro.js";
import { designMoment, parseDerivation } from "./engine/chart.js";
import { maxStep, gateWindows, groupPassages } from "./engine/windows.js";
import { meanDwell, coverage } from "./engine/seasons.js";
import * as ICS from "./ics.js";
import { buildCut } from "./export.js";
import { zonedToUtc, offsetToUtc } from "./tz.js";
import { parseOffset } from "./ui-birth.js";
import * as Store from "./store.js";

const DAY = 86400000;
const HOUR = 3600000;
const MIN = 60000;
const EPOCH = Date.UTC(2026, 0, 1); // synthetic test epoch, as in the Python selftests

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(a, b, tol, msg) {
  assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
}

function circularDiff(a, b) {
  return norm360(a - b + 180) - 180;
}

function ramp(rate, origin) {
  // A synthetic body at constant `rate` degrees per day from `origin`.
  return (ms) => norm360(origin + (rate * (ms - EPOCH)) / DAY);
}

export function buildCases(wheelDoc, hexagrams) {
  const wheel = loadWheel(wheelDoc);
  const width = wheel.degreesPerGate;
  const start = wheel.startLongitude;

  return [
    {
      id: "wheel-anchor",
      name: "Wheel anchor, all 64 midpoints, modulo guard",
      run() {
        let r = gateOfLongitude(start, wheel);
        assert(r.gate === wheel.anchorGate && r.line === 1, "anchor is off");
        r = gateOfLongitude(start - 0.001, wheel);
        assert(r.gate === wheel.order[63], "hair before anchor should be the last gate");
        // Negative input exercises the JS modulo guard: 302 - 360 = -58.
        r = gateOfLongitude(start - 360, wheel);
        assert(r.gate === wheel.anchorGate && r.line === 1, "negative longitude broke");
        const half = width / 2;
        for (let i = 0; i < 64; i++) {
          const mid = norm360(start + i * width + half);
          const got = gateOfLongitude(mid, wheel).gate;
          assert(got === wheel.order[i], `midpoint of ${wheel.order[i]} resolved to ${got}`);
        }
        return "anchor, 64/64 midpoints, negative-longitude guard";
      },
    },
    {
      id: "wheel-lines",
      name: "Six line divisions within one gate",
      run() {
        const per = wheel.degreesPerLine;
        for (let k = 0; k < 6; k++) {
          const r = gateOfLongitude(start + per * k + per / 2, wheel);
          assert(r.gate === wheel.anchorGate && r.line === k + 1,
            `line midpoint ${k + 1} gave ${r.gate}.${r.line}`);
        }
        // A band boundary belongs to the upper band.
        assert(gateOfLongitude(start + per, wheel).line === 2, "boundary not upper band");
        return "6 line midpoints, boundary ownership";
      },
    },
    {
      id: "solar-j2000",
      name: "J2000 solar longitude, engine and Meeus",
      run() {
        const j2000 = Date.UTC(2000, 0, 1, 12);
        approx(meeusSunLongitude(j2000), 280.376, 0.01, "Meeus series drifted");
        approx(bodyLongitude("Sun", j2000), 280.376, 0.01, "engine J2000 drifted");
        const v = verifyEphemeris(Date.now());
        assert(v.ok, `startup verification failed: ${JSON.stringify(v.checks)}`);
        return "Meeus and engine both within 0.01 deg of 280.376";
      },
    },
    {
      id: "window-length",
      name: "Synthetic ramp holds the anchor gate one day",
      run() {
        assert(maxStep(width, wheel) === DAY, "one gate per day should give one day");
        assert(maxStep(width * 2, wheel) === DAY / 2, "max_step scaling");
        const win = gateWindows(ramp(width, start), [wheel.anchorGate],
          EPOCH, EPOCH + 10 * DAY, DAY / 24, wheel);
        assert(win.length === 1, `expected one window, got ${win.length}`);
        assert(win[0].clamped_start && !win[0].clamped_end, "clamp flags wrong");
        approx(win[0].end - win[0].start, DAY, 2 * MIN, "held duration");
        return "one window, ~1 day, correct clamps";
      },
    },
    {
      id: "window-bisection",
      name: "Coarse step agrees with fine step",
      run() {
        const fine = gateWindows(ramp(width, start), [wheel.anchorGate],
          EPOCH, EPOCH + 10 * DAY, DAY / 24, wheel);
        const coarse = gateWindows(ramp(width, start), [wheel.anchorGate],
          EPOCH, EPOCH + 10 * DAY, DAY / 2, wheel);
        approx(coarse[0].end, fine[0].end, 2 * MIN, "bisection vs grid");
        return "exit boundary within 2 minutes across step sizes";
      },
    },
    {
      id: "window-retrograde",
      name: "Retrograde contacts group into one passage",
      run() {
        const nxt = wheel.order[1];
        const edge = start + width;
        const OFFSETS = { 0: -1.0, 1: 0.5, 2: 0.5, 3: -0.5, 4: -0.5, 5: 0.5, 6: 0.5, 7: -0.5, 8: -0.5 };
        const retro = (ms) => {
          const d = Math.floor((ms - EPOCH) / DAY);
          const off = d in OFFSETS ? OFFSETS[d] : 1.0;
          return norm360(edge + off);
        };
        const loose = gateWindows(retro, [nxt], EPOCH, EPOCH + 12 * DAY, HOUR, wheel);
        assert(loose.length === 3, `ungrouped should be 3, got ${loose.length}`);
        assert(loose.every((w) => w.contacts === 1), "ungrouped contacts");
        const tight = gateWindows(retro, [nxt], EPOCH, EPOCH + 12 * DAY, HOUR, wheel,
          { passageGapMs: 3 * DAY });
        assert(tight.length === 1, `grouped should be 1, got ${tight.length}`);
        assert(tight[0].contacts === 3, `expected 3 contacts, got ${tight[0].contacts}`);
        assert(tight[0].start === loose[0].start && tight[0].end === loose[2].end,
          "passage span");
        const short = gateWindows(retro, [nxt], EPOCH, EPOCH + 12 * DAY, HOUR, wheel,
          { passageGapMs: 6 * HOUR });
        assert(short.length === 3, "short gap must fold nothing");
        assert(gateWindows(ramp(1, 0), [], EPOCH, EPOCH + DAY, HOUR, wheel).length === 0,
          "no gates finds nothing");
        assert(gateWindows(ramp(1, 0), [wheel.anchorGate], EPOCH, EPOCH, DAY, wheel).length === 0,
          "empty range is not an error");
        return "3 contacts -> 1 passage; 6h gap folds nothing; edge cases";
      },
    },
    {
      id: "coverage",
      name: "Dwell and coverage arithmetic",
      run() {
        assert(meanDwell(64.0, wheel) === 1.0, "dwell of a 64-day circuit");
        approx(meanDwell(27.32, wheel) * 24, 10.245, 0.01, "Moon dwell hours");
        assert(coverage([41], wheel) === 5.625 / 360.0, "one-gate coverage exact");
        const all = Array.from({ length: 64 }, (_, i) => i + 1);
        assert(coverage(all, wheel) === 1.0, "full wheel");
        const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
        approx(coverage(twenty, wheel), (20 * 5.625) / 360.0, 1e-12, "twenty gates");
        const both = coverage(twenty, wheel, true);
        assert(coverage(twenty, wheel) < both && both <= 2 * coverage(twenty, wheel),
          "partner coverage bounds");
        const pair = [41, partnerOf(41, wheel)];
        assert(coverage(pair, wheel, true) === coverage(pair, wheel),
          "partner pair double-counted");
        for (let g = 1; g <= 64; g++) {
          const p = partnerOf(g, wheel);
          assert(p !== g && partnerOf(p, wheel) === g, `partner symmetry at ${g}`);
          const row = hexagrams.find((h) => h.id === g);
          if (row && row.programming_partner_id != null) {
            assert(row.programming_partner_id === p,
              `gate ${g}: field ${row.programming_partner_id}, wheel ${p}`);
          }
        }
        return "dwell, exact coverage, no double count, 64/64 partner agreement";
      },
    },
    {
      id: "true-node",
      name: "True node stays near the mean node and drifts backward",
      run() {
        const instants = [
          EPOCH, Date.UTC(2000, 2, 15), Date.UTC(1988, 7, 8), Date.UTC(2033, 10, 11),
        ];
        for (const ms of instants) {
          const d = Math.abs(circularDiff(trueNodeLongitude(ms), meanNodeLongitude(ms)));
          assert(d <= 1.9, `true node ${d.toFixed(3)} deg from mean at ${ms}`);
        }
        // Over 200 days the +-1.75 deg osculation cancels and the mean rate
        // (-0.0530 deg/day) dominates: expect about -10.6 deg, wide band.
        const drift = circularDiff(trueNodeLongitude(EPOCH + 200 * DAY), trueNodeLongitude(EPOCH));
        assert(drift < -7.0 && drift > -14.2, `node drift over 200 days: ${drift.toFixed(2)}`);
        return "within 1.9 deg of mean at 4 instants; retrograde drift over 200 days";
      },
    },
    {
      id: "design-moment",
      name: "Design moment sits 88.0 degrees of solar arc before birth",
      run() {
        const birth = EPOCH; // synthetic instant, not a person
        const design = designMoment(birth);
        const arc = norm360(bodyLongitude("Sun", birth) - bodyLongitude("Sun", design));
        approx(arc, 88.0, 0.001, "solar arc at design moment");
        const daysBack = (birth - design) / DAY;
        assert(daysBack > 80 && daysBack < 100, `design ${daysBack.toFixed(1)} days back`);
        assert(parseDerivation("Personality Sun").body === "Sun", "derivation parse");
        assert(parseDerivation("Design Moon").moment === "design", "derivation parse");
        return `arc 88.000 deg, ${daysBack.toFixed(1)} days before the instant`;
      },
    },
    {
      id: "cross-validation",
      name: "Three synthetic instants match gate_transit.py exactly",
      run() {
        // Pinned from: python examples/gate_transit.py <instant>  at commit 09d9086.
        // Synthetic instants, not anyone's birth.
        const pinned = [
          { iso: "2026-01-01T00:00:00Z", lon: 280.568, gate: 38, line: 2 },
          { iso: "1988-08-08T08:08:00Z", lon: 135.990, gate: 7, line: 3 },
          { iso: "2033-11-11T11:11:00Z", lon: 229.373, gate: 43, line: 1 },
        ];
        for (const p of pinned) {
          const ms = Date.parse(p.iso);
          const lon = meeusSunLongitude(ms);
          approx(lon, p.lon, 0.0005, `Meeus longitude at ${p.iso}`);
          const r = gateOfLongitude(lon, wheel);
          assert(r.gate === p.gate && r.line === p.line,
            `${p.iso}: got ${r.gate}.${r.line}, pinned ${p.gate}.${p.line}`);
          const engine = bodyLongitude("Sun", ms);
          assert(Math.abs(circularDiff(engine, lon)) <= 0.05,
            `engine vs Meeus at ${p.iso}: ${engine} vs ${lon}`);
        }
        return "3/3 gate.line equal; engine within 0.05 deg of the series";
      },
    },
    {
      id: "ics",
      name: "ICS folding, escaping, UID stability, DTEND exclusive",
      run() {
        const summary = "Sun in gate 41 (anchor case, line 1) " + "☯é≈".repeat(40);
        const desc = "one, two; three\nfour \\ five";
        const ev = ICS.allDayEvent({
          uid: "gk-sun-gate-41@example.invalid",
          summary, description: desc,
          url: "https://genekeys.com",
          startDayMs: Date.UTC(2026, 4, 3), endDayMsExclusive: Date.UTC(2026, 4, 9),
          rrule: "FREQ=YEARLY", alarm: "-P1D",
          dtstampMs: EPOCH, sequence: 20260101,
        });
        const cal = ICS.calendar({ name: "test", events: [ev] });
        assert(cal.includes("\r\n"), "CRLF endings");
        const encoder = new TextEncoder();
        for (const line of cal.split("\r\n")) {
          assert(encoder.encode(line).length <= 75, `line over 75 octets: ${line.length} chars`);
        }
        const parsed = ICS.parse(cal);
        assert(parsed.length === 1, "one event parsed");
        assert(ICS.unescapeText(parsed[0].SUMMARY) === summary, "summary round-trip");
        assert(ICS.unescapeText(parsed[0].DESCRIPTION) === desc, "description round-trip");
        assert(parsed[0].DTSTART === "20260503" && parsed[0].DTEND === "20260509",
          "all-day DTSTART/DTEND, end exclusive");
        assert(parsed[0].UID === "gk-sun-gate-41@example.invalid", "UID survived folding");
        assert(!("ACTION" in parsed[0]) && !("TRIGGER" in parsed[0]),
          "VALARM properties leaked onto the event");
        const again = ICS.calendar({ name: "test", events: [ICS.allDayEvent({
          uid: "gk-sun-gate-41@example.invalid", summary, description: desc,
          url: "https://genekeys.com",
          startDayMs: Date.UTC(2026, 4, 3), endDayMsExclusive: Date.UTC(2026, 4, 9),
          rrule: "FREQ=YEARLY", alarm: "-P1D", dtstampMs: EPOCH, sequence: 20260101,
        })] });
        assert(again === cal, "same inputs, same bytes");
        return "75-octet UTF-8-safe folding, escape round-trip, stable output";
      },
    },
    {
      id: "timezone",
      name: "DST gap, ambiguity, pre-1970, fixed offset",
      run() {
        // Spring forward, America/New_York 2026-03-08: 02:30 never happened.
        let r = zonedToUtc(2026, 3, 8, 2, 30, "America/New_York");
        assert(r.status === "nonexistent", `gap status: ${r.status}`);
        assert(r.utcMs === Date.UTC(2026, 2, 8, 7, 30), `gap resolved to ${r.utcMs}`);
        // Fall back, 2026-11-01: 01:30 happened twice; take the earlier (EDT).
        r = zonedToUtc(2026, 11, 1, 1, 30, "America/New_York");
        assert(r.status === "ambiguous-earlier", `ambiguity status: ${r.status}`);
        assert(r.utcMs === Date.UTC(2026, 10, 1, 5, 30), `ambiguity resolved to ${r.utcMs}`);
        // Pre-1970: New York observed DST in June 1955, so noon was 16:00 UTC.
        r = zonedToUtc(1955, 6, 15, 12, 0, "America/New_York");
        assert(r.status === "ok" && r.utcMs === Date.UTC(1955, 5, 15, 16, 0),
          `pre-1970: ${r.status} ${r.utcMs}`);
        // A plain unambiguous time.
        r = zonedToUtc(2026, 1, 15, 9, 0, "Asia/Tokyo");
        assert(r.status === "ok" && r.utcMs === Date.UTC(2026, 0, 15, 0, 0), "Tokyo 9am");
        // A zone Intl.supportedValuesOf omits but Intl.DateTimeFormat accepts.
        // 807 cities in the vendored list carry names like this one.
        r = zonedToUtc(2000, 1, 1, 12, 0, "Asia/Kolkata");
        assert(r.status === "ok" && r.utcMs === Date.UTC(2000, 0, 1, 6, 30),
          `Kolkata noon: ${r.status} ${r.utcMs}`);
        // Fixed offset bypasses the zone database entirely.
        r = offsetToUtc(2000, 1, 1, 12, 0, 330);
        assert(r.utcMs === Date.UTC(2000, 0, 1, 6, 30), "+05:30 offset");
        return "gap, ambiguity (earlier), 1955 DST, Tokyo, Kolkata, +05:30";
      },
    },
    {
      id: "timezone-folds",
      name: "Fall-back folds wider than an hour resolve to the earlier instant",
      run() {
        // Antarctica/Troll drops two hours at once, so 01:30 happened twice
        // and the fixed-delta probe this replaced reported the later instant
        // as unambiguous.
        let r = zonedToUtc(2024, 10, 27, 1, 30, "Antarctica/Troll");
        assert(r.status === "ambiguous-earlier", `Troll status: ${r.status}`);
        assert(r.utcMs === Date.UTC(2024, 9, 26, 23, 30),
          `Troll resolved to ${new Date(r.utcMs).toISOString()}`);
        // A 90-minute fold: Asia/Jakarta went +09 to +07:30 in 1945.
        r = zonedToUtc(1945, 9, 22, 23, 30, "Asia/Jakarta");
        assert(r.status === "ambiguous-earlier", `Jakarta status: ${r.status}`);
        assert(r.utcMs === Date.UTC(1945, 8, 22, 14, 30),
          `Jakarta resolved to ${new Date(r.utcMs).toISOString()}`);
        // An unambiguous time in the same zone stays unambiguous.
        r = zonedToUtc(1945, 9, 20, 23, 30, "Asia/Jakarta");
        assert(r.status === "ok", `Jakarta control: ${r.status}`);
        return "2-hour and 90-minute folds both resolve earlier; control stays ok";
      },
    },
    {
      id: "offset-validation",
      name: "Impossible UTC offsets are rejected",
      run() {
        assert(parseOffset("+05:30") === 330, "+05:30");
        assert(parseOffset("-04:00") === -240, "-04:00");
        assert(parseOffset("+0530") === 330, "colonless form");
        assert(parseOffset("+14:00") === 840, "+14:00 is the real maximum");
        for (const bad of ["+90:00", "+05:75", "-15:00", "+5:3", "", "noon"]) {
          assert(parseOffset(bad) === null, `should reject ${bad || "(empty)"}`);
        }
        return "valid offsets parse; hours over 14 and minutes over 59 rejected";
      },
    },
    {
      id: "export-cut",
      name: "Yearly anchors avoid Feb 29 and clamped edges export no boundary",
      run() {
        const host = "example.invalid";
        const cut = buildCut({
          sunWindows: [
            // 2028 is a leap year, so this window really does start Feb 29.
            { gate: wheel.anchorGate, start: Date.UTC(2028, 1, 29), end: Date.UTC(2028, 2, 5) },
            { gate: wheel.order[1], start: Date.UTC(2028, 4, 3), end: Date.UTC(2028, 4, 9) },
          ],
          seasons: [{
            body: "Jupiter", gate: wheel.anchorGate, kind: "both",
            start: EPOCH + 10 * DAY, end: EPOCH + 3650 * DAY, contacts: 3,
            clamped_start: false, clamped_end: true,
          }],
          spheres: [], wheel, host, nowMs: EPOCH,
        });
        const events = ICS.parse(cut.ics);
        const yearly = events.filter((e) => e.RRULE === "FREQ=YEARLY");
        assert(yearly.length === 2, `expected 2 yearly events, got ${yearly.length}`);
        assert(yearly[0].DTSTART === "20280228",
          `Feb 29 anchor should shift to Feb 28, got ${yearly[0].DTSTART}`);
        assert(yearly[0].DTEND === "20280306", `DTEND unchanged, got ${yearly[0].DTEND}`);
        assert(yearly[1].DTSTART === "20280503", "a non-leap-day anchor is untouched");
        assert(cut.preview[0].gcalUrl.includes("dates=20280228%2F20280306"),
          "the Google template link carries the same shifted anchor");
        // The season's end is the ten-year horizon, not a date the sky
        // crosses, so only its start becomes an event.
        const boundaries = events.filter((e) => e.SUMMARY.includes("season"));
        assert(boundaries.length === 1, `expected 1 boundary, got ${boundaries.length}`);
        assert(boundaries[0].SUMMARY.includes("begins"), "the clamped end leaked out");
        assert(boundaries[0].SUMMARY.includes("its own natal gate too"),
          "kind 'both' should be phrased, not silently dropped");
        return "Feb 29 anchor shifted, DTEND kept, clamped end suppressed, 'both' phrased";
      },
    },
    {
      id: "window-guards",
      name: "A missing sampling step throws instead of looping forever",
      run() {
        for (const step of [undefined, NaN, 0, -1]) {
          let threw = false;
          try {
            gateWindows(ramp(1, 0), [wheel.anchorGate], EPOCH, EPOCH + DAY, step, wheel);
          } catch {
            threw = true;
          }
          assert(threw, `step ${String(step)} should throw`);
        }
        for (const rate of [undefined, NaN, 0, -1]) {
          let threw = false;
          try {
            maxStep(rate, wheel);
          } catch {
            threw = true;
          }
          assert(threw, `maxStep(${String(rate)}) should throw`);
        }
        return "undefined, NaN, 0, and negative all rejected by both guards";
      },
    },
    {
      id: "store",
      name: "Storage round-trip with synthetic values",
      run() {
        if (typeof localStorage === "undefined") return "skipped: no localStorage";
        const before = localStorage.getItem(Store.KEY);
        try {
          // Synthetic values only; the wheel's epoch, nobody's birth.
          const state = Store.emptyState();
          state.birth = {
            date: "2026-01-01", time: "00:00", timeKnown: true,
            tzMode: "iana", tz: "UTC", offsetMinutes: null,
            place: null, utcMs: EPOCH,
          };
          Store.save(state);
          const loaded = Store.load();
          assert(loaded && loaded.birth.utcMs === EPOCH, "load after save");
          const round = Store.importJSON(Store.exportJSON(loaded));
          assert(JSON.stringify(round) === JSON.stringify(loaded), "export/import identity");
          Store.clear();
          assert(Store.load() === null, "clear removes state");
          return "save, load, export, import, clear";
        } finally {
          if (before === null) localStorage.removeItem(Store.KEY);
          else localStorage.setItem(Store.KEY, before);
        }
      },
    },
    {
      id: "network",
      name: "No requests beyond same-origin assets",
      run() {
        if (typeof performance === "undefined" || !performance.getEntriesByType) {
          return "skipped: no performance API";
        }
        const foreign = performance.getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => !u.startsWith(location.origin));
        assert(foreign.length === 0, `foreign requests: ${foreign.join(", ")}`);
        return "all resource fetches are same-origin";
      },
    },
  ];
}
