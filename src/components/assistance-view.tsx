"use client";

import { useState } from "react";
import { api } from "@/lib/utils";

type Exercise = { id: string; name: string; category: string; custom: boolean };
type Template = {
  id: string;
  name: string;
  items: { id: string; sets: number; reps: number; weight: number | null; assistanceExercise: Exercise }[];
};

export function AssistanceView({ initialExercises, initialTemplates }: { initialExercises: Exercise[]; initialTemplates: Template[] }) {
  const [exercises, setExercises] = useState(initialExercises);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function addCustom(formData: FormData) {
    const data = await api<{ exercise: Exercise }>("/api/assistance", {
      method: "POST",
      body: JSON.stringify({ name: formData.get("name"), category: formData.get("category") })
    });
    setExercises((current) => [...current, data.exercise].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    setMessage("Custom exercise added.");
  }

  async function createTemplate(formData: FormData) {
    const name = String(formData.get("templateName") || "Assistance template");
    const data = await api<{ template: Template }>("/api/assistance/templates", {
      method: "POST",
      body: JSON.stringify({
        name,
        items: selected.map((id) => ({ assistanceExerciseId: id, sets: 3, reps: 10, weight: null }))
      })
    });
    setTemplates((current) => [data.template, ...current]);
    setSelected([]);
    setMessage("Template saved.");
  }

  const categories = [...new Set(exercises.map((exercise) => exercise.category))];

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Assistance</p><h1 className="text-3xl font-bold">Exercise library</h1></div>
      {message && <p className="rounded-md bg-mint/10 px-3 py-2 text-sm text-mint">{message}</p>}
      <form action={addCustom} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto]">
        <input name="name" placeholder="Custom exercise" required />
        <input name="category" placeholder="Category" required />
        <button className="rounded-md bg-steel px-4 py-2 font-semibold text-white">Add custom</button>
      </form>
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">{category}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {exercises.filter((exercise) => exercise.category === category).map((exercise) => (
                  <label key={exercise.id} className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-800">
                    <input type="checkbox" checked={selected.includes(exercise.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, exercise.id] : current.filter((id) => id !== exercise.id))} />
                    {exercise.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <aside className="space-y-4">
          <form action={createTemplate} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">Create template</h2>
            <input name="templateName" className="mt-3 w-full" placeholder="Template name" required />
            <p className="mt-2 text-sm text-slate-500">{selected.length} selected</p>
            <button disabled={selected.length === 0} className="mt-3 rounded-md bg-mint px-4 py-2 font-semibold text-white disabled:opacity-50">Save template</button>
          </form>
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold">{template.name}</h3>
              <ul className="mt-2 text-sm text-slate-500">
                {template.items.map((item) => <li key={item.id}>{item.assistanceExercise.name} - {item.sets}x{item.reps}</li>)}
              </ul>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}

