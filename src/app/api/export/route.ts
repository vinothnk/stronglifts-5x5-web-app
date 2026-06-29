import ExcelJS from "exceljs";
import Papa from "papaparse";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workoutInclude } from "@/lib/workouts";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = new URL(request.url).searchParams.get("format") ?? "csv";

  const [workouts, bodyWeights] = await Promise.all([
    prisma.workout.findMany({ where: { userId: user.id }, orderBy: { workoutDate: "asc" }, include: workoutInclude }),
    prisma.bodyWeightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } })
  ]);

  const rows = workouts.flatMap((workout) =>
    workout.exercises.flatMap((entry) =>
      entry.sets.map((set) => ({
        date: workout.workoutDate.toISOString(),
        workoutType: workout.workoutType,
        exercise: entry.exercise.name,
        targetWeight: entry.targetWeight,
        actualWeight: entry.actualWeight,
        setNumber: set.setNumber,
        repsCompleted: set.repsCompleted,
        weightUsed: set.weightUsed,
        notes: entry.notes ?? ""
      }))
    )
  );

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const workoutSheet = workbook.addWorksheet("Workouts");
    workoutSheet.columns = Object.keys(rows[0] ?? { date: "", workoutType: "", exercise: "" }).map((key) => ({ header: key, key }));
    workoutSheet.addRows(rows);
    const weightSheet = workbook.addWorksheet("Body Weight");
    weightSheet.columns = [
      { header: "date", key: "date" },
      { header: "weight", key: "weight" }
    ];
    weightSheet.addRows(bodyWeights.map((entry) => ({ date: entry.date.toISOString(), weight: entry.weight })));
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=stronglifts-export.xlsx"
      }
    });
  }

  return new NextResponse(Papa.unparse(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=stronglifts-workouts.csv"
    }
  });
}

