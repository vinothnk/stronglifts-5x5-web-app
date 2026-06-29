"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatWeight, api } from "@/lib/utils";

type Row = {
  id: string;
  currentWeight: number;
  nextWeight: number;
  failureCount: number;
  successStreak: number;
  lastCompletedAt: Date | string | null;
  lastStatus: string | null;
  exercise: { name: string };
};

export function WorkingWeightsView({ initialRows, units }: { initialRows: Row[]; units: string }) {
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");

  async function save(row: Row) {
    const data = await api<{ workingWeight: Row }>(`/api/working-weights/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        currentWeight: row.currentWeight,
        nextWeight: row.nextWeight,
        failureCount: row.failureCount,
        successStreak: row.successStreak
      })
    });
    setRows((current) => current.map((item) => item.id === row.id ? data.workingWeight : item));
    setMessage(`${row.exercise.name} updated.`);
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Program</p><h1 className="text-3xl font-bold">Current working weights</h1></div>
      {message && <p className="rounded-md bg-mint/10 px-3 py-2 text-sm text-mint">{message}</p>}
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <section key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{row.exercise.name}</h2>
                <p className="text-sm text-slate-500">Last: {row.lastCompletedAt ? format(new Date(row.lastCompletedAt), "yyyy-MM-dd") : "Never"} - {row.lastStatus ?? "Not started"}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 lg:w-[620px]">
                <NumberField label="Current" value={row.currentWeight} onChange={(currentWeight) => update(index, { currentWeight })} />
                <NumberField label="Next" value={row.nextWeight} onChange={(nextWeight) => update(index, { nextWeight })} />
                <NumberField label="Streak" value={row.successStreak} onChange={(successStreak) => update(index, { successStreak })} />
                <NumberField label="Failures" value={row.failureCount} onChange={(failureCount) => update(index, { failureCount })} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Future workouts use {formatWeight(row.nextWeight, units)}.</p>
              <button onClick={() => save(row)} className="rounded-md bg-steel px-4 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, itemIndex) => itemIndex === index ? { ...row, ...patch } : row));
  }
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-xs font-medium text-slate-500">{label}<input className="mt-1 w-full" type="number" step="0.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
