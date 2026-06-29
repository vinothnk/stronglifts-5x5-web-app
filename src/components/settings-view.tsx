"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "@/lib/utils";

type Settings = {
  units: "METRIC" | "IMPERIAL";
  squatIncrement: number;
  benchIncrement: number;
  rowIncrement: number;
  pressIncrement: number;
  deadliftIncrement: number;
  deloadPercent: number;
  restSeconds: number;
  deadliftRestSeconds: number;
  barWeight: number;
  startingSquat: number;
  startingBench: number;
  startingRow: number;
  startingPress: number;
  startingDeadlift: number;
  darkMode: boolean;
  onboardingComplete: boolean;
} | null;

const defaults: NonNullable<Settings> = {
  units: "METRIC",
  squatIncrement: 2.5,
  benchIncrement: 2.5,
  rowIncrement: 2.5,
  pressIncrement: 2.5,
  deadliftIncrement: 5,
  deloadPercent: 10,
  restSeconds: 90,
  deadliftRestSeconds: 180,
  barWeight: 20,
  startingSquat: 20,
  startingBench: 20,
  startingRow: 30,
  startingPress: 20,
  startingDeadlift: 40,
  darkMode: false,
  onboardingComplete: true
};

export function SettingsView({ initialSettings, initialPlates }: { initialSettings: Settings; initialPlates: { id: string; weight: number; count: number; unit: "METRIC" | "IMPERIAL" }[] }) {
  const [settings, setSettings] = useState({ ...defaults, ...initialSettings });
  const [plates, setPlates] = useState(initialPlates.length ? initialPlates : [25, 20, 15, 10, 5, 2.5, 1.25].map((weight) => ({ id: String(weight), weight, count: weight >= 20 ? 4 : 2, unit: "METRIC" as const })));
  const [message, setMessage] = useState("");

  async function save() {
    await api("/api/settings", { method: "PATCH", body: JSON.stringify(settings) });
    await api("/api/plate-inventory", { method: "PUT", body: JSON.stringify({ plates }) });
    setMessage("Settings saved.");
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const data = await fetch("/api/backup", { method: "POST", body: text, headers: { "Content-Type": "application/json" } });
    const result = await data.json();
    setMessage(result.message ?? "Restore finished.");
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Settings</p><h1 className="text-3xl font-bold">Program controls</h1></div>
      {message && <p className="rounded-md bg-mint/10 px-3 py-2 text-sm text-mint">{message}</p>}
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <label className="text-sm font-medium">Units<select value={settings.units} onChange={(event) => setSettings({ ...settings, units: event.target.value as "METRIC" | "IMPERIAL" })} className="mt-1 w-full"><option value="METRIC">Metric kg</option><option value="IMPERIAL">Imperial lb</option></select></label>
        <NumberField label="Deload %" value={settings.deloadPercent} onChange={(deloadPercent) => setSettings({ ...settings, deloadPercent })} />
        <NumberField label="Default rest seconds" value={settings.restSeconds} onChange={(restSeconds) => setSettings({ ...settings, restSeconds })} />
        <NumberField label="Deadlift rest seconds" value={settings.deadliftRestSeconds} onChange={(deadliftRestSeconds) => setSettings({ ...settings, deadliftRestSeconds })} />
        <NumberField label="Olympic bar weight" value={settings.barWeight} onChange={(barWeight) => setSettings({ ...settings, barWeight })} />
        <NumberField label="Squat increment" value={settings.squatIncrement} onChange={(squatIncrement) => setSettings({ ...settings, squatIncrement })} />
        <NumberField label="Bench increment" value={settings.benchIncrement} onChange={(benchIncrement) => setSettings({ ...settings, benchIncrement })} />
        <NumberField label="Row increment" value={settings.rowIncrement} onChange={(rowIncrement) => setSettings({ ...settings, rowIncrement })} />
        <NumberField label="Press increment" value={settings.pressIncrement} onChange={(pressIncrement) => setSettings({ ...settings, pressIncrement })} />
        <NumberField label="Deadlift increment" value={settings.deadliftIncrement} onChange={(deadliftIncrement) => setSettings({ ...settings, deadliftIncrement })} />
        <NumberField label="Starting squat" value={settings.startingSquat} onChange={(startingSquat) => setSettings({ ...settings, startingSquat })} />
        <NumberField label="Starting bench" value={settings.startingBench} onChange={(startingBench) => setSettings({ ...settings, startingBench })} />
        <NumberField label="Starting row" value={settings.startingRow} onChange={(startingRow) => setSettings({ ...settings, startingRow })} />
        <NumberField label="Starting press" value={settings.startingPress} onChange={(startingPress) => setSettings({ ...settings, startingPress })} />
        <NumberField label="Starting deadlift" value={settings.startingDeadlift} onChange={(startingDeadlift) => setSettings({ ...settings, startingDeadlift })} />
        <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={settings.darkMode} onChange={(event) => setSettings({ ...settings, darkMode: event.target.checked })} /> Prefer dark mode</label>
        <button onClick={save} className="rounded-md bg-steel px-4 py-2 font-semibold text-white md:col-span-2">Save settings</button>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Plate inventory</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plates.map((plate, index) => (
            <div key={`${plate.weight}-${plate.unit}`} className="grid grid-cols-[1fr_1fr] gap-2">
              <NumberField label="Plate" value={plate.weight} onChange={(weight) => updatePlate(index, { weight })} />
              <NumberField label="Count" value={plate.count} onChange={(count) => updatePlate(index, { count })} />
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <a className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700" href="/api/export?format=csv"><Download className="size-4" />CSV</a>
        <a className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700" href="/api/export?format=xlsx"><Download className="size-4" />Excel</a>
        <a className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700" href="/api/backup"><Download className="size-4" />Backup</a>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700"><Upload className="size-4" />Restore<input type="file" accept="application/json" className="hidden" onChange={(event) => restore(event.target.files?.[0])} /></label>
      </section>
    </div>
  );

  function updatePlate(index: number, patch: Partial<(typeof plates)[number]>) {
    setPlates((current) => current.map((plate, itemIndex) => itemIndex === index ? { ...plate, ...patch } : plate));
  }
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-sm font-medium">{label}<input className="mt-1 w-full" type="number" step="0.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
