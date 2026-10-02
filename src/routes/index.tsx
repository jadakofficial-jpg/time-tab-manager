import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  type Data, type Shift, type Summary, uid, useData, shiftHours, shiftPay, summarize, rateFor, inPeriod, toICS, fromICS, download,
} from "@/lib/shifts";
import { useLang, weekdayShort, type Dict } from "@/lib/i18n";
import { Trash2, Pencil, Download, Upload, CalendarPlus, Sun, Moon, Languages } from "lucide-react";
import { useEffect } from "react";

function useTheme(): ["light" | "dark", () => void] {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <Button size="icon" variant="ghost" aria-label="Toggle dark mode" onClick={toggle}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function LangToggle({ lang, toggle }: { lang: "en" | "ru"; toggle: () => void }) {
  return (
    <Button size="sm" variant="ghost" aria-label="Switch language" onClick={toggle} className="gap-1.5">
      <Languages className="h-4 w-4" />
      {lang === "en" ? "RU" : "EN"}
    </Button>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shift Control — Shifts, Hours & Pay" },
      { name: "description", content: "Log shifts, track hourly rates and see pay for your custom pay periods." },
      { property: "og:title", content: "Shift Control — Shifts, Hours & Pay" },
      { property: "og:description", content: "Log shifts, track hourly rates and see pay-period reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

const today = () => new Date().toISOString().slice(0, 10);
const fmtH = (h: number) => `${h.toFixed(2)}h`;

function App() {
  const [data, setData, ready] = useData();
  const { lang, t, toggle, locale } = useLang();
  const money = (n: number) => `${data.currency}${n.toFixed(2)}`;
  if (!ready) return <div className="min-h-screen bg-background" />;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.appName}</h1>
            <p className="text-sm text-muted-foreground">{data.workplace}</p>
          </div>
          <div className="flex items-center gap-1">
            <LangToggle lang={lang} toggle={toggle} />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Tabs defaultValue="shifts">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="shifts">{t.tabShifts}</TabsTrigger>
            <TabsTrigger value="calendar">{t.tabCalendar}</TabsTrigger>
            <TabsTrigger value="report">{t.tabReport}</TabsTrigger>
            <TabsTrigger value="setup">{t.tabSetup}</TabsTrigger>
            <TabsTrigger value="data">{t.tabData}</TabsTrigger>
          </TabsList>
          <TabsContent value="shifts"><ShiftsTab data={data} setData={setData} money={money} t={t} locale={locale} /></TabsContent>
          <TabsContent value="calendar"><CalendarTab data={data} setData={setData} money={money} t={t} locale={locale} lang={lang} /></TabsContent>
          <TabsContent value="report"><ReportTab data={data} money={money} t={t} /></TabsContent>
          <TabsContent value="setup"><SetupTab data={data} setData={setData} money={money} t={t} /></TabsContent>
          <TabsContent value="data"><DataTab data={data} setData={setData} t={t} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type P = { data: Data; setData: (f: (d: Data) => Data) => void; money: (n: number) => string; t: Dict };

function ShiftsTab({ data, setData, money, t, locale }: P & { locale: string | undefined }) {
  const blank = { date: today(), start: "07:30", end: "16:30", breakMin: 0, note: "" };
  const [form, setForm] = useState<Omit<Shift, "id">>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [month, setMonth] = useState(today().slice(0, 7));

  const save = () => {
    if (!form.date) return;
    setData((d) => ({
      ...d,
      shifts: editId
        ? d.shifts.map((s) => (s.id === editId ? { ...form, id: editId } : s))
        : [...d.shifts, { ...form, id: uid() }],
    }));
    setEditId(null);
    setForm({ ...blank, date: form.date, start: form.start, end: form.end });
  };

  const list = data.shifts.filter((s) => s.date.startsWith(month)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  return (
    <div className="space-y-4 pt-4">
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {data.templates.map((tpl) => (
            <Button key={tpl.id} variant="secondary" size="sm" onClick={() => setForm((f) => ({ ...f, start: tpl.start, end: tpl.end, breakMin: tpl.breakMin }))}>
              {tpl.name} <span className="ml-1 text-muted-foreground">{tpl.start}–{tpl.end}</span>
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t.date}><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label={t.start}><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
          <Field label={t.end}><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
          <Field label={t.breakMin}><Input type="number" min={0} value={form.breakMin} onChange={(e) => setForm({ ...form, breakMin: +e.target.value })} /></Field>
        </div>
        <Field label={t.note}><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t.notePlaceholder} /></Field>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {fmtH(shiftHours(form))} × {money(rateFor(form.date, data.rates))}/h = <b className="text-foreground">{money(shiftHours(form) * rateFor(form.date, data.rates))}</b>
          </span>
          <div className="flex gap-2">
            {editId && <Button variant="ghost" onClick={() => { setEditId(null); setForm(blank); }}>{t.cancel}</Button>}
            <Button onClick={save}>{editId ? t.updateShift : t.addShift}</Button>
          </div>
        </div>
        {data.rates.length === 0 && <p className="text-sm text-destructive">{t.setRateHint}</p>}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t.shiftsHeading}</h2>
        <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">{t.noShiftsMonth}</p>}
      <div className="space-y-2">
        {list.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{new Date(s.date + "T00:00").toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}</div>
              <div className="text-sm text-muted-foreground">{s.start}–{s.end}{s.breakMin ? ` · ${t.breakSuffix(s.breakMin)}` : ""}{s.note ? ` · ${s.note}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-sm"><div className="font-semibold">{money(shiftPay(s, data.rates))}</div><div className="text-muted-foreground">{fmtH(shiftHours(s))}</div></div>
              <Button size="icon" variant="ghost" aria-label={t.edit} onClick={() => { setEditId(s.id); setForm({ date: s.date, start: s.start, end: s.end, breakMin: s.breakMin, note: s.note ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={t.delete} onClick={() => setData((d) => ({ ...d, shifts: d.shifts.filter((x) => x.id !== s.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Stat({ title, s, money, strong }: { title: string; s: Summary; money: (n: number) => string; strong?: boolean }) {
  return (
    <Card className={`p-4 ${strong ? "bg-primary text-primary-foreground" : ""}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
      <div className="text-2xl font-bold">{money(s.pay)}</div>
      <div className="text-sm opacity-70">{s.shifts} shifts · {fmtH(s.hours)}</div>
    </Card>
  );
}

function ReportTab({ data, money, t }: Omit<P, "setData">) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const m = data.shifts.filter((s) => s.date.startsWith(month));
  const periodSummaries = data.periods.map((p) => ({
    period: p,
    summary: summarize(m.filter((s) => inPeriod(+s.date.slice(8), p)), data.rates),
  }));
  const all = summarize(data.shifts, data.rates);
  const byMonth = useMemo(() => {
    const g: Record<string, Shift[]> = {};
    data.shifts.forEach((s) => (g[s.date.slice(0, 7)] ??= []).push(s));
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({
      k,
      periods: data.periods.map((p) => summarize(v.filter((s) => inPeriod(+s.date.slice(8), p)), data.rates)),
      total: summarize(v, data.rates),
    }));
  }, [data]);
  return (
    <div className="space-y-4 pt-4">
      <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {periodSummaries.map(({ period, summary }) => (
          <Stat key={period.id} title={period.label} s={summary} money={money} />
        ))}
        <Stat title={t.monthTotal} s={summarize(m, data.rates)} money={money} strong />
      </div>
      <Stat title={t.allTime} s={all} money={money} />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-3">{t.colMonth}</th>
              {data.periods.map((p) => <th key={p.id} className="p-3">{p.label}</th>)}
              <th className="p-3">{t.colTotal}</th>
              <th className="p-3">{t.colHours}</th>
            </tr>
          </thead>
          <tbody>
            {byMonth.map((r) => (
              <tr key={r.k} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{r.k}</td>
                {r.periods.map((s, i) => <td key={i} className="p-3">{money(s.pay)}</td>)}
                <td className="p-3 font-semibold">{money(r.total.pay)}</td>
                <td className="p-3">{fmtH(r.total.hours)}</td>
              </tr>
            ))}
            {byMonth.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={2 + data.periods.length}>{t.noDataYet}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SetupTab({ data, setData, money, t }: P) {
  const [rate, setRate] = useState({ from: today(), rate: "" });
  const [tpl, setTpl] = useState({ name: "", start: "06:00", end: "15:00", breakMin: 0 });
  const [editTpl, setEditTpl] = useState<string | null>(null);
  const [period, setPeriod] = useState({ label: "", startDay: "1", endDay: "15" });
  const [editPeriod, setEditPeriod] = useState<string | null>(null);
  return (
    <div className="space-y-4 pt-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label={t.workplace}><Input value={data.workplace} onChange={(e) => setData((d) => ({ ...d, workplace: e.target.value }))} /></Field>
        <Field label={t.currencySymbol}><Input value={data.currency} onChange={(e) => setData((d) => ({ ...d, currency: e.target.value }))} /></Field>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.rateHistory}</h2>
        <p className="text-sm text-muted-foreground">{t.rateHistoryHint}</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t.effectiveFrom}><Input type="date" value={rate.from} onChange={(e) => setRate({ ...rate, from: e.target.value })} /></Field>
          <Field label={t.ratePerHour}><Input type="number" step="0.01" value={rate.rate} onChange={(e) => setRate({ ...rate, rate: e.target.value })} /></Field>
          <Button onClick={() => { if (!rate.rate) return; setData((d) => ({ ...d, rates: [...d.rates.filter((r) => r.from !== rate.from), { id: uid(), from: rate.from, rate: +rate.rate }] })); setRate({ ...rate, rate: "" }); }}>{t.addRate}</Button>
        </div>
        {[...data.rates].sort((a, b) => b.from.localeCompare(a.from)).map((r) => (
          <div key={r.id} className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span>{t.fromDate(r.from)}</span>
            <span className="flex items-center gap-2 font-semibold">{money(r.rate)}/h
              <Button size="icon" variant="ghost" aria-label={t.delete} onClick={() => setData((d) => ({ ...d, rates: d.rates.filter((x) => x.id !== r.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </span>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.payPeriods}</h2>
        <p className="text-sm text-muted-foreground">{t.payPeriodsHint}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
          <Field label={t.label}><Input value={period.label} onChange={(e) => setPeriod({ ...period, label: e.target.value })} placeholder="1–15" /></Field>
          <Field label={t.startDay}><Input type="number" min={1} max={31} value={period.startDay} onChange={(e) => setPeriod({ ...period, startDay: e.target.value })} /></Field>
          <Field label={t.endDay}><Input type="number" min={1} max={31} value={period.endDay} onChange={(e) => setPeriod({ ...period, endDay: e.target.value })} /></Field>
          <Button onClick={() => {
            if (!period.label || !period.startDay || !period.endDay) return;
            const p = { id: editPeriod ?? uid(), label: period.label, startDay: +period.startDay, endDay: +period.endDay };
            setData((d) => ({ ...d, periods: editPeriod ? d.periods.map((x) => (x.id === editPeriod ? p : x)) : [...d.periods, p] }));
            setEditPeriod(null); setPeriod({ label: "", startDay: "1", endDay: "15" });
          }}>{editPeriod ? t.update : t.addPeriod}</Button>
        </div>
        {data.periods.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span><b>{p.label}</b> · {p.startDay}–{p.endDay}</span>
            <span>
              <Button size="icon" variant="ghost" aria-label={t.edit} onClick={() => { setEditPeriod(p.id); setPeriod({ label: p.label, startDay: String(p.startDay), endDay: String(p.endDay) }); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={t.delete} onClick={() => setData((d) => ({ ...d, periods: d.periods.filter((x) => x.id !== p.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </span>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.shiftTemplates}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
          <Field label={t.name}><Input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} placeholder={t.namePlaceholder} /></Field>
          <Field label={t.start}><Input type="time" value={tpl.start} onChange={(e) => setTpl({ ...tpl, start: e.target.value })} /></Field>
          <Field label={t.end}><Input type="time" value={tpl.end} onChange={(e) => setTpl({ ...tpl, end: e.target.value })} /></Field>
          <Field label={t.breakMin}><Input type="number" value={tpl.breakMin} onChange={(e) => setTpl({ ...tpl, breakMin: +e.target.value })} /></Field>
          <Button onClick={() => {
            if (!tpl.name) return;
            setData((d) => ({ ...d, templates: editTpl ? d.templates.map((x) => (x.id === editTpl ? { ...tpl, id: editTpl } : x)) : [...d.templates, { ...tpl, id: uid() }] }));
            setEditTpl(null); setTpl({ name: "", start: "06:00", end: "15:00", breakMin: 0 });
          }}>{editTpl ? t.update : t.add}</Button>
        </div>
        {data.templates.map((tp) => (
          <div key={tp.id} className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span><b>{tp.name}</b> · {tp.start}–{tp.end} · {fmtH(shiftHours(tp))}</span>
            <span>
              <Button size="icon" variant="ghost" aria-label={t.edit} onClick={() => { setEditTpl(tp.id); setTpl({ name: tp.name, start: tp.start, end: tp.end, breakMin: tp.breakMin }); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label={t.delete} onClick={() => setData((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== tp.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function DataTab({ data, setData, t }: Omit<P, "money">) {
  const jsonRef = useRef<HTMLInputElement>(null);
  const icsRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const read = (f: File, cb: (t: string) => void) => f.text().then(cb);
  return (
    <div className="space-y-4 pt-4">
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.calendarHeading}</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download("shifts.ics", toICS(data), "text/calendar")}><CalendarPlus className="mr-2 h-4 w-4" />{t.exportIcs}</Button>
          <Button variant="secondary" onClick={() => icsRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{t.importIcs}</Button>
          <input ref={icsRef} type="file" accept=".ics,text/calendar" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            read(f, (text) => { const s = fromICS(text); setData((d) => ({ ...d, shifts: [...d.shifts, ...s] })); setMsg(t.importedShifts(s.length)); });
            e.target.value = "";
          }} />
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t.backupRestore}</h2>
        <p className="text-sm text-muted-foreground">{t.backupHint}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download(`shift-backup-${today()}.json`, JSON.stringify(data, null, 2), "application/json")}><Download className="mr-2 h-4 w-4" />{t.downloadBackup}</Button>
          <Button variant="secondary" onClick={() => jsonRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{t.restoreBackup}</Button>
          <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            read(f, (text) => {
              try { const d = JSON.parse(text); if (!Array.isArray(d.shifts)) throw 0; if (confirm(t.confirmRestore)) { setData(() => d); setMsg(t.backupRestored); } }
              catch { setMsg(t.invalidBackup); }
            });
            e.target.value = "";
          }} />
        </div>
      </Card>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}

function CalendarTab({ data, setData, money, t, locale, lang }: P & { locale: string | undefined; lang: "en" | "ru" }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [sel, setSel] = useState<string | null>(null);
  const [y = 2026, mo = 1] = month.split("-").map(Number);
  const days = new Date(y, mo, 0).getDate();
  const lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const [filter, setFilter] = useState<"all" | "scheduled" | "worked" | "notes">("all");
  const now = new Date();
  const isWorked = (s: Shift) => {
    const end = new Date(`${s.date}T${s.end}`);
    if (s.end <= s.start) end.setDate(end.getDate() + 1);
    return end <= now;
  };
  const pass = (s: Shift) => filter === "all" || (filter === "worked" ? isWorked(s) : filter === "scheduled" ? !isWorked(s) : !!s.note?.trim());
  const byDay: Record<string, Shift[]> = {};
  data.shifts.filter((s) => s.date.startsWith(month) && pass(s)).forEach((s) => (byDay[s.date] ??= []).push(s));
  const shift = (n: number) => { const d = new Date(y, mo - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); setSel(null); };
  const selList = sel ? (byDay[sel] ?? []).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const upd = (id: string, patch: Partial<Shift>) => setData((d) => ({ ...d, shifts: d.shifts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = (tm: { start: string; end: string; breakMin: number }) => sel && setData((d) => ({ ...d, shifts: [...d.shifts, { id: uid(), date: sel, ...tm, note: "" }] }));
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => shift(-1)}>‹</Button>
        <h2 className="font-semibold">{new Date(y, mo - 1).toLocaleDateString(locale, { month: "long", year: "numeric" })}</h2>
        <Button variant="ghost" onClick={() => shift(1)}>›</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {([["all", t.filterAll], ["scheduled", t.filterScheduled], ["worked", t.filterWorked], ["notes", t.filterNotes]] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {weekdayShort[lang].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => <div key={"e" + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const list = byDay[date] ?? [];
          const sum = summarize(list, data.rates);
          const isToday = date === today();
          return (
            <button key={date} onClick={() => setSel(date)}
              className={`min-h-20 rounded-md border p-1 text-left text-xs transition-colors ${sel === date ? "border-primary ring-1 ring-primary" : "border-border"} ${list.length ? "bg-accent" : "bg-card"}`}>
              <div className={`font-semibold ${isToday ? "text-primary" : ""}`}>{i + 1}</div>
              {list.length > 0 && (<>
                <div className="truncate text-muted-foreground">{list.map((s) => s.start).join(", ")}</div>
                <div>{fmtH(sum.hours)}</div>
                <div className="font-semibold">{money(sum.pay)}</div>
              </>)}
            </button>
          );
        })}
      </div>
      {sel && (
        <Card className="space-y-2 p-4">
          <h3 className="font-semibold">{new Date(sel + "T00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</h3>
          {selList.length === 0 && <p className="text-sm text-muted-foreground">{t.noShifts}</p>}
          {selList.map((s) => (
            <div key={s.id} className="grid grid-cols-2 items-end gap-2 border-t border-border pt-2 sm:grid-cols-[1fr_1fr_90px_1fr_auto]">
              <Field label={t.start}><Input type="time" value={s.start} onChange={(e) => upd(s.id, { start: e.target.value })} /></Field>
              <Field label={t.end}><Input type="time" value={s.end} onChange={(e) => upd(s.id, { end: e.target.value })} /></Field>
              <Field label={t.break}><Input type="number" min={0} value={s.breakMin} onChange={(e) => upd(s.id, { breakMin: +e.target.value })} /></Field>
              <Field label={t.note}><Input value={s.note ?? ""} onChange={(e) => upd(s.id, { note: e.target.value })} /></Field>
              <div className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap">{fmtH(shiftHours(s))} · {money(shiftPay(s, data.rates))}</span>
                <Button size="icon" variant="ghost" aria-label={t.delete} onClick={() => setData((d) => ({ ...d, shifts: d.shifts.filter((x) => x.id !== s.id) }))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {data.templates.map((tp) => (
              <Button key={tp.id} size="sm" variant="secondary" onClick={() => add({ start: tp.start, end: tp.end, breakMin: tp.breakMin })}>+ {tp.name}</Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => add({ start: "09:00", end: "17:00", breakMin: 0 })}>{t.customShift}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
