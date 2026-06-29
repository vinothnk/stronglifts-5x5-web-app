import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { NotesView } from "@/components/notes-view";

export default async function NotesPage() {
  const user = await requireUser();
  if (!user) return null;
  const notes = await prisma.dailyNote.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } });
  return <NotesView initialNotes={notes} />;
}

