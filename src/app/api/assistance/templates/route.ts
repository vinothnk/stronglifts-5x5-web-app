import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  items: z.array(z.object({
    assistanceExerciseId: z.string(),
    sets: z.number().int().min(1).max(20),
    reps: z.number().int().min(0).max(100),
    weight: z.number().min(0).max(1000).optional().nullable(),
    notes: z.string().max(1000).optional().nullable()
  })).min(1).max(20)
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = templateSchema.parse(await request.json());
  const template = await prisma.assistanceTemplate.create({
    data: {
      userId: user.id,
      name: input.name,
      items: { createMany: { data: input.items } }
    },
    include: { items: { include: { assistanceExercise: true } } }
  });
  return NextResponse.json({ template }, { status: 201 });
}

