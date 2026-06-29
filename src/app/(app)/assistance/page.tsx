import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssistanceView } from "@/components/assistance-view";

export default async function AssistancePage() {
  const user = await requireUser();
  if (!user) return null;
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
  return <AssistanceView initialExercises={exercises} initialTemplates={templates} />;
}

