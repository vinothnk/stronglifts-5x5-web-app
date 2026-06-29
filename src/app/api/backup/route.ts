import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workoutInclude } from "@/lib/workouts";

type BackupExercise = {
  name: string;
  slug: string;
  defaultSets: number;
  defaultReps: number;
  defaultIncrementKg: number;
};

type BackupAssistanceExercise = {
  name: string;
  slug: string;
  category: string;
  custom?: boolean;
  userId?: string | null;
};

type BackupWorkoutExercise = {
  exercise: BackupExercise;
  targetWeight: number;
  actualWeight: number;
  targetSets: number;
  targetReps: number;
  completed: boolean;
  failureCount: number;
  notes?: string;
  sets: { setNumber: number; repsCompleted: number; weightUsed: number }[];
  warmupSets?: { setNumber: number; reps: number; weight: number; completed?: boolean }[];
};

type BackupWorkoutAssistance = {
  name: string;
  category: string;
  weight?: number | null;
  sets: number;
  reps: number;
  notes?: string | null;
  completed?: boolean;
};

type BackupTemplateItem = {
  assistanceExercise: BackupAssistanceExercise;
  sets: number;
  reps: number;
  weight?: number | null;
  notes?: string | null;
};

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = {
    exportedAt: new Date().toISOString(),
    user: { email: user.email },
    settings: await prisma.userSettings.findUnique({ where: { userId: user.id } }),
    workouts: await prisma.workout.findMany({ where: { userId: user.id }, include: workoutInclude }),
    bodyWeights: await prisma.bodyWeightEntry.findMany({ where: { userId: user.id } }),
    personalRecords: await prisma.personalRecord.findMany({ where: { userId: user.id }, include: { exercise: true } }),
    dailyNotes: await prisma.dailyNote.findMany({ where: { userId: user.id } }),
    workingWeights: await prisma.workingWeight.findMany({ where: { userId: user.id }, include: { exercise: true } }),
    plateInventory: await prisma.plateInventory.findMany({ where: { userId: user.id } }),
    assistanceExercises: await prisma.assistanceExercise.findMany({ where: { userId: user.id } }),
    assistanceTemplates: await prisma.assistanceTemplate.findMany({
      where: { userId: user.id },
      include: { items: { include: { assistanceExercise: true } } }
    })
  };

  return NextResponse.json(data, {
    headers: { "Content-Disposition": "attachment; filename=stronglifts-backup.json" }
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const backup = await request.json();
  if (!Array.isArray(backup.bodyWeights) || !Array.isArray(backup.workouts)) {
    return NextResponse.json({ error: "Invalid backup file." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const exercises = new Map<string, BackupExercise>();
    for (const workout of backup.workouts) {
      for (const entry of workout.exercises ?? []) {
        if (entry.exercise?.slug) exercises.set(entry.exercise.slug, entry.exercise);
      }
    }
    for (const row of backup.workingWeights ?? []) {
      if (row.exercise?.slug) exercises.set(row.exercise.slug, row.exercise);
    }
    for (const record of backup.personalRecords ?? []) {
      if (record.exercise?.slug) exercises.set(record.exercise.slug, record.exercise);
    }
    for (const exercise of exercises.values()) {
      await tx.exercise.upsert({
        where: { slug: exercise.slug },
        create: {
          name: String(exercise.name),
          slug: String(exercise.slug),
          defaultSets: Number(exercise.defaultSets),
          defaultReps: Number(exercise.defaultReps),
          defaultIncrementKg: Number(exercise.defaultIncrementKg)
        },
        update: {
          name: String(exercise.name),
          defaultSets: Number(exercise.defaultSets),
          defaultReps: Number(exercise.defaultReps),
          defaultIncrementKg: Number(exercise.defaultIncrementKg)
        }
      });
    }

    const sharedAssistance = new Map<string, BackupAssistanceExercise>();
    for (const template of backup.assistanceTemplates ?? []) {
      for (const item of template.items ?? []) {
        if (item.assistanceExercise?.slug && !item.assistanceExercise.userId) {
          sharedAssistance.set(item.assistanceExercise.slug, item.assistanceExercise);
        }
      }
    }
    for (const exercise of sharedAssistance.values()) {
      await tx.assistanceExercise.upsert({
        where: { slug: exercise.slug },
        create: {
          name: String(exercise.name),
          slug: String(exercise.slug),
          category: String(exercise.category),
          custom: Boolean(exercise.custom),
          userId: null
        },
        update: {
          name: String(exercise.name),
          category: String(exercise.category),
          custom: Boolean(exercise.custom)
        }
      });
    }

    await tx.assistanceTemplate.deleteMany({ where: { userId: user.id } });
    await tx.plateInventory.deleteMany({ where: { userId: user.id } });
    await tx.workingWeight.deleteMany({ where: { userId: user.id } });
    await tx.dailyNote.deleteMany({ where: { userId: user.id } });
    await tx.bodyWeightEntry.deleteMany({ where: { userId: user.id } });
    await tx.personalRecord.deleteMany({ where: { userId: user.id } });
    await tx.workout.deleteMany({ where: { userId: user.id } });
    await tx.assistanceExercise.deleteMany({ where: { userId: user.id } });

    if (backup.settings) {
      await tx.userSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          units: backup.settings.units,
          squatIncrement: Number(backup.settings.squatIncrement),
          benchIncrement: Number(backup.settings.benchIncrement),
          rowIncrement: Number(backup.settings.rowIncrement),
          pressIncrement: Number(backup.settings.pressIncrement),
          deadliftIncrement: Number(backup.settings.deadliftIncrement),
          deloadPercent: Number(backup.settings.deloadPercent),
          restSeconds: Number(backup.settings.restSeconds),
          deadliftRestSeconds: Number(backup.settings.deadliftRestSeconds),
          darkMode: Boolean(backup.settings.darkMode),
          barWeight: Number(backup.settings.barWeight ?? 20),
          startingSquat: Number(backup.settings.startingSquat ?? 20),
          startingBench: Number(backup.settings.startingBench ?? 20),
          startingRow: Number(backup.settings.startingRow ?? 30),
          startingPress: Number(backup.settings.startingPress ?? 20),
          startingDeadlift: Number(backup.settings.startingDeadlift ?? 40),
          onboardingComplete: Boolean(backup.settings.onboardingComplete)
        },
        update: {
          units: backup.settings.units,
          squatIncrement: Number(backup.settings.squatIncrement),
          benchIncrement: Number(backup.settings.benchIncrement),
          rowIncrement: Number(backup.settings.rowIncrement),
          pressIncrement: Number(backup.settings.pressIncrement),
          deadliftIncrement: Number(backup.settings.deadliftIncrement),
          deloadPercent: Number(backup.settings.deloadPercent),
          restSeconds: Number(backup.settings.restSeconds),
          deadliftRestSeconds: Number(backup.settings.deadliftRestSeconds),
          darkMode: Boolean(backup.settings.darkMode),
          barWeight: Number(backup.settings.barWeight ?? 20),
          startingSquat: Number(backup.settings.startingSquat ?? 20),
          startingBench: Number(backup.settings.startingBench ?? 20),
          startingRow: Number(backup.settings.startingRow ?? 30),
          startingPress: Number(backup.settings.startingPress ?? 20),
          startingDeadlift: Number(backup.settings.startingDeadlift ?? 40),
          onboardingComplete: Boolean(backup.settings.onboardingComplete)
        }
      });
    }

    for (const plate of backup.plateInventory ?? []) {
      await tx.plateInventory.create({
        data: {
          userId: user.id,
          weight: Number(plate.weight),
          count: Number(plate.count),
          unit: plate.unit
        }
      });
    }
    for (const exercise of backup.assistanceExercises ?? []) {
      await tx.assistanceExercise.create({
        data: {
          userId: user.id,
          name: String(exercise.name),
          slug: String(exercise.slug),
          category: String(exercise.category),
          custom: Boolean(exercise.custom)
        }
      });
    }
    for (const entry of backup.bodyWeights) {
      await tx.bodyWeightEntry.create({ data: { userId: user.id, weight: Number(entry.weight), date: new Date(entry.date) } });
    }
    for (const note of backup.dailyNotes ?? []) {
      await tx.dailyNote.create({ data: { userId: user.id, date: new Date(note.date), content: String(note.content) } });
    }
    for (const workout of backup.workouts) {
      await tx.workout.create({
        data: {
          userId: user.id,
          workoutType: workout.workoutType,
          status: workout.status,
          workoutDate: new Date(workout.workoutDate),
          notes: workout.notes,
          exercises: {
            create: workout.exercises.map((entry: BackupWorkoutExercise) => ({
              exercise: { connect: { slug: entry.exercise.slug } },
              targetWeight: Number(entry.targetWeight),
              actualWeight: Number(entry.actualWeight),
              targetSets: Number(entry.targetSets),
              targetReps: Number(entry.targetReps),
              completed: Boolean(entry.completed),
              failureCount: Number(entry.failureCount ?? 0),
              notes: entry.notes,
              sets: { createMany: { data: entry.sets.map((set) => ({ setNumber: Number(set.setNumber), repsCompleted: Number(set.repsCompleted), weightUsed: Number(set.weightUsed) })) } },
              warmupSets: {
                createMany: {
                  data: (entry.warmupSets ?? []).map((set: { setNumber: number; reps: number; weight: number; completed?: boolean }) => ({
                    setNumber: Number(set.setNumber),
                    reps: Number(set.reps),
                    weight: Number(set.weight),
                    completed: Boolean(set.completed)
                  }))
                }
              }
            }))
          },
          assistanceExercises: {
            create: (workout.assistanceExercises ?? []).map((entry: BackupWorkoutAssistance) => ({
              name: String(entry.name),
              category: String(entry.category),
              weight: entry.weight == null ? null : Number(entry.weight),
              sets: Number(entry.sets),
              reps: Number(entry.reps),
              notes: entry.notes,
              completed: Boolean(entry.completed)
            }))
          }
        }
      });
    }
    for (const row of backup.workingWeights ?? []) {
      await tx.workingWeight.create({
        data: {
          user: { connect: { id: user.id } },
          exercise: { connect: { slug: row.exercise.slug } },
          currentWeight: Number(row.currentWeight),
          nextWeight: Number(row.nextWeight),
          failureCount: Number(row.failureCount ?? 0),
          successStreak: Number(row.successStreak ?? 0),
          lastCompletedAt: row.lastCompletedAt ? new Date(row.lastCompletedAt) : null,
          lastStatus: row.lastStatus
        }
      });
    }
    for (const record of backup.personalRecords ?? []) {
      await tx.personalRecord.create({
        data: {
          user: { connect: { id: user.id } },
          exercise: { connect: { slug: record.exercise.slug } },
          weight: Number(record.weight),
          reps: Number(record.reps),
          estimatedOneRepMax: Number(record.estimatedOneRepMax),
          date: new Date(record.date)
        }
      });
    }
    for (const template of backup.assistanceTemplates ?? []) {
      await tx.assistanceTemplate.create({
        data: {
          userId: user.id,
          name: String(template.name),
          items: {
            create: template.items.map((item: BackupTemplateItem) => ({
              assistanceExercise: { connect: { slug: item.assistanceExercise.slug } },
              sets: Number(item.sets),
              reps: Number(item.reps),
              weight: item.weight == null ? null : Number(item.weight),
              notes: item.notes
            }))
          }
        }
      });
    }
  });

  return NextResponse.json({ ok: true, message: "Database restored from backup." });
}
