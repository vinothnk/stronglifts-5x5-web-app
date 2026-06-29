import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { BodyWeightView } from "@/components/body-weight-view";

export default async function BodyWeightPage() {
  const user = await requireUser();
  if (!user) return null;
  const entries = await prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });
  return <BodyWeightView initialEntries={entries} units={user.settings?.units ?? "METRIC"} />;
}

