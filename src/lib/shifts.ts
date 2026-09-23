import { useEffect, useState } from "react";

export type Template = { id: string; name: string; start: string; end: string; breakMin: number };
export type Shift = { id: string; date: string; start: string; end: string; breakMin: number; note?: string };
export type Rate = { id: string; from: string; rate: number };
export type Data = { workplace: string; currency: string; templates: Template[]; shifts: Shift[]; rates: Rate[] };

const KEY = "shift-control-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);

const defaults: Data = {
  workplace: "My Workplace",
  currency: "$",
  templates: [
    { id: uid(), name: "Morning", start: "06:00", end: "15:00", breakMin: 0 },
    { id: uid(), name: "Day", start: "07:30", end: "16:30", breakMin: 0 },
  ],
  shifts: [],
  rates: [],
};

export function useData() {
  const [data, setData] = useState<Data>(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...defaults, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, ready]);
  return [data, setData, ready] as const;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function shiftHours(s: { start: string; end: string; breakMin: number }) {
  let d = toMin(s.end) - toMin(s.start);
  if (d <= 0) d += 1440;
  return Math.max(0, d - (s.breakMin || 0)) / 60;
}

export function rateFor(date: string, rates: Rate[]) {
  const r = [...rates].filter((x) => x.from <= date).sort((a, b) => b.from.localeCompare(a.from))[0];
  return r?.rate ?? 0;
}

export const shiftPay = (s: Shift, rates: Rate[]) => shiftHours(s) * rateFor(s.date, rates);

export type Summary = { shifts: number; hours: number; pay: number };
export function summarize(list: Shift[], rates: Rate[]): Summary {
  return list.reduce(
    (a, s) => ({ shifts: a.shifts + 1, hours: a.hours + shiftHours(s), pay: a.pay + shiftPay(s, rates) }),
    { shifts: 0, hours: 0, pay: 0 },
  );
}

// ---------- ICS ----------
const icsDate = (date: string, time: string, addDay = false) => {
  const d = new Date(`${date}T${time}:00`);
  if (addDay) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
};

export function toICS(data: Data) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ShiftControl//EN", "CALSCALE:GREGORIAN"];
  for (const s of data.shifts) {
    const overnight = toMin(s.end) <= toMin(s.start);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@shiftcontrol`,
      `DTSTAMP:${icsDate(s.date, "00:00")}`,
      `DTSTART:${icsDate(s.date, s.start)}`,
      `DTEND:${icsDate(s.date, s.end, overnight)}`,
      `SUMMARY:Shift – ${data.workplace}`.replace(/[,;]/g, "\\$&"),
      `DESCRIPTION:${shiftHours(s).toFixed(2)}h${s.note ? " – " + s.note : ""}`.replace(/[,;]/g, "\\$&"),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function fromICS(text: string): Shift[] {
  const out: Shift[] = [];
  const events = text.replace(/\r\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1);
  for (const ev of events) {
    const get = (k: string) => ev.match(new RegExp(`^${k}[^:]*:(\\S+)`, "m"))?.[1];
    const s = get("DTSTART"), e = get("DTEND");
    if (!s || !e || s.length < 13) continue;
    const parse = (v: string) => {
      const d = v.endsWith("Z")
        ? new Date(Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(9, 11), +v.slice(11, 13)))
        : new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(9, 11), +v.slice(11, 13));
      const p = (n: number) => String(n).padStart(2, "0");
      return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
    };
    const a = parse(s), b = parse(e);
    const note = ev.match(/^SUMMARY:(.*)$/m)?.[1]?.trim();
    out.push({ id: uid(), date: a.date, start: a.time, end: b.time, breakMin: 0, note });
  }
  return out;
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
