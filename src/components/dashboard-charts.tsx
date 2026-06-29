"use client";

import { format } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { progressionSeriesByExercise, weeklyAverage } from "@/lib/analytics";

type WorkoutData = {
  id: string;
  workoutDate: Date | string;
  exercises: { actualWeight: number; exercise: { name: string; slug: string }; sets: { repsCompleted: number; weightUsed: number }[] }[];
};

export function DashboardCharts({ workouts, bodyWeights }: { workouts: WorkoutData[]; bodyWeights: { date: Date | string; weight: number }[] }) {
  const normalized = workouts.map((workout) => ({ ...workout, workoutDate: new Date(workout.workoutDate) }));
  const frequency = normalized.reduce<Record<string, number>>((acc, workout) => {
    const key = format(workout.workoutDate, "yyyy-MM");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const frequencyRows = Object.entries(frequency).map(([date, count]) => ({ date, count }));
  const weightRows = weeklyAverage(bodyWeights.map((entry) => ({ date: new Date(entry.date), weight: entry.weight })));
  const progressionGroups = progressionSeriesByExercise(normalized);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Chart title="Weight progression">
        {progressionGroups.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {progressionGroups.map((group) => (
              <div key={group.exercise} className="min-w-0">
                <h3 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{group.exercise}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={group.rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="weight" name="Weight" stroke="#2563eb" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Complete a workout to see exercise progression.</p>
        )}
      </Chart>
      <Chart title="Workout frequency">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={frequencyRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Chart>
      <Chart title="Body weight weekly average">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={weightRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="weight" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </Chart>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}
