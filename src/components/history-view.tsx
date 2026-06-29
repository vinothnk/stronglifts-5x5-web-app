"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { formatWeight } from "@/lib/utils";

type Workout = {
  id: string;
  workoutType: "A" | "B";
  workoutDate: Date | string;
  notes: string | null;
  exercises: { exercise: { name: string; slug: string }; actualWeight: number; sets: { setNumber: number; repsCompleted: number; weightUsed: number }[]; notes: string | null }[];
  assistanceExercises: { id: string; name: string; category: string; weight: number | null; sets: number; reps: number; notes: string | null }[];
};

export function HistoryView({ initialWorkouts, exercises }: { initialWorkouts: Workout[]; exercises: { id: string; name: string; slug: string }[] }) {
  const [exercise, setExercise] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const workouts = useMemo(() => initialWorkouts.filter((workout) => {
    const date = new Date(workout.workoutDate).toISOString().slice(0, 10);
    return (!exercise || workout.exercises.some((entry) => entry.exercise.slug === exercise)) && (!from || date >= from) && (!to || date <= to);
  }), [exercise, from, initialWorkouts, to]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel">History</p>
        <h1 className="text-3xl font-bold">Completed workouts</h1>
      </div>
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
        <select value={exercise} onChange={(event) => setExercise(event.target.value)}><option value="">All exercises</option>{exercises.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </section>
      <div className="space-y-4">
        {workouts.map((workout) => (
          <article key={workout.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Workout {workout.workoutType}</h2><time className="text-sm text-slate-500">{format(new Date(workout.workoutDate), "PPP")}</time></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {workout.exercises.filter((entry) => !exercise || entry.exercise.slug === exercise).map((entry) => (
                <div key={entry.exercise.slug} className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="font-medium">{entry.exercise.name}</p>
                  <p className="text-sm text-slate-500">{formatWeight(entry.actualWeight)} - {entry.sets.map((set) => set.repsCompleted).join("/")}</p>
                  {entry.notes && <p className="mt-2 text-xs text-slate-500">{entry.notes}</p>}
                </div>
              ))}
            </div>
            {workout.assistanceExercises.length > 0 && (
              <div className="mt-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-medium">Assistance</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {workout.assistanceExercises.map((entry) => (
                    <p key={entry.id} className="text-sm text-slate-500">{entry.name}: {entry.weight ?? 0} x {entry.sets} x {entry.reps}{entry.notes ? ` - ${entry.notes}` : ""}</p>
                  ))}
                </div>
              </div>
            )}
            {workout.notes && <p className="mt-3 text-sm text-slate-500">{workout.notes}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
