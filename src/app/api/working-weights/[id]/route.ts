import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workingWeightSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const input = workingWeightSchema.parse(await request.json());
  const existing = await prisma.workingWeight.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Working weight not found" }, { status: 404 });
  const workingWeight = await prisma.workingWeight.update({ where: { id }, data: input, include: { exercise: true } });
  return NextResponse.json({ workingWeight });
}

