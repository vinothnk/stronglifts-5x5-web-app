import { format } from "date-fns";
import { redirect } from "next/navigation";
import { Award, CalendarDays, Dumbbell, Scale } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { formatWeight } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard-charts";
import { StartWorkoutButton } from "@/components/start-workout-button";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return null;
  if (!user.settings?.onboardingComplete) redirect("/onboarding");
  const data = await getDashboardData(user.id);
  const units = user.settings?.units ?? "METRIC";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-steel">Today</p>
          <h1 className="text-3xl font-bold">Workout {data.activeWorkout?.workoutType ?? data.nextWorkout}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Next up: Workout {data.nextWorkout}. Last completed: {data.lastWorkout ? format(data.lastWorkout.workoutDate, "PPP") : "not yet"}.
          </p>
        </div>
        <StartWorkoutButton activeId={data.activeWorkout?.id ?? null} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarDays} label="Last workout" value={data.lastWorkout ? format(data.lastWorkout.workoutDate, "MMM d") : "None"} />
        <Metric icon={Scale} label="Body weight" value={formatWeight(data.bodyWeight?.weight, units)} />
        <Metric icon={Dumbbell} label="Workouts done" value={String(data.totalWorkouts)} />
        <Metric icon={Award} label="Personal records" value={String(data.personalRecords.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DashboardCharts workouts={data.workouts} bodyWeights={data.bodyWeights} />
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Personal records</h2>
          <div className="mt-4 space-y-3">
            {data.personalRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <div>
                  <p className="font-medium">{record.exercise.name}</p>
                  <p className="text-xs text-slate-500">{record.reps} reps, e1RM {formatWeight(record.estimatedOneRepMax, units)}</p>
                </div>
                <p className="font-semibold">{formatWeight(record.weight, units)}</p>
              </div>
            ))}
            {data.personalRecords.length === 0 && <p className="text-sm text-slate-500">Complete a workout to set your first records.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 text-steel" />
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
