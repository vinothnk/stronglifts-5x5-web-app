"use client";

import { useState } from "react";
import { format } from "date-fns";
import { api } from "@/lib/utils";

export function NotesView({ initialNotes }: { initialNotes: { id: string; date: Date | string; content: string }[] }) {
  const [notes, setNotes] = useState(initialNotes);

  async function add(formData: FormData) {
    const data = await api<{ note: { id: string; date: string; content: string } }>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ date: formData.get("date"), content: formData.get("content") })
    });
    setNotes((current) => [data.note, ...current]);
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-steel">Notes</p><h1 className="text-3xl font-bold">Daily training log</h1></div>
      <form action={add} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        <textarea name="content" className="min-h-32 w-full" placeholder="Sleep, soreness, technique cues, nutrition, or anything that affects the bar." required />
        <button className="rounded-md bg-steel px-4 py-2 font-semibold text-white">Add note</button>
      </form>
      <section className="grid gap-3 md:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <time className="text-sm font-semibold text-steel">{format(new Date(note.date), "PPP")}</time>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{note.content}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

