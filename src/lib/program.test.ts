import { describe, expect, it } from "vitest";
import { applyProgression, calculatePlates, estimateOneRepMax, generateWarmupSets, nextWorkoutType } from "@/lib/program";

describe("StrongLifts program logic", () => {
  it("alternates workout A and B", () => {
    expect(nextWorkoutType(null)).toBe("A");
    expect(nextWorkoutType("A")).toBe("B");
    expect(nextWorkoutType("B")).toBe("A");
  });

  it("increments successful lifts", () => {
    expect(applyProgression({ success: true, currentWeight: 100, increment: 2.5, deloadPercent: 10, consecutiveFailures: 2 })).toEqual({
      nextWeight: 102.5,
      failureCount: 0,
      deloaded: false
    });
  });

  it("deloads after three consecutive failures", () => {
    expect(applyProgression({ success: false, currentWeight: 100, increment: 2.5, deloadPercent: 10, consecutiveFailures: 2 })).toEqual({
      nextWeight: 90,
      failureCount: 0,
      deloaded: true
    });
  });

  it("estimates one-rep max with the Epley formula", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it("generates editable warm-up recommendations from working weight", () => {
    expect(generateWarmupSets(100, 20)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 40, reps: 5 },
      { weight: 60, reps: 3 },
      { weight: 80, reps: 1 }
    ]);
  });

  it("loads plates with inventory limits", () => {
    expect(
      calculatePlates({
        targetWeight: 100,
        barWeight: 20,
        inventory: [
          { weight: 20, count: 4 },
          { weight: 10, count: 2 },
          { weight: 5, count: 2 }
        ]
      })
    ).toMatchObject({ loadable: true, perSide: [{ weight: 20, count: 2 }] });
  });
});
