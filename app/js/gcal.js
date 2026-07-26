// Google Calendar template links for people who will not import a file.
// A link leaves the device only when clicked; nothing is prefetched.

import { yyyymmddUTC as dateBasic } from "./fmt.js";

export function templateLink({ summary, description, startDayMs, endDayMsExclusive, yearly }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${dateBasic(startDayMs)}/${dateBasic(endDayMsExclusive)}`,
    details: description || "",
  });
  if (yearly) params.set("recur", "RRULE:FREQ=YEARLY");
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
