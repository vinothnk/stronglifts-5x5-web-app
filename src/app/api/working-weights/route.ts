import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.workingWeight.findMany({
    where: { userId: user.id },
    include: { exercise: true },
    orderBy: { exercise: { name: "asc" } }
  });
  return NextResponse.json({ workingWeights: rows });
}

