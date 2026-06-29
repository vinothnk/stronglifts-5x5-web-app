import "server-only";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getNextWorkoutPlan, workoutInclude } from "@/lib/workouts";

export async function getDashboardData(userId: string) {
  const [nextWorkout, activeWorkout, lastWorkout, bodyWeight, totalWorkouts, personalRecords, workouts, bodyWeights] =
    await Promise.all([
      getNextWorkoutPlan(userId),
      prisma.workout.findFirst({ where: { userId, status: "DRAFT" }, orderBy: { updatedAt: "desc" }, include: workoutInclude }),
      prisma.workout.findFirst({ where: { userId, status: "COMPLETED" }, orderBy: { workoutDate: "desc" }, include: workoutInclude }),
      prisma.bodyWeightEntry.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.workout.count({ where: { userId, status: "COMPLETED" } }),
      prisma.personalRecord.findMany({
        where: { userId },
        orderBy: [{ exerciseId: "asc" }, { estimatedOneRepMax: "desc" }],
        include: { exercise: true }
      }),
      prisma.workout.findMany({
        where: { userId, status: "COMPLETED", workoutDate: { gte: subDays(new Date(), 365) } },
        orderBy: { workoutDate: "asc" },
        include: workoutInclude
      }),
      prisma.bodyWeightEntry.findMany({ where: { userId }, orderBy: { date: "asc" } })
    ]);

  const prs = personalRecords.reduce<typeof personalRecords>((records, record) => {
    if (!records.some((item) => item.exerciseId === record.exerciseId)) records.push(record);
    return records;
  }, []);

  return { nextWorkout, activeWorkout, lastWorkout, bodyWeight, totalWorkouts, personalRecords: prs, workouts, bodyWeights };
}

