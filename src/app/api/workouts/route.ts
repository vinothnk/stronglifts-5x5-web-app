import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDraftWorkout, workoutInclude } from "@/lib/workouts";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const exercise = url.searchParams.get("exercise");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const workouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      status: "COMPLETED",
      workoutDate: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined
      },
      exercises: exercise ? { some: { exercise: { slug: exercise } } } : undefined
    },
    include: workoutInclude,
    orderBy: { workoutDate: "desc" }
  });

  return NextResponse.json({ workouts });
}

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.workout.findFirst({
    where: { userId: user.id, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    include: workoutInclude
  });

  return NextResponse.json({ workout: existing ?? (await createDraftWorkout(user.id)) }, { status: 201 });
}

