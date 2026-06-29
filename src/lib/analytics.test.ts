import { describe, expect, it } from "vitest";
import { progressionSeriesByExercise, totalVolume, weeklyAverage } from "@/lib/analytics";

describe("analytics helpers", () => {
  it("calculates total lifted volume", () => {
    expect(
      totalVolume([
        {
          workoutDate: new Date(),
          exercises: [
            {
              actualWeight: 100,
              exercise: { name: "Squat", slug: "squat" },
              sets: [
                { repsCompleted: 5, weightUsed: 100 },
                { repsCompleted: 5, weightUsed: 100 }
              ]
            }
          ]
        }
      ])
    ).toBe(1000);
  });

  it("groups body weight into weekly averages", () => {
    expect(
      weeklyAverage([
        { date: new Date("2026-06-15"), weight: 80 },
        { date: new Date("2026-06-16"), weight: 82 }
      ])
    ).toEqual([{ date: "2026-06-14", weight: 81 }]);
  });

  it("groups progression rows by exercise", () => {
    expect(
      progressionSeriesByExercise([
        {
          workoutDate: new Date("2026-06-15"),
          exercises: [
            { actualWeight: 100, exercise: { name: "Squat", slug: "squat" }, sets: [] },
            { actualWeight: 60, exercise: { name: "Bench Press", slug: "bench-press" }, sets: [] }
          ]
        },
        {
          workoutDate: new Date("2026-06-17"),
          exercises: [{ actualWeight: 102.5, exercise: { name: "Squat", slug: "squat" }, sets: [] }]
        }
      ])
    ).toEqual([
      {
        exercise: "Squat",
        rows: [
          { date: "2026-06-15", weight: 100 },
          { date: "2026-06-17", weight: 102.5 }
        ]
      },
      { exercise: "Bench Press", rows: [{ date: "2026-06-15", weight: 60 }] }
    ]);
  });
});
