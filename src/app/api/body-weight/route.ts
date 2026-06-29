import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bodyWeightSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = bodyWeightSchema.parse(await request.json());
  const entry = await prisma.bodyWeightEntry.create({ data: { userId: user.id, weight: input.weight, date: input.date } });
  return NextResponse.json({ entry }, { status: 201 });
}

