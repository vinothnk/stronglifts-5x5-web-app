import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWorkoutSchema } from "@/lib/validation";
import { completeWorkout, workoutInclude } from "@/lib/workouts";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const workout = await prisma.workout.findFirst({ where: { id, userId: user.id }, include: workoutInclude });
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  return NextResponse.json({ workout });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const input = saveWorkoutSchema.parse(await request.json());

  const workout = await prisma.workout.findFirst({ where: { id, userId: user.id }, include: workoutInclude });
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  await prisma.$transaction(
    input.exercises.map((exercise) =>
      prisma.workoutExercise.update({
        where: { id: exercise.id },
        data: {
          actualWeight: exercise.actualWeight,
          completed: exercise.completed,
          notes: exercise.notes,
          warmupSets: {
            deleteMany: {},
            createMany: {
              data: exercise.warmupSets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                weight: set.weight,
                completed: set.completed
              }))
            }
          },
          sets: {
            deleteMany: {},
            createMany: {
              data: exercise.sets.map((set) => ({
                setNumber: set.setNumber,
                repsCompleted: set.repsCompleted,
                weightUsed: set.weightUsed
              }))
            }
          }
        }
      })
    )
  );

  await prisma.workout.update({
    where: { id },
    data: {
      notes: input.notes,
      assistanceExercises: {
        deleteMany: {},
        createMany: {
          data: input.assistanceExercises.map((entry) => ({
            assistanceExerciseId: entry.assistanceExerciseId ?? null,
            name: entry.name,
            category: entry.category,
            weight: entry.weight,
            sets: entry.sets,
            reps: entry.reps,
            notes: entry.notes,
            completed: entry.completed
          }))
        }
      }
    }
  });
  const saved = input.status === "COMPLETED" ? await completeWorkout(user.id, id) : await prisma.workout.findUnique({ where: { id }, include: workoutInclude });
  return NextResponse.json({ workout: saved });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const workout = await prisma.workout.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  await prisma.workout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
