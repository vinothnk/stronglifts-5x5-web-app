"use client";

import { type InputHTMLAttributes, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { RestTimer } from "@/components/rest-timer";
import { api, formatWeight } from "@/lib/utils";
import { calculatePlates, generateWarmupSets } from "@/lib/program";

type Workout = {
  id: string;
  workoutType: "A" | "B";
  notes: string | null;
  exercises: {
    id: string;
    actualWeight: number;
    targetWeight: number;
    targetSets: number;
    targetReps: number;
    completed: boolean;
    notes: string | null;
    exercise: { id: string; name: string; slug: string };
    warmupSets: { id?: string; setNumber: number; reps: number; weight: number; completed: boolean }[];
    sets: { id: string; setNumber: number; repsCompleted: number; weightUsed: number }[];
  }[];
  assistanceExercises: AssistanceEntry[];
} | null;

type AssistanceEntry = {
  id?: string;
  assistanceExerciseId?: string | null;
  name: string;
  category: string;
  weight?: number | null;
  sets: number;
  reps: number;
  notes?: string | null;
  completed: boolean;
};

type Settings = {
  units: string;
  restSeconds: number;
  deadliftRestSeconds: number;
  barWeight: number;
} | null;

type PreviousSummary = {
  exerciseId: string;
  date: Date | string;
  weight: number;
  setsCompleted: number;
  repsCompleted: number;
  notes: string | null;
  success: boolean;
};

type ActiveRest = {
  exerciseIndex: number;
  setIndex: number;
  exerciseName: string;
  completedSetNumber: number;
  nextSetNumber: number | null;
};

export function WorkoutSession({
  initialWorkout,
  settings,
  assistanceLibrary,
  plateInventory,
  previousSummaries
}: {
  initialWorkout: Workout;
  settings: Settings;
  assistanceLibrary: { id: string; name: string; category: string }[];
  plateInventory: { weight: number; count: number }[];
  previousSummaries: Record<string, PreviousSummary>;
}) {
  const router = useRouter();
  const [workout, setWorkout] = useState(() => limitWarmupSets(initialWorkout));
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [activeRest, setActiveRest] = useState<ActiveRest | null>(null);
  const [activeSetKey, setActiveSetKey] = useState<string | null>(null);
  const [handledRestKeys, setHandledRestKeys] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const units = settings?.units ?? "METRIC";

  async function start() {
    const data = await api<{ workout: NonNullable<Workout> }>("/api/workouts", { method: "POST", body: "{}" });
    setWorkout(limitWarmupSets(data.workout));
    router.refresh();
  }

  async function save(status: "DRAFT" | "COMPLETED" = "DRAFT") {
    if (!workout) return;
    setMessage("");
    const data = await api<{ workout: NonNullable<Workout> }>(`/api/workouts/${workout.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        notes: workout.notes,
        status,
        exercises: workout.exercises,
        assistanceExercises: workout.assistanceExercises
      })
    });
    setWorkout(limitWarmupSets(data.workout));
    setDirty(false);
    setMessage(status === "COMPLETED" ? "Workout completed and progression updated." : "Progress saved.");
    if (status === "COMPLETED") router.push("/dashboard");
    router.refresh();
  }

  async function deleteWorkout() {
    if (!workout || !window.confirm("Delete this workout? This cannot be undone.")) return;
    setMessage("");
    await api(`/api/workouts/${workout.id}`, { method: "DELETE" });
    setWorkout(null);
    setDirty(false);
    setMessage("Workout deleted.");
    router.refresh();
  }

  useEffect(() => {
    if (!workout || !dirty) return;
    const id = window.setTimeout(() => save("DRAFT").catch(() => setMessage("Autosave failed.")), 1200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, workout]);

  const volume = useMemo(() => workout?.exercises.reduce((sum, entry) => sum + entry.sets.reduce((setSum, set) => setSum + set.repsCompleted * set.weightUsed, 0), 0) ?? 0, [workout]);
  const startNextSet = useCallback(() => {
    if (!activeRest) return;
    if (activeRest.nextSetNumber) setActiveSetKey(`${activeRest.exerciseIndex}:${activeRest.setIndex + 1}`);
    setActiveRest(null);
  }, [activeRest]);

  useEffect(() => {
    if (!workout || activeRest) return;

    for (const [exerciseIndex, entry] of workout.exercises.entries()) {
      const setIndex = entry.sets.findIndex((set, index) => set.repsCompleted >= entry.targetReps && Boolean(entry.sets[index + 1]) && entry.sets[index + 1].repsCompleted < entry.targetReps);
      if (setIndex === -1) continue;

      const key = restKey(exerciseIndex, setIndex);
      if (!handledRestKeys.has(key)) startRestForSet(exerciseIndex, setIndex, entry);
      return;
    }
  }, [activeRest, handledRestKeys, workout]);

  if (!workout) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-500">No active workout. Start the next scheduled StrongLifts session.</p>
        <button onClick={start} className="mt-4 rounded-md bg-steel px-4 py-2.5 font-semibold text-white">Start workout</button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Workout {workout.workoutType}</h2>
          <p className="text-sm text-slate-500">Session volume: {formatWeight(volume, units)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => startTransition(() => save("DRAFT"))} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700"><Save className="size-4" />Save</button>
          <button onClick={() => startTransition(() => deleteWorkout())} className="inline-flex items-center gap-2 rounded-md border border-ember/30 px-4 py-2 font-semibold text-ember hover:bg-ember/10"><Trash2 className="size-4" />Delete</button>
          <button onClick={() => startTransition(() => save("COMPLETED"))} className="inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 font-semibold text-white">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Complete
          </button>
        </div>
      </section>

      {message && <p className="rounded-md bg-mint/10 px-3 py-2 text-sm text-mint">{message}</p>}

      {workout.exercises.map((entry, exerciseIndex) => {
        const previous = previousSummaries[entry.exercise.id];
        const increase = previous ? entry.actualWeight - previous.weight : null;
        const plates = calculatePlates({ targetWeight: entry.actualWeight, barWeight: settings?.barWeight ?? 20, inventory: plateInventory });
        return (
        <section key={entry.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">{entry.exercise.name}</h3>
              <p className="text-sm text-slate-500">Current working weight: {formatWeight(entry.actualWeight, units)} - Target {entry.targetSets} x {entry.targetReps}</p>
            </div>
          </div>
          {previous && (
            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800 sm:grid-cols-3">
              <p><span className="font-semibold">Previous:</span> {formatWeight(previous.weight, units)} on {format(new Date(previous.date), "yyyy-MM-dd")}</p>
              <p><span className="font-semibold">Completed:</span> {previous.setsCompleted} sets, {previous.repsCompleted} reps</p>
              <p><span className="font-semibold">Change:</span> {increase === null ? "n/a" : `${increase >= 0 ? "+" : ""}${formatWeight(increase, units)}`} ({previous.success ? "success" : "failure"})</p>
              {previous.notes && <p className="sm:col-span-3"><span className="font-semibold">Notes:</span> {previous.notes}</p>}
            </div>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <h4 className="font-semibold">Warm-up sets</h4>
              <div className="mt-2 space-y-2">
                {entry.warmupSets.map((set, setIndex) => (
                  <div key={`${entry.id}-warmup-${set.setNumber}`} className="grid grid-cols-[1fr_1fr_44px] gap-2">
                    <NumberInput aria-label="Warm-up weight" step="0.5" value={set.weight} onValueChange={(weight) => updateWarmupSet(exerciseIndex, setIndex, { weight })} />
                    <NumberInput aria-label="Warm-up reps" value={set.reps} onValueChange={(reps) => updateWarmupSet(exerciseIndex, setIndex, { reps })} />
                    <input aria-label="Warm-up completed" type="checkbox" checked={set.completed} onChange={(event) => updateWarmupSet(exerciseIndex, setIndex, { completed: event.target.checked })} />
                  </div>
                ))}
              </div>
            </div>
            <PlateLayout plates={plates} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <h4 className="mb-2 font-semibold">Working sets</h4>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Set</th><th>Reps</th><th>Weight</th><th>Done</th></tr></thead>
              <tbody>
                {entry.sets.map((set, setIndex) => (
                  <tr key={set.id ?? set.setNumber} className={`border-t border-slate-100 dark:border-slate-800 ${activeSetKey === `${exerciseIndex}:${setIndex}` ? "bg-mint/10" : ""}`}>
                    <td className="py-2 font-medium">{set.setNumber}</td>
                    <td><input className="w-24" type="number" value={set.repsCompleted} onChange={(event) => updateWorkingSetReps(exerciseIndex, setIndex, Number(event.target.value))} /></td>
                    <td><input className="w-28" type="number" step="0.5" value={set.weightUsed} onChange={(event) => updateSet(exerciseIndex, setIndex, { weightUsed: Number(event.target.value) })} /></td>
                    <td><input type="checkbox" checked={set.repsCompleted >= entry.targetReps} onChange={(event) => completeSet(exerciseIndex, setIndex, event.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );})}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Assistance work</h3>
            <p className="text-sm text-slate-500">Optional and excluded from StrongLifts progression.</p>
          </div>
          <AssistancePicker library={assistanceLibrary} onAdd={addAssistance} />
        </div>
        <div className="mt-4 space-y-4">
          {workout.assistanceExercises.map((entry, index) => (
            <div key={entry.id ?? `${entry.name}-${index}`} className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
              <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_44px]">
                <input value={entry.name} onChange={(event) => updateAssistance(index, { name: event.target.value })} />
                <input value={entry.notes ?? ""} onChange={(event) => updateAssistance(index, { notes: event.target.value })} placeholder="Notes" />
                <button aria-label="Remove assistance" onClick={() => removeAssistance(index)} className="grid size-10 place-items-center rounded-md border border-slate-200 dark:border-slate-700"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <h4 className="mb-2 font-semibold">Working sets</h4>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Set</th><th>Reps</th><th>Weight</th><th>Done</th></tr></thead>
                  <tbody>
                    {assistanceSetNumbers(entry.sets).map((setNumber) => (
                      <tr key={`${entry.id ?? entry.name}-${setNumber}`} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-2 font-medium">{setNumber}</td>
                        <td><input className="w-24" type="number" value={entry.reps} onChange={(event) => updateAssistance(index, { reps: Number(event.target.value) })} /></td>
                        <td><input className="w-28" type="number" step="0.5" value={entry.weight ?? 0} onChange={(event) => updateAssistance(index, { weight: Number(event.target.value) })} /></td>
                        <td><input type="checkbox" checked={entry.completed} onChange={(event) => updateAssistance(index, { completed: event.target.checked })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {workout.assistanceExercises.length === 0 && <p className="text-sm text-slate-500">Add dips, rows, core work, or any custom assistance after your main lifts.</p>}
        </div>
      </section>

      <label className="block text-sm font-medium">
        Workout notes
        <textarea value={workout.notes ?? ""} onChange={(event) => { setDirty(true); setWorkout({ ...workout, notes: event.target.value }); }} className="mt-1 min-h-28 w-full" />
      </label>

      {activeRest && (
        <RestTimer
          exerciseName={activeRest.exerciseName}
          completedSetNumber={activeRest.completedSetNumber}
          nextSetNumber={activeRest.nextSetNumber}
          onStartNextSet={startNextSet}
          onEnd={() => setActiveRest(null)}
        />
      )}
    </div>
  );

  function updateExercise(index: number, patch: Partial<NonNullable<Workout>["exercises"][number]>) {
    setDirty(true);
    setWorkout((current) => current && { ...current, exercises: current.exercises.map((entry, itemIndex) => itemIndex === index ? { ...entry, ...patch } : entry) });
  }

  function updateExerciseWeight(index: number, weight: number) {
    const warmupSets = generateWarmupSets(weight, settings?.barWeight ?? 20).map((set, setIndex) => ({
      setNumber: setIndex + 1,
      reps: set.reps,
      weight: set.weight,
      completed: false
    }));
    updateExercise(index, { actualWeight: weight, warmupSets });
    setWorkout((current) => current && {
      ...current,
      exercises: current.exercises.map((entry, itemIndex) => itemIndex === index ? {
        ...entry,
        actualWeight: weight,
        warmupSets,
        sets: entry.sets.map((set) => ({ ...set, weightUsed: weight }))
      } : entry)
    });
  }

  function updateWarmupSet(exerciseIndex: number, setIndex: number, patch: Partial<NonNullable<Workout>["exercises"][number]["warmupSets"][number]>) {
    setDirty(true);
    setWorkout((current) => current && {
      ...current,
      exercises: current.exercises.map((entry, itemIndex) => itemIndex === exerciseIndex ? { ...entry, warmupSets: entry.warmupSets.map((set, innerIndex) => innerIndex === setIndex ? { ...set, ...patch } : set) } : entry)
    });
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<NonNullable<Workout>["exercises"][number]["sets"][number]>) {
    setDirty(true);
    setWorkout((current) => current && {
      ...current,
      exercises: current.exercises.map((entry, itemIndex) => itemIndex === exerciseIndex ? { ...entry, sets: entry.sets.map((set, innerIndex) => innerIndex === setIndex ? { ...set, ...patch } : set) } : entry)
    });
  }

  function completeSet(exerciseIndex: number, setIndex: number, completed: boolean) {
    const entry = workout?.exercises[exerciseIndex];
    if (!entry) return;

    updateSet(exerciseIndex, setIndex, { repsCompleted: completed ? entry.targetReps : 0 });
    if (!completed) {
      if (activeRest?.exerciseIndex === exerciseIndex && activeRest.setIndex === setIndex) setActiveRest(null);
      return;
    }

    startRestForSet(exerciseIndex, setIndex, entry);
  }

  function updateWorkingSetReps(exerciseIndex: number, setIndex: number, repsCompleted: number) {
    const entry = workout?.exercises[exerciseIndex];
    const set = entry?.sets[setIndex];
    if (!entry || !set) return;

    const wasComplete = set.repsCompleted >= entry.targetReps;
    updateSet(exerciseIndex, setIndex, { repsCompleted });
    if (!wasComplete && repsCompleted >= entry.targetReps) {
      startRestForSet(exerciseIndex, setIndex, entry);
    }
  }

  function startRestForSet(exerciseIndex: number, setIndex: number, entry: NonNullable<Workout>["exercises"][number]) {
    const completedSet = entry.sets[setIndex];
    const nextSet = entry.sets[setIndex + 1];
    setHandledRestKeys((current) => new Set(current).add(restKey(exerciseIndex, setIndex)));
    setActiveSetKey(null);
    setActiveRest({
      exerciseIndex,
      setIndex,
      exerciseName: entry.exercise.name,
      completedSetNumber: completedSet?.setNumber ?? setIndex + 1,
      nextSetNumber: nextSet?.setNumber ?? null
    });
  }

  function addAssistance(exercise: { id: string; name: string; category: string }) {
    setDirty(true);
    setWorkout((current) => current && {
      ...current,
      assistanceExercises: [...current.assistanceExercises, { assistanceExerciseId: exercise.id, name: exercise.name, category: exercise.category, weight: null, sets: 3, reps: 10, notes: "", completed: false }]
    });
  }

  function updateAssistance(index: number, patch: Partial<AssistanceEntry>) {
    setDirty(true);
    setWorkout((current) => current && { ...current, assistanceExercises: current.assistanceExercises.map((entry, itemIndex) => itemIndex === index ? { ...entry, ...patch } : entry) });
  }

  function removeAssistance(index: number) {
    setDirty(true);
    setWorkout((current) => current && { ...current, assistanceExercises: current.assistanceExercises.filter((_, itemIndex) => itemIndex !== index) });
  }
}

function limitWarmupSets(workout: Workout): Workout {
  if (!workout) return workout;

  return {
    ...workout,
    exercises: workout.exercises.map((entry) => ({
      ...entry,
      warmupSets: entry.warmupSets.slice(0, 3).map((set, index) => ({ ...set, setNumber: index + 1 }))
    }))
  };
}

function restKey(exerciseIndex: number, setIndex: number) {
  return `${exerciseIndex}:${setIndex}`;
}

function assistanceSetNumbers(sets: number) {
  return Array.from({ length: Math.max(1, Math.min(20, sets)) }, (_, index) => index + 1);
}

function NumberInput({ value, onValueChange, onBlur, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & { value: number; onValueChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      {...props}
      type="number"
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next !== "") onValueChange(Number(next));
      }}
      onBlur={(event) => {
        if (draft === "") setDraft(String(value));
        onBlur?.(event);
      }}
    />
  );
}

function AssistancePicker({ library, onAdd }: { library: { id: string; name: string; category: string }[]; onAdd: (exercise: { id: string; name: string; category: string }) => void }) {
  const [id, setId] = useState(library[0]?.id ?? "");
  return (
    <div className="flex gap-2">
      <select value={id} onChange={(event) => setId(event.target.value)} className="max-w-56">
        {library.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.category} - {exercise.name}</option>)}
      </select>
      <button onClick={() => { const exercise = library.find((item) => item.id === id); if (exercise) onAdd(exercise); }} className="inline-flex items-center gap-2 rounded-md bg-steel px-3 py-2 font-semibold text-white"><Plus className="size-4" />Add</button>
    </div>
  );
}

function PlateLayout({ plates }: { plates: ReturnType<typeof calculatePlates> }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <h4 className="font-semibold">Plate calculator</h4>
      <p className="mt-1 text-sm text-slate-500">Loaded total: {plates.total} kg</p>
      {!plates.loadable && <p className="mt-2 rounded-md bg-ember/10 px-2 py-1 text-sm text-ember">{plates.message}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1 text-xs font-semibold">
        {plates.perSide.map((plate) => Array.from({ length: plate.count }, (_, index) => <span key={`left-${plate.weight}-${index}`} className="rounded-sm bg-steel px-2 py-3 text-white">{plate.weight}</span>))}
        <span className="mx-2 rounded-sm bg-slate-900 px-3 py-3 text-white dark:bg-slate-100 dark:text-slate-900">BAR</span>
        {[...plates.perSide].reverse().map((plate) => Array.from({ length: plate.count }, (_, index) => <span key={`right-${plate.weight}-${index}`} className="rounded-sm bg-steel px-2 py-3 text-white">{plate.weight}</span>))}
      </div>
      <ul className="mt-3 text-sm text-slate-500">
        {plates.perSide.map((plate) => <li key={plate.weight}>{plate.weight} kg x {plate.count} per side</li>)}
      </ul>
    </div>
  );
}
