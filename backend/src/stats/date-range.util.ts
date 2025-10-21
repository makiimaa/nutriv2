// src/stats/date-range.util.ts
const TZ_MINUTES = 7 * 60;

function toLocal(date = new Date()) {
  return new Date(date.getTime() + TZ_MINUTES * 60_000);
}
function toUTC(date: Date) {
  return new Date(date.getTime() - TZ_MINUTES * 60_000);
}

export function dayRangeBangkok(at: Date = new Date()) {
  const L = toLocal(at);
  const startLocal = new Date(
    L.getFullYear(),
    L.getMonth(),
    L.getDate(),
    0,
    0,
    0,
    0,
  );
  const endLocal = new Date(
    L.getFullYear(),
    L.getMonth(),
    L.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return { start: toUTC(startLocal), end: toUTC(endLocal) };
}

export function weekRangeBangkok(at: Date = new Date()) {
  const { start } = dayRangeBangkok(at);
  const dow = (start.getUTCDay() + 6) % 7; // Thứ 2 = 0
  const ws = new Date(start);
  ws.setUTCDate(ws.getUTCDate() - dow);
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 7);
  return { start: ws, end: we };
}

export function monthRangeBangkok(at: Date = new Date()) {
  const L = toLocal(at);
  const ms1 = new Date(L.getFullYear(), L.getMonth(), 1, 0, 0, 0, 0);
  const ms2 = new Date(L.getFullYear(), L.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start: toUTC(ms1), end: toUTC(ms2) };
}
