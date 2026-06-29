import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workoutInclude } from "@/lib/workouts";

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
    dailyNotes: await prisma.dailyNote.findMany({ where: { userId: user.id } })
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
    await tx.dailyNote.deleteMany({ where: { userId: user.id } });
    await tx.bodyWeightEntry.deleteMany({ where: { userId: user.id } });
    await tx.personalRecord.deleteMany({ where: { userId: user.id } });
    await tx.workout.deleteMany({ where: { userId: user.id } });

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
          darkMode: Boolean(backup.settings.darkMode)
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
          darkMode: Boolean(backup.settings.darkMode)
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
            create: workout.exercises.map((entry: { exercise: { slug: string }; targetWeight: number; actualWeight: number; targetSets: number; targetReps: number; completed: boolean; failureCount: number; notes?: string; sets: { setNumber: number; repsCompleted: number; weightUsed: number }[] }) => ({
              exercise: { connect: { slug: entry.exercise.slug } },
              targetWeight: Number(entry.targetWeight),
              actualWeight: Number(entry.actualWeight),
              targetSets: Number(entry.targetSets),
              targetReps: Number(entry.targetReps),
              completed: Boolean(entry.completed),
              failureCount: Number(entry.failureCount ?? 0),
              notes: entry.notes,
              sets: { createMany: { data: entry.sets.map((set) => ({ setNumber: Number(set.setNumber), repsCompleted: Number(set.repsCompleted), weightUsed: Number(set.weightUsed) })) } }
            }))
          }
        }
      });
    }
  });

  return NextResponse.json({ ok: true, message: "Database restored from backup." });
}
