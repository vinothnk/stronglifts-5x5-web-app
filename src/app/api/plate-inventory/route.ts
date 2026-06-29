import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { plateInventorySchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plates = await prisma.plateInventory.findMany({ where: { userId: user.id }, orderBy: { weight: "desc" } });
  return NextResponse.json({ plates });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = plateInventorySchema.parse(await request.json());
  await prisma.$transaction(async (tx) => {
    await tx.plateInventory.deleteMany({ where: { userId: user.id } });
    await tx.plateInventory.createMany({ data: input.plates.map((plate) => ({ ...plate, userId: user.id })) });
  });
  const plates = await prisma.plateInventory.findMany({ where: { userId: user.id }, orderBy: { weight: "desc" } });
  return NextResponse.json({ plates });
}

