import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPreviousSummaries, workoutInclude } from "@/lib/workouts";
import { WorkoutSession } from "@/components/workout-session";

export default async function WorkoutPage() {
  const user = await requireUser();
  if (!user) return null;
  const [workout, assistanceExercises, plateInventory] = await Promise.all([
    prisma.workout.findFirst({
      where: { userId: user.id, status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      include: workoutInclude
    }),
    prisma.assistanceExercise.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.plateInventory.findMany({ where: { userId: user.id }, orderBy: { weight: "desc" } })
  ]);
  const previousSummaries = workout ? await getPreviousSummaries(user.id, workout.exercises.map((entry) => entry.exerciseId)) : {};

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-steel">Session</p>
        <h1 className="text-3xl font-bold">Workout tracker</h1>
      </div>
      <WorkoutSession
        initialWorkout={workout}
        settings={user.settings}
        assistanceLibrary={assistanceExercises}
        plateInventory={plateInventory}
        previousSummaries={previousSummaries}
      />
    </div>
  );
}
