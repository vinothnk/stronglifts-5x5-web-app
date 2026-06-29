import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ASSISTANCE_LIBRARY, DEFAULT_PLATES_KG, EXERCISE_LIBRARY, PROGRAM, STARTING_WEIGHTS } from "../src/lib/program";

const prisma = new PrismaClient();

async function main() {
  for (const exercise of EXERCISE_LIBRARY) {
    await prisma.exercise.upsert({
      where: { slug: exercise.slug },
      update: exercise,
      create: exercise
    });
  }

  for (const assistance of ASSISTANCE_LIBRARY) {
    await prisma.assistanceExercise.upsert({
      where: { slug: assistance.slug },
      update: { name: assistance.name, category: assistance.category },
      create: assistance
    });
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@stronglifts.local" },
    update: {},
    create: {
      email: "demo@stronglifts.local",
      passwordHash,
      settings: { create: { onboardingComplete: true } }
    }
  });

  const exercises = await prisma.exercise.findMany();
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

  for (const exercise of exercises) {
    await prisma.workingWeight.upsert({
      where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
      update: {},
      create: {
        userId: user.id,
        exerciseId: exercise.id,
        currentWeight: STARTING_WEIGHTS[exercise.slug] ?? 20,
        nextWeight: STARTING_WEIGHTS[exercise.slug] ?? 20
      }
    });
  }

  for (const plate of DEFAULT_PLATES_KG) {
    await prisma.plateInventory.upsert({
      where: { userId_weight_unit: { userId: user.id, weight: plate, unit: "METRIC" } },
      update: {},
      create: { userId: user.id, weight: plate, count: plate >= 20 ? 4 : 2, unit: "METRIC" }
    });
  }

  const existing = await prisma.workout.count({ where: { userId: user.id } });
  if (existing === 0) {
    const dates = [18, 16, 14, 11, 9, 7].map((daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    });

    for (const [index, date] of dates.entries()) {
      const type = index % 2 === 0 ? "A" : "B";
      const workout = await prisma.workout.create({
        data: {
          userId: user.id,
          workoutType: type,
          status: "COMPLETED",
          workoutDate: date,
          notes: index === 0 ? "Seeded demo workout. Felt solid." : null
        }
      });

      for (const item of PROGRAM[type]) {
        const exercise = bySlug.get(item.slug);
        if (!exercise) continue;
        const weight = item.slug === "deadlift" ? 80 + index * 5 : 40 + index * 2.5;
        await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            targetWeight: weight,
            actualWeight: weight,
            targetSets: item.sets,
            targetReps: item.reps,
            completed: true,
            sets: {
              createMany: {
                data: Array.from({ length: item.sets }, (_, setIndex) => ({
                  setNumber: setIndex + 1,
                  repsCompleted: item.reps,
                  weightUsed: weight
                }))
              }
            }
          }
        });
      }
    }

    await prisma.bodyWeightEntry.createMany({
      data: dates.map((date, index) => ({
        userId: user.id,
        date,
        weight: 82.5 - index * 0.2
      }))
    });

    for (const exercise of exercises) {
      const latest = await prisma.workoutExercise.findFirst({
        where: { workout: { userId: user.id, status: "COMPLETED" }, exerciseId: exercise.id },
        orderBy: { workout: { workoutDate: "desc" } },
        include: { workout: true }
      });
      if (latest) {
        await prisma.workingWeight.update({
          where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
          data: {
            currentWeight: latest.targetWeight,
            nextWeight: latest.targetWeight,
            lastCompletedAt: latest.workout.workoutDate,
            lastStatus: "SUCCESS",
            successStreak: 1
          }
        });
      }
    }
  }

  console.log("Seed complete: demo@stronglifts.local / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
