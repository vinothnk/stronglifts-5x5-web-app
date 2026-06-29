import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const noteSchema = z.object({
  date: z.coerce.date(),
  content: z.string().min(1).max(4000)
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notes = await prisma.dailyNote.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } });
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = noteSchema.parse(await request.json());
  const note = await prisma.dailyNote.create({ data: { userId: user.id, ...input } });
  return NextResponse.json({ note }, { status: 201 });
}

