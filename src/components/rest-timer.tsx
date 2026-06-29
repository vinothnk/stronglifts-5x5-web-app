"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square } from "lucide-react";

const REST_BLOCK_SECONDS = 90;
const MAX_REST_SECONDS = REST_BLOCK_SECONDS * 2;

type RestTimerProps = {
  exerciseName: string;
  completedSetNumber: number;
  nextSetNumber: number | null;
  onStartNextSet: () => void;
  onEnd: () => void;
};

function ringBell() {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AudioContextClass) {
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
    gain.connect(context.destination);

    [880, 1174].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.18);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.18);
      oscillator.stop(context.currentTime + index * 0.18 + 0.28);
    });
  }
  navigator.vibrate?.([180, 80, 180]);
}

export function RestTimer({ exerciseName, completedSetNumber, nextSetNumber, onStartNextSet, onEnd }: RestTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [extended, setExtended] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState<number[]>([]);
  const targetSeconds = extended ? MAX_REST_SECONDS : REST_BLOCK_SECONDS;
  const left = Math.max(0, targetSeconds - elapsed);
  const canExtend = elapsed >= REST_BLOCK_SECONDS && !extended;

  useEffect(() => {
    setElapsed(0);
    setRunning(true);
    setExtended(false);
    setNotifiedAt([]);
  }, [exerciseName, completedSetNumber, nextSetNumber]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => Math.min(MAX_REST_SECONDS, value + 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (elapsed < REST_BLOCK_SECONDS || notifiedAt.includes(REST_BLOCK_SECONDS)) return;
    ringBell();
    if (!extended) setRunning(false);
    setNotifiedAt((current) => [...current, REST_BLOCK_SECONDS]);
  }, [elapsed, extended, notifiedAt]);

  useEffect(() => {
    if (elapsed < MAX_REST_SECONDS || notifiedAt.includes(MAX_REST_SECONDS)) return;
    ringBell();
    setNotifiedAt((current) => [...current, MAX_REST_SECONDS]);
    onStartNextSet();
  }, [elapsed, notifiedAt, onStartNextSet]);

  const label = useMemo(() => `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`, [left]);

  return (
    <aside className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96" role="dialog" aria-live="polite" aria-label="Rest timer">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rest timer</p>
          <h3 className="mt-1 font-semibold">{exerciseName} set {completedSetNumber} complete</h3>
          <p className="mt-1 text-sm text-slate-500">{nextSetNumber ? `Next: set ${nextSetNumber}` : "Last set complete"}</p>
        </div>
        <span className="tabular-nums text-3xl font-bold">{label}</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button aria-label="Start timer" onClick={() => setRunning(true)} className="grid size-10 place-items-center rounded-md border border-slate-200 dark:border-slate-700"><Play className="size-4" /></button>
        <button aria-label="Pause timer" onClick={() => setRunning(false)} className="grid size-10 place-items-center rounded-md border border-slate-200 dark:border-slate-700"><Pause className="size-4" /></button>
        <button aria-label="End timer" onClick={onEnd} className="grid size-10 place-items-center rounded-md border border-slate-200 dark:border-slate-700"><Square className="size-4" /></button>
        <div className="ml-auto text-sm text-slate-500">{extended ? "Extended rest" : "90 sec rest"}</div>
      </div>

      {elapsed >= REST_BLOCK_SECONDS && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={onStartNextSet} className="rounded-md bg-mint px-4 py-2 font-semibold text-white">{nextSetNumber ? "Start next set" : "Finish rest"}</button>
          {canExtend && <button onClick={() => { setExtended(true); setRunning(true); }} className="rounded-md border border-slate-200 px-4 py-2 font-semibold dark:border-slate-700">Extend 90 sec</button>}
        </div>
      )}
    </aside>
  );
}
