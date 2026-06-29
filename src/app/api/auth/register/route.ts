import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authSchema } from "@/lib/validation";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const input = authSchema.parse(await request.json());
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) return NextResponse.json({ error: "Email is already registered." }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        settings: { create: {} }
      }
    });

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed." }, { status: 400 });
  }
}

