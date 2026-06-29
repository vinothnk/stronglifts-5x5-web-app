"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/utils";

const defaults = {
  units: "METRIC",
  squatIncrement: 2.5,
  benchIncrement: 2.5,
  rowIncrement: 2.5,
  pressIncrement: 2.5,
  deadliftIncrement: 5,
  deloadPercent: 10,
  restSeconds: 90,
  deadliftRestSeconds: 180,
  darkMode: false,
  barWeight: 20,
  startingSquat: 20,
  startingBench: 20,
  startingRow: 30,
  startingPress: 20,
  startingDeadlift: 40,
  onboardingComplete: true
};

export function OnboardingView({ initialSettings }: { initialSettings: Partial<typeof defaults> | null }) {
  const router = useRouter();
  const [settings, setSettings] = useState({ ...defaults, ...initialSettings, onboardingComplete: true });
  const [error, setError] = useState("");

  async function save() {
    try {
      await api("/api/onboarding", { method: "POST", body: JSON.stringify(settings) });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save onboarding.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Setup</p><h1 className="text-3xl font-bold">Choose your starting weights</h1><p className="mt-2 text-sm text-slate-500">Accept the StrongLifts defaults or enter your own first working weights.</p></div>
      {error && <p className="rounded-md bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <NumberField label="Squat" value={settings.startingSquat} onChange={(startingSquat) => setSettings({ ...settings, startingSquat })} />
        <NumberField label="Bench Press" value={settings.startingBench} onChange={(startingBench) => setSettings({ ...settings, startingBench })} />
        <NumberField label="Barbell Row" value={settings.startingRow} onChange={(startingRow) => setSettings({ ...settings, startingRow })} />
        <NumberField label="Overhead Press" value={settings.startingPress} onChange={(startingPress) => setSettings({ ...settings, startingPress })} />
        <NumberField label="Deadlift" value={settings.startingDeadlift} onChange={(startingDeadlift) => setSettings({ ...settings, startingDeadlift })} />
        <NumberField label="Bar weight" value={settings.barWeight} onChange={(barWeight) => setSettings({ ...settings, barWeight })} />
        <button onClick={save} className="rounded-md bg-steel px-4 py-2.5 font-semibold text-white sm:col-span-2">Save and start</button>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-sm font-medium">{label}<input className="mt-1 w-full" type="number" step="0.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

