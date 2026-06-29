import "server-only";
import type { Prisma, WorkoutType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyProgression, estimateOneRepMax, generateWarmupSets, nextWorkoutType, PROGRAM, startingWeightForSlug } from "@/lib/program";

export const workoutInclude = {
  exercises: {
    include: {
      exercise: true,
      sets: { orderBy: { setNumber: "asc" } },
      warmupSets: { orderBy: { setNumber: "asc" } }
    }
  },
  assistanceExercises: { orderBy: { name: "asc" } }
} satisfies Prisma.WorkoutInclude;

export async function getNextWorkoutPlan(userId: string) {
  const lastCompleted = await prisma.workout.findFirst({
    where: { userId, status: "COMPLETED" },
    orderBy: { workoutDate: "desc" },
    include: workoutInclude
  });

  return nextWorkoutType(lastCompleted?.workoutType);
}

export async function createDraftWorkout(userId: string) {
  const type = await getNextWorkoutPlan(userId);
  const [exercises, settings] = await Promise.all([
    prisma.exercise.findMany(),
    prisma.userSettings.upsert({ where: { userId }, update: {}, create: { userId } })
  ]);
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

  const latestByExercise = await Promise.all(
    PROGRAM[type].map(async (item) => {
      const exercise = bySlug.get(item.slug);
      if (!exercise) throw new Error(`Missing exercise seed: ${item.slug}`);
      const [workingWeight] = await Promise.all([
        prisma.workingWeight.upsert({
          where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
          update: {},
          create: {
            userId,
            exerciseId: exercise.id,
            currentWeight: startingWeightForSlug(item.slug, settings),
            nextWeight: startingWeightForSlug(item.slug, settings)
          }
        })
      ]);
      return { item, exercise, workingWeight };
    })
  );

  return prisma.workout.create({
    data: {
      userId,
      workoutType: type,
      status: "DRAFT",
      workoutDate: new Date(),
      exercises: {
        create: latestByExercise.map(({ item, exercise, workingWeight }) => {
          const weight = workingWeight.nextWeight;
          return {
            exerciseId: exercise.id,
            targetWeight: weight,
            actualWeight: weight,
            targetSets: item.sets,
            targetReps: item.reps,
            failureCount: workingWeight.failureCount,
            warmupSets: {
              createMany: {
                data: generateWarmupSets(weight, settings.barWeight).map((set, index) => ({
                  setNumber: index + 1,
                  reps: set.reps,
                  weight: set.weight
                }))
              }
            },
            sets: {
              createMany: {
                data: Array.from({ length: item.sets }, (_, index) => ({
                  setNumber: index + 1,
                  repsCompleted: 0,
                  weightUsed: weight
                }))
              }
            }
          };
        })
      }
    },
    include: workoutInclude
  });
}

export async function getPreviousSummaries(userId: string, exerciseIds: string[]): Promise<Record<string, {
  exerciseId: string;
  date: Date;
  weight: number;
  setsCompleted: number;
  repsCompleted: number;
  notes: string | null;
  success: boolean;
}>> {
  const summaries = await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const latest = await prisma.workoutExercise.findFirst({
        where: { workout: { userId, status: "COMPLETED" }, exerciseId },
        orderBy: { workout: { workoutDate: "desc" } },
        include: { workout: true, sets: { orderBy: { setNumber: "asc" } } }
      });
      return latest
        ? {
            exerciseId,
            date: latest.workout.workoutDate,
            weight: latest.actualWeight,
            setsCompleted: latest.sets.filter((set) => set.repsCompleted >= latest.targetReps).length,
            repsCompleted: latest.sets.reduce((sum, set) => sum + set.repsCompleted, 0),
            notes: latest.notes ?? latest.workout.notes,
            success: latest.completed
          }
        : null;
    })
  );
  const filtered = summaries.filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  return Object.fromEntries(filtered.map((summary) => [summary.exerciseId, summary]));
}

export async function completeWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: workoutInclude
  });
  if (!workout) throw new Error("Workout not found");

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
  const completedAt = new Date();

  for (const entry of workout.exercises) {
    const success = entry.sets.every((set) => set.repsCompleted >= entry.targetReps && set.weightUsed >= entry.actualWeight);
    const increment = incrementForExercise(entry.exercise.slug, settings);
    const progression = applyProgression({
      success,
      currentWeight: entry.actualWeight,
      increment,
      deloadPercent: settings.deloadPercent,
      consecutiveFailures: entry.failureCount
    });

    const bestSet = [...entry.sets].sort((a, b) => b.repsCompleted * b.weightUsed - a.repsCompleted * a.weightUsed)[0];
    await prisma.workoutExercise.update({
      where: { id: entry.id },
      data: {
        completed: success,
        failureCount: progression.failureCount
      }
    });

    await prisma.workingWeight.upsert({
      where: { userId_exerciseId: { userId, exerciseId: entry.exerciseId } },
      create: {
        userId,
        exerciseId: entry.exerciseId,
        currentWeight: entry.actualWeight,
        nextWeight: progression.nextWeight,
        failureCount: progression.failureCount,
        successStreak: success ? 1 : 0,
        lastCompletedAt: completedAt,
        lastStatus: success ? "SUCCESS" : "FAILURE"
      },
      update: {
        currentWeight: entry.actualWeight,
        nextWeight: progression.nextWeight,
        failureCount: progression.failureCount,
        successStreak: success ? { increment: 1 } : 0,
        lastCompletedAt: completedAt,
        lastStatus: success ? "SUCCESS" : "FAILURE"
      }
    });

    if (bestSet && bestSet.repsCompleted > 0) {
      const e1rm = estimateOneRepMax(bestSet.weightUsed, bestSet.repsCompleted);
      const existing = await prisma.personalRecord.findFirst({
        where: { userId, exerciseId: entry.exerciseId },
        orderBy: { estimatedOneRepMax: "desc" }
      });
      if (!existing || e1rm > existing.estimatedOneRepMax) {
        await prisma.personalRecord.create({
          data: {
            userId,
            exerciseId: entry.exerciseId,
            weight: bestSet.weightUsed,
            reps: bestSet.repsCompleted,
            estimatedOneRepMax: e1rm,
            date: completedAt
          }
        });
      }
    }
  }

  return prisma.workout.update({
    where: { id: workoutId },
    data: { status: "COMPLETED", workoutDate: completedAt },
    include: workoutInclude
  });
}

function incrementForExercise(slug: string, settings: {
  squatIncrement: number;
  benchIncrement: number;
  rowIncrement: number;
  pressIncrement: number;
  deadliftIncrement: number;
}) {
  switch (slug) {
    case "squat":
      return settings.squatIncrement;
    case "bench-press":
      return settings.benchIncrement;
    case "barbell-row":
      return settings.rowIncrement;
    case "overhead-press":
      return settings.pressIncrement;
    case "deadlift":
      return settings.deadliftIncrement;
    default:
      return 2.5;
  }
}

export function workoutLabel(type: WorkoutType) {
  return `Workout ${type}`;
}
