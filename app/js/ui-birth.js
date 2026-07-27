// Birth input: date, local time, place for timezone only. Shows the computed
// UTC instant back before calculating, and lets the user correct it.

import { loadCities, searchCities, cityLabel } from "./cities.js";
import { zonedToUtc, offsetToUtc, ianaZones } from "./tz.js";
import { utcStamp } from "./fmt.js";
import { el, labelFor } from "./dom.js";

// The date input's floor: the design moment needs about 100 days of ephemeris
// behind the birth instant, so the usable range starts later than 1900-01-01.
const DATE_INPUT_MIN = "1900-04-15";
const DATE_INPUT_MAX = "2099-12-31";

export function parseOffset(text) {
  // Null for anything that is not a real UTC offset. The shape check alone
  // lets through +90:00 and +05:75, which parse to plausible-looking minute
  // counts and silently move the birth instant.
  const m = String(text).trim().match(/^([+-])(\d{1,2}):?(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[2], 10);
  const mins = parseInt(m[3], 10);
  if (hours > 14 || mins > 59) return null;
  return (m[1] === "-" ? -1 : 1) * (hours * 60 + mins);
}

function ensureZoneOption(select, zone) {
  // Intl.supportedValuesOf omits a number of current IANA names that
  // Intl.DateTimeFormat itself accepts (Asia/Kolkata and Europe/Kyiv among
  // them), so a city can carry a zone the select has no option for. Assigning
  // an absent value silently resets the select to "", which reads as "no
  // timezone picked" and dead-ends the form.
  if (!zone) return;
  for (const option of select.options) {
    if (option.value === zone) return;
  }
  select.append(el("option", { value: zone }, zone));
}

export function renderBirthForm(container, { existing, timeSensitiveNote, onSave }) {
  container.innerHTML = "";
  const b = existing || {};

  const dateInput = el("input", { type: "date", value: b.date || "", min: DATE_INPUT_MIN, max: DATE_INPUT_MAX });
  const timeInput = el("input", { type: "time", value: b.time || "" });
  const unknownTime = el("input", { type: "checkbox" });
  if (b.timeKnown === false) unknownTime.checked = true;

  const cityInput = el("input", { type: "text", placeholder: "City (for timezone only)", autocomplete: "off" });
  if (b.place) cityInput.value = b.place.name;
  const suggest = el("div", { class: "suggest-list", style: "display:none" });

  const tzSelect = el("select");
  tzSelect.append(el("option", { value: "" }, "Pick a timezone"));
  tzSelect.append(el("option", { value: "UTC" }, "UTC"));
  for (const z of ianaZones()) tzSelect.append(el("option", { value: z }, z));
  if (b.tz) {
    ensureZoneOption(tzSelect, b.tz);
    tzSelect.value = b.tz;
  }

  const offsetInput = el("input", { type: "text", placeholder: "+05:30" });
  if (b.tzMode === "offset" && b.offsetMinutes != null) {
    const sign = b.offsetMinutes < 0 ? "-" : "+";
    const abs = Math.abs(b.offsetMinutes);
    offsetInput.value = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  }

  const warnings = el("div");
  const confirmBox = el("div", { class: "card", style: "display:none" });
  const utcField = el("input", { type: "datetime-local", step: "60" });
  let place = b.place || null;

  cityInput.addEventListener("input", async () => {
    try {
      await loadCities();
    } catch (e) {
      suggest.innerHTML = "";
      suggest.style.display = "block";
      suggest.append(el("div", { class: "error" },
        `City list unavailable (${e.message}). Pick a timezone below instead.`));
      return;
    }
    const results = searchCities(cityInput.value);
    suggest.innerHTML = "";
    suggest.style.display = results.length ? "block" : "none";
    for (const row of results) {
      const item = el("div", {}, cityLabel(row));
      // pointerdown, not click: the blur handler hides this list on a 200 ms
      // timer, and a click can land after it.
      item.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        cityInput.value = row[0];
        ensureZoneOption(tzSelect, row[3]);
        tzSelect.value = row[3];
        place = { name: row[0], admin1: row[2], country: row[1] };
        suggest.style.display = "none";
        invalidatePending();
      });
      suggest.append(item);
    }
  });
  cityInput.addEventListener("blur", () => setTimeout(() => { suggest.style.display = "none"; }, 200));

  function compute() {
    warnings.innerHTML = "";
    if (!dateInput.value) {
      warnings.append(el("div", { class: "error" }, "Enter a birth date."));
      return null;
    }
    let time = timeInput.value;
    if (unknownTime.checked || !time) {
      time = "12:00";
      warnings.append(el("div", { class: "banner" },
        `Birth time unknown; noon assumed. ${timeSensitiveNote}`));
    }
    const [y, mo, d] = dateInput.value.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);

    const offsetText = offsetInput.value.trim();
    let result;
    let tzMode;
    let tz = null;
    let offsetMinutes = null;
    if (offsetText) {
      offsetMinutes = parseOffset(offsetText);
      if (offsetMinutes === null) {
        warnings.append(el("div", { class: "error" }, "Offset must look like +05:30 or -04:00."));
        return null;
      }
      tzMode = "offset";
      result = offsetToUtc(y, mo, d, h, mi, offsetMinutes);
      warnings.append(el("div", { class: "notice" },
        "Fixed offset in use. This skips historical daylight-saving rules."));
    } else {
      tz = tzSelect.value;
      if (!tz) {
        warnings.append(el("div", { class: "error" },
          "Pick a city or a timezone, or enter a UTC offset."));
        return null;
      }
      tzMode = place && tzSelect.value ? "city" : "iana";
      result = zonedToUtc(y, mo, d, h, mi, tz);
      if (result.status === "nonexistent") {
        warnings.append(el("div", { class: "banner" },
          `${time} did not exist in ${tz} that day. Clocks jumped over it. Using the next existing wall time; correct the UTC below if needed.`));
      } else if (result.status === "ambiguous-earlier") {
        warnings.append(el("div", { class: "banner" },
          `${time} happened twice in ${tz} that night. Using the first one. Change the UTC below if you were born in the second hour.`));
      }
    }
    return {
      utcMs: result.utcMs,
      birth: {
        date: dateInput.value,
        time,
        timeKnown: !(unknownTime.checked || !timeInput.value),
        tzMode, tz, offsetMinutes, place,
      },
    };
  }

  // The snapshot taken by "Show the UTC instant". Any later edit to the form
  // has to void it, or "Calculate the chart" would quietly save the old one.
  let pending = null;

  function invalidatePending() {
    pending = null;
    confirmBox.style.display = "none";
  }

  for (const node of [dateInput, timeInput, unknownTime, tzSelect, offsetInput, cityInput]) {
    node.addEventListener("input", invalidatePending);
    node.addEventListener("change", invalidatePending);
  }

  const showBtn = el("button", { class: "btn primary" }, "Show the UTC instant");
  showBtn.addEventListener("click", () => {
    pending = compute();
    if (!pending) { confirmBox.style.display = "none"; return; }
    const d = new Date(pending.utcMs);
    const p = (n) => String(n).padStart(2, "0");
    utcField.value = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
    confirmBox.style.display = "block";
    utcLine.textContent = `Computed birth instant: ${utcStamp(pending.utcMs)}. Correct it here if it is off, then calculate.`;
  });

  const utcLine = el("p", { class: "notice" });
  const calcBtn = el("button", { class: "btn primary" }, "Calculate the chart");
  calcBtn.addEventListener("click", () => {
    if (!pending) return;
    warnings.innerHTML = "";
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(utcField.value.trim());
    if (!m) {
      warnings.append(el("div", { class: "error" },
        "Enter the birth instant as YYYY-MM-DDTHH:MM, for example 1990-07-04T15:20."));
      return;
    }
    const [y, mo, d, h, mi] = m.slice(1, 6).map(Number);
    // Checked on the parsed year, not on what Date.UTC makes of it: Date.UTC
    // maps years 0 to 99 onto 1900 to 1999, so "0026" would become 1926.
    if (y < 1900 || y > 2100) {
      warnings.append(el("div", { class: "error" },
        `The year must be between 1900 and 2100. Got ${y}.`));
      return;
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) {
      warnings.append(el("div", { class: "error" }, "That is not a real date and time."));
      return;
    }
    const utcMs = Date.UTC(y, mo - 1, d, h, mi);
    onSave({ ...pending.birth, utcMs });
  });
  confirmBox.append(utcLine, el("div", { class: "field-grid" },
    el("div", {}, labelFor(utcField, "Birth instant, UTC"), utcField)),
    calcBtn);

  container.append(
    el("p", { class: "notice" },
      "Your birth data stays in this browser. Nothing is sent anywhere. No analytics, no server."),
    el("div", { class: "field-grid" },
      el("div", {}, labelFor(dateInput, "Birth date"), dateInput),
      el("div", {}, labelFor(timeInput, "Local time"), timeInput),
      el("div", {}, labelFor(unknownTime, "Time unknown"), unknownTime),
    ),
    el("div", { class: "field-grid" },
      el("div", { class: "suggest" }, labelFor(cityInput, "Place"), cityInput, suggest),
      el("div", {}, labelFor(tzSelect, "Timezone (always overridable)"), tzSelect),
    ),
    el("details", {},
      el("summary", {}, "Timezone not listed or historically wrong? Enter a fixed UTC offset."),
      el("div", { style: "margin-top:0.5rem" }, labelFor(offsetInput, "UTC offset"), offsetInput)),
    el("p", { class: "notice" }, "Place sets the timezone and nothing else. City list: GeoNames, CC BY 4.0."),
    el("div", { class: "toolbar", style: "margin-top:0.75rem" }, showBtn),
    warnings,
    confirmBox,
  );
}
