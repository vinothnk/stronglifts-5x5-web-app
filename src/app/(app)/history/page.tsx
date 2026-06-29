import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { workoutInclude } from "@/lib/workouts";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage() {
  const user = await requireUser();
  if (!user) return null;
  const [workouts, exercises] = await Promise.all([
    prisma.workout.findMany({ where: { userId: user.id, status: "COMPLETED" }, orderBy: { workoutDate: "desc" }, include: workoutInclude }),
    prisma.exercise.findMany({ orderBy: { name: "asc" } })
  ]);
  return <HistoryView initialWorkouts={workouts} exercises={exercises} />;
}

