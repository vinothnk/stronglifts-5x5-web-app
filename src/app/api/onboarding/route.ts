import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLATES_KG } from "@/lib/program";
import { settingsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = settingsSchema.parse(await request.json());
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...input, onboardingComplete: true },
    update: { ...input, onboardingComplete: true }
  });

  const exercises = await prisma.exercise.findMany();
  const starts: Record<string, number> = {
    squat: settings.startingSquat,
    "bench-press": settings.startingBench,
    "barbell-row": settings.startingRow,
    "overhead-press": settings.startingPress,
    deadlift: settings.startingDeadlift
  };

  await prisma.$transaction(async (tx) => {
    for (const exercise of exercises) {
      await tx.workingWeight.upsert({
        where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } },
        create: {
          userId: user.id,
          exerciseId: exercise.id,
          currentWeight: starts[exercise.slug] ?? 20,
          nextWeight: starts[exercise.slug] ?? 20
        },
        update: {
          currentWeight: starts[exercise.slug] ?? 20,
          nextWeight: starts[exercise.slug] ?? 20
        }
      });
    }
    for (const plate of DEFAULT_PLATES_KG) {
      await tx.plateInventory.upsert({
        where: { userId_weight_unit: { userId: user.id, weight: plate, unit: "METRIC" } },
        create: { userId: user.id, weight: plate, count: plate >= 20 ? 4 : 2, unit: "METRIC" },
        update: {}
      });
    }
  });

  return NextResponse.json({ settings });
}

