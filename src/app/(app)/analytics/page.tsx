import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { totalVolume } from "@/lib/analytics";
import { workoutInclude } from "@/lib/workouts";
import { DashboardCharts } from "@/components/dashboard-charts";
import { formatWeight } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requireUser();
  if (!user) return null;
  const [workouts, bodyWeights, records] = await Promise.all([
    prisma.workout.findMany({ where: { userId: user.id, status: "COMPLETED" }, orderBy: { workoutDate: "asc" }, include: workoutInclude }),
    prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.personalRecord.findMany({ where: { userId: user.id }, include: { exercise: true }, orderBy: { estimatedOneRepMax: "desc" } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel">Analytics</p>
        <h1 className="text-3xl font-bold">Progress trends</h1>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total volume" value={formatWeight(totalVolume(workouts), user.settings?.units)} />
        <Stat label="Estimated 1RM best" value={records[0] ? formatWeight(records[0].estimatedOneRepMax, user.settings?.units) : "None"} />
        <Stat label="Tracked sessions" value={String(workouts.length)} />
      </section>
      <DashboardCharts workouts={workouts} bodyWeights={bodyWeights} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}

