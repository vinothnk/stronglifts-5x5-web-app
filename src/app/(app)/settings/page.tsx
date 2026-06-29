import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsView } from "@/components/settings-view";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) return null;
  const plates = await prisma.plateInventory.findMany({ where: { userId: user.id }, orderBy: { weight: "desc" } });
  return <SettingsView initialSettings={user.settings} initialPlates={plates} />;
}
