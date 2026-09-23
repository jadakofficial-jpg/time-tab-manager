import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(4000),
  today: z.string(),
  templates: z.array(z.object({ name: z.string(), start: z.string(), end: z.string(), breakMin: z.number() })).max(50),
});

export type DraftShift = { date: string; start: string; end: string; breakMin: number; note: string };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["shifts"],
  properties: {
    shifts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "start", "end", "breakMin", "note"],
        properties: {
          date: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          breakMin: { type: "number" },
          note: { type: "string" },
        },
      },
    },
  },
};

export const planWeek = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ shifts: DraftShift[]; error?: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { shifts: [], error: "AI is not configured." };
    const weekday = new Date(data.today + "T00:00").toLocaleDateString("en-US", { weekday: "long" });
    const instructions = `You convert a worker's description of their planned work into shifts.
Today is ${data.today} (${weekday}). Resolve relative days ("Monday", "next week") to the nearest upcoming dates in YYYY-MM-DD.
Times are 24h HH:MM. breakMin is unpaid break minutes (0 if not mentioned).
Saved templates (use their times when the user names them): ${JSON.stringify(data.templates)}.
note: short extra detail or empty string. Return at most 31 shifts. Do not invent shifts that were not described.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        instructions,
        input: data.text,
        text: { format: { type: "json_schema", name: "shifts", strict: true, schema } },
      }),
    });
    if (!res.ok) {
      const msg =
        res.status === 429 ? "Too many requests — try again in a moment."
        : res.status === 402 ? "AI credits have run out. Add credits in your workspace to continue."
        : res.status === 403 ? "AI access is blocked for this workspace."
        : `AI request failed (${res.status}).`;
      return { shifts: [], error: msg };
    }
    const json: any = await res.json();
    const text: string =
      json.output_text ??
      (json.output ?? []).flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "output_text")?.text ??
      "";
    const refusal = (json.output ?? []).flatMap((o: any) => o.content ?? []).find((c: any) => c.type === "refusal");
    if (refusal) return { shifts: [], error: "The AI declined this request." };
    try {
      const parsed = JSON.parse(text);
      const re = /^\d{2}:\d{2}$/;
      const shifts: DraftShift[] = (parsed.shifts ?? [])
        .filter((s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && re.test(s.start) && re.test(s.end))
        .slice(0, 31)
        .map((s: any) => ({ date: s.date, start: s.start, end: s.end, breakMin: Math.max(0, Math.round(+s.breakMin || 0)), note: String(s.note ?? "") }));
      return { shifts };
    } catch {
      return { shifts: [], error: "Couldn't understand the AI's answer. Try rephrasing." };
    }
  });
