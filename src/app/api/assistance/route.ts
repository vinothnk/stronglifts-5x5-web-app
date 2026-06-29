import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/program";

const customExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80)
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [exercises, templates] = await Promise.all([
    prisma.assistanceExercise.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.assistanceTemplate.findMany({
      where: { userId: user.id },
      include: { items: { include: { assistanceExercise: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  return NextResponse.json({ exercises, templates });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = customExerciseSchema.parse(await request.json());
  const exercise = await prisma.assistanceExercise.create({
    data: {
      userId: user.id,
      name: input.name,
      category: input.category,
      custom: true,
      slug: `${slugify(input.name)}-${user.id.slice(0, 6)}-${Date.now()}`
    }
  });
  return NextResponse.json({ exercise }, { status: 201 });
}

