"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, formatWeight } from "@/lib/utils";

export function BodyWeightView({ initialEntries, units }: { initialEntries: { id: string; date: Date | string; weight: number }[]; units: string }) {
  const [entries, setEntries] = useState(initialEntries);

  async function add(formData: FormData) {
    const data = await api<{ entry: { id: string; date: string; weight: number } }>("/api/body-weight", {
      method: "POST",
      body: JSON.stringify({ weight: Number(formData.get("weight")), date: formData.get("date") })
    });
    setEntries((current) => [...current, data.entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Body weight</p><h1 className="text-3xl font-bold">Trend log</h1></div>
      <form action={add} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto]">
        <input name="weight" type="number" step="0.1" placeholder={`Weight (${units === "IMPERIAL" ? "lb" : "kg"})`} required />
        <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        <button className="rounded-md bg-steel px-4 py-2 font-semibold text-white">Add</button>
      </form>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={entries.map((entry) => ({ date: new Date(entry.date).toISOString().slice(0, 10), weight: entry.weight }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="weight" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entries.slice(-8).reverse().map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p className="font-semibold">{formatWeight(entry.weight, units)}</p><p className="text-sm text-slate-500">{format(new Date(entry.date), "yyyy-MM-dd")}</p></div>)}
      </div>
    </div>
  );
}
