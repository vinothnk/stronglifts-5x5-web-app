import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { WorkingWeightsView } from "@/components/working-weights-view";

export default async function WorkingWeightsPage() {
  const user = await requireUser();
  if (!user) return null;
  const rows = await prisma.workingWeight.findMany({
    where: { userId: user.id },
    include: { exercise: true },
    orderBy: { exercise: { name: "asc" } }
  });
  return <WorkingWeightsView initialRows={rows} units={user.settings?.units ?? "METRIC"} />;
}

