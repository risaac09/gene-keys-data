// Boot, verification, routing, and the computation context the views share.

import { loadWheel } from "./engine/wheel.js";
import {
  longitudeFn, verifyEphemeris, TRANSIT_BODIES,
  DATE_MIN_MS, DATE_MAX_MS,
} from "./engine/astro.js";
import { natalChart, sphereJoin, sphereGates, DESIGN_LOOKBACK_MS } from "./engine/chart.js";
import { gateWindows, SAMPLING_STEP_MS, GROUP_GAP_MS } from "./engine/windows.js";
import { coverage, SLOW_BODIES } from "./engine/seasons.js";
import { makeNowStates } from "./now.js";
import * as Store from "./store.js";
import { renderBirthForm } from "./ui-birth.js";
import { renderRhythm } from "./ui-rhythm.js";
import { renderSeasons } from "./ui-seasons.js";
import { renderExplore } from "./ui-explore.js";
import { renderNow } from "./ui-now.js";
import { percent } from "./fmt.js";
import { download } from "./dom.js";

const DAY = 86400000;
const YEAR = 365.25 * DAY;

// A birth instant needs the design moment behind it, so the usable range
// starts later than the ephemeris does. The date input advertises the same
// floor, and the message below names the real reason rather than the range.
const BIRTH_MIN_MS = DATE_MIN_MS + DESIGN_LOOKBACK_MS;
const BIRTH_MAX_MS = DATE_MAX_MS;
const BIRTH_RANGE_MESSAGE =
  "That birth instant is outside what this app can compute. The design moment "
  + "sits about 100 days before birth, and the vendored ephemeris starts "
  + "1900-01-01 and ends 2100-01-01, so births from 1900-04-15 onward work.";

// Derived lists are expensive and pinned to the clock they were built from.
// A PWA can sit open for days, so rebuild anything older than this.
const CACHE_TTL_MS = 6 * 3600000;

function birthRangeError(utcMs) {
  if (typeof utcMs !== "number" || !Number.isFinite(utcMs)) {
    return "That file has no usable birth instant.";
  }
  if (utcMs < BIRTH_MIN_MS || utcMs > BIRTH_MAX_MS) return BIRTH_RANGE_MESSAGE;
  return null;
}

const main = document.getElementById("main");
const viewEl = document.getElementById("view");
const tabsEl = document.getElementById("tabs");
const stanceEl = document.getElementById("stance");
const bannerEl = document.getElementById("banners");
const stripEl = document.getElementById("chart-strip");
const panel = document.getElementById("edit-panel");
const backdrop = document.getElementById("backdrop");

let wheel = null;
let sequences = null;
let state = null;
let ctx = null;
let teardown = null;

function failPanel(title, rows) {
  main.innerHTML = "";
  const div = document.createElement("div");
  div.className = "error";
  const h = document.createElement("p");
  h.textContent = `${title} The app will not show results it cannot stand behind.`;
  div.appendChild(h);
  if (rows && rows.length) {
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Check</th><th>Expected</th><th>Actual</th><th>Tolerance</th></tr></thead>";
    const tbody = document.createElement("tbody");
    for (const c of rows) {
      const tr = document.createElement("tr");
      for (const v of [c.name, c.expected, c.actual, c.tol]) {
        const td = document.createElement("td");
        td.textContent = typeof v === "number" ? v.toFixed(4) : String(v);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    div.appendChild(table);
  }
  const p = document.createElement("p");
  p.innerHTML = 'Diagnostics: <a href="selftest.html">selftest</a>.';
  div.appendChild(p);
  main.appendChild(div);
  return div;
}

function recoveryPanel(error) {
  // Stored data the renderer cannot use would otherwise crash-loop at
  // "Loading…" with the edit panel out of reach, so the way out is a button
  // and not a devtools session.
  const div = failPanel(`Could not render the stored chart: ${error.message}.`);
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Clear stored data";
  btn.addEventListener("click", () => {
    Store.clear();
    location.reload();
  });
  div.appendChild(btn);
}

function timeSensitiveNote() {
  const moonSpheres = [];
  for (const seq of sequences) {
    for (const s of seq.spheres) {
      if (s.derivation.endsWith(" Moon")) moonSpheres.push(s.name);
    }
  }
  const list = moonSpheres.length ? ` (${moonSpheres.join(", ")})` : "";
  return `Moon-derived spheres${list} can be off: the Moon moves about one line every two hours. Sun-derived spheres barely move in a day.`;
}

function buildCtx() {
  const chart = natalChart(state.birth.utcMs, wheel);
  const spheres = sphereJoin(chart, sequences);
  const gates = sphereGates(spheres);
  const gateSet = new Set(gates);
  const cache = {};

  const stale = (entry) => !entry || Date.now() - entry.builtAt > CACHE_TTL_MS;

  const natalGatesOf = (body) => {
    const set = new Set();
    for (const p of [...chart.personality, ...chart.design]) {
      if (p.body === body) set.add(p.gate);
    }
    return set;
  };

  return {
    wheel, sequences, chart, spheres,
    gates: gateSet,
    coverageConj: coverage(gates, wheel, false),
    coverageBoth: coverage(gates, wheel, true),
    timeKnown: state.birth.timeKnown,

    sunWindows() {
      if (stale(cache.sun)) {
        const now = Date.now();
        cache.sun = {
          builtAt: now,
          value: gateWindows(longitudeFn("Sun"), gates,
            now - 10 * DAY, now + 370 * DAY, SAMPLING_STEP_MS.Sun, wheel)
            .filter((w) => w.end >= now),
        };
      }
      return cache.sun.value;
    },

    seasons() {
      if (stale(cache.seasons)) {
        const now = Date.now();
        const out = [];
        for (const body of SLOW_BODIES) {
          const natal = natalGatesOf(body);
          const watch = new Set([...gates, ...natal]);
          const from = Math.max(now - 6 * YEAR, DATE_MIN_MS);
          const to = Math.min(now + 10 * YEAR, DATE_MAX_MS);
          const passages = gateWindows(longitudeFn(body), [...watch], from, to,
            SAMPLING_STEP_MS[body], wheel, { passageGapMs: GROUP_GAP_MS[body] });
          for (const p of passages) {
            if (p.end < now) continue;
            const inSphere = gateSet.has(p.gate);
            const inNatal = natal.has(p.gate);
            out.push({
              body, gate: p.gate, start: p.start, end: p.end,
              contacts: p.contacts,
              // Carried through: a clamped edge is the ten-year horizon, not
              // a date the season actually starts or ends on.
              clamped_start: p.clamped_start,
              clamped_end: p.clamped_end,
              kind: inSphere && inNatal ? "both" : inNatal ? "return" : "sphere",
            });
          }
        }
        out.sort((a, b) => a.start - b.start);
        cache.seasons = { builtAt: now, value: out };
      }
      return cache.seasons.value;
    },

    exploreWindows(body, watchGates) {
      const now = Date.now();
      const spans = {
        Moon: [2 * DAY, 90 * DAY], Sun: [60 * DAY, 2 * YEAR],
        Mercury: [60 * DAY, 2 * YEAR], Venus: [90 * DAY, 2 * YEAR],
        Mars: [180 * DAY, 2 * YEAR],
      };
      const [back, ahead] = spans[body] || [2 * YEAR, 10 * YEAR];
      const from = Math.max(now - back, DATE_MIN_MS);
      const to = Math.min(now + ahead, DATE_MAX_MS);
      const windows = gateWindows(longitudeFn(body), watchGates, from, to,
        SAMPLING_STEP_MS[body], wheel,
        { passageGapMs: GROUP_GAP_MS[body] || null });
      return windows.filter((w) => w.end >= now);
    },

    // Caches the exit search only; gate and line come fresh on every tick.
    nowStates: makeNowStates(wheel, TRANSIT_BODIES, longitudeFn),
  };
}

const VIEWS = {
  rhythm: renderRhythm,
  seasons: renderSeasons,
  explore: renderExplore,
  now: renderNow,
};

function currentView() {
  const h = location.hash.replace("#", "");
  return VIEWS[h] ? h : "rhythm";
}

function renderTabs() {
  tabsEl.innerHTML = "";
  const active = currentView();
  for (const [key, label] of [
    ["rhythm", "Rhythm"], ["seasons", "Seasons"], ["explore", "Explore"], ["now", "Now"],
  ]) {
    const a = document.createElement("a");
    a.href = `#${key}`;
    a.textContent = label;
    if (key === active) a.className = "active";
    tabsEl.appendChild(a);
  }
}

function renderStrip() {
  stripEl.innerHTML = "";
  const chips = document.createElement("div");
  chips.className = "chips";
  for (const s of ctx.spheres) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${s.gate}.${s.line} <span class="muted">· ${s.sphereName}</span>`;
    chip.title = `${s.sequenceName}, ${s.moment} ${s.body}`;
    chips.appendChild(chip);
  }
  const edit = document.createElement("a");
  edit.href = "#";
  edit.textContent = "edit birth data";
  edit.style.fontSize = "0.8rem";
  edit.style.color = "var(--ochre)";
  edit.addEventListener("click", (e) => { e.preventDefault(); openPanel(); });
  stripEl.append(chips, edit);
}

function renderBanners() {
  bannerEl.innerHTML = "";
  if (!ctx.timeKnown) {
    const div = document.createElement("div");
    div.className = "banner";
    div.textContent = `Birth time unknown; noon assumed. ${timeSensitiveNote()}`;
    bannerEl.appendChild(div);
  }
}

function runTeardown() {
  // Views own timers and deferred callbacks that write into the shared #view
  // element. Whatever the last one left running has to stop before the next
  // one draws, or a stale repaint lands on top of the new view.
  if (!teardown) return;
  const fn = teardown;
  teardown = null;
  try {
    fn();
  } catch {
    // A view that cannot clean up must not block the next one from drawing.
  }
}

function renderView() {
  runTeardown();
  renderTabs();
  teardown = VIEWS[currentView()](viewEl, ctx) || null;
}

function renderApp() {
  runTeardown();
  ctx = buildCtx();
  stanceEl.textContent =
    `This app tracks when, not what. Your chart's gates are lit ${percent(ctx.coverageConj)} of the year; meaning stays at genekeys.com.`;
  tabsEl.style.display = "";
  stripEl.style.display = "";
  renderStrip();
  renderBanners();
  renderView();
}

function renderAppGuarded() {
  try {
    renderApp();
  } catch (e) {
    recoveryPanel(e);
  }
}

function renderFirstRun() {
  runTeardown();
  tabsEl.style.display = "none";
  stripEl.style.display = "none";
  stanceEl.textContent = "This app tracks when, not what. Meaning stays at genekeys.com.";
  viewEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "notice";
  p.textContent = "Enter a birth moment to see its rhythm.";
  viewEl.appendChild(p);
  const holder = document.createElement("div");
  holder.className = "card";
  viewEl.appendChild(holder);
  renderBirthForm(holder, {
    existing: null,
    timeSensitiveNote: timeSensitiveNote(),
    onSave: saveBirth,
  });
}

function saveBirth(birth) {
  const rangeError = birthRangeError(birth.utcMs);
  if (rangeError) {
    alert(rangeError);
    return;
  }
  const previous = state.birth;
  state.birth = birth;
  try {
    Store.save(state);
  } catch (e) {
    state.birth = previous; // do not leave memory ahead of storage
    alert(e.message);
    return;
  }
  closePanel();
  renderAppGuarded();
}

function openPanel() {
  panel.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = "Birth data";
  panel.appendChild(h);
  const formHolder = document.createElement("div");
  panel.appendChild(formHolder);
  renderBirthForm(formHolder, {
    existing: state.birth,
    timeSensitiveNote: timeSensitiveNote(),
    onSave: saveBirth,
  });

  const dataH = document.createElement("h3");
  dataH.textContent = "Your data";
  const strip = document.createElement("div");
  strip.className = "toolbar";
  const exportBtn = document.createElement("button");
  exportBtn.className = "btn";
  exportBtn.textContent = "Export JSON";
  exportBtn.addEventListener("click", () => {
    download(Store.exportJSON(state), "application/json", "gene-keys-data-export.json");
  });
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const imported = Store.importJSON(await file.text());
      // Range-check before anything is written. An out-of-range instant
      // stored here would crash the renderer on this load and every load
      // after it, with the edit panel behind the crash.
      if (imported.birth) {
        const rangeError = birthRangeError(imported.birth.utcMs);
        if (rangeError) throw new Error(rangeError);
      }
      if (!confirm("Replace the stored birth data with this file?")) return;
      state = imported;
      Store.save(state);
      closePanel();
      if (state.birth) renderAppGuarded(); else renderFirstRun();
    } catch (e) {
      alert(`Could not import: ${e.message}`);
    } finally {
      // Cleared so picking the same file again still fires a change event.
      importInput.value = "";
    }
  });
  const importBtn = document.createElement("button");
  importBtn.className = "btn";
  importBtn.textContent = "Import JSON";
  importBtn.addEventListener("click", () => importInput.click());
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn subtle";
  clearBtn.textContent = "Clear data";
  clearBtn.addEventListener("click", () => {
    if (!confirm("Remove the stored birth data from this browser?")) return;
    Store.clear();
    state = Store.emptyState();
    closePanel();
    renderFirstRun();
  });
  strip.append(exportBtn, importBtn, clearBtn, importInput);
  panel.append(dataH, strip);

  const close = document.createElement("button");
  close.className = "btn subtle";
  close.textContent = "Close";
  close.style.marginTop = "1rem";
  close.addEventListener("click", closePanel);
  panel.appendChild(close);

  panel.classList.add("open");
  backdrop.classList.add("show");
}

function closePanel() {
  panel.classList.remove("open");
  backdrop.classList.remove("show");
}

async function boot() {
  if (typeof window.Astronomy === "undefined") {
    failPanel("The vendored ephemeris failed to load.");
    return;
  }
  try {
    // Only what the app reads. hexagrams.json is the selftest's business and
    // is fetched there; requiring it here made a 404 on an unused file fatal.
    const [w, a, v, p] = await Promise.all([
      fetch("../data/gate-wheel.json"),
      fetch("../data/sequences/activation.json"), fetch("../data/sequences/venus.json"),
      fetch("../data/sequences/pearl.json"),
    ]);
    for (const r of [w, a, v, p]) {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }
    wheel = loadWheel(await w.json());
    sequences = [await a.json(), await v.json(), await p.json()];
  } catch (e) {
    failPanel(`Could not load the dataset: ${e.message}.`);
    return;
  }

  const verdict = verifyEphemeris(Date.now());
  if (!verdict.ok) {
    failPanel("Ephemeris verification failed; results would be unreliable.", verdict.checks);
    return;
  }

  state = Store.load() || Store.emptyState();
  backdrop.addEventListener("click", closePanel);
  window.addEventListener("hashchange", () => {
    if (!state.birth) return;
    try {
      renderView();
    } catch (e) {
      recoveryPanel(e);
    }
  });

  if (state.birth) renderAppGuarded();
  else renderFirstRun();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Offline install is a nicety; the app works without it.
    });
  }
}

boot();
