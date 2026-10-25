"use client";

import { useMemo, useState } from "react";
import {
  buildAtoms, allEvents, seriesFor, CURRENT, MONTHS, KIND_LABEL, versionAt,
  type DriftKind,
} from "./drift";

const KIND_STYLE: Record<DriftKind, string> = {
  split: "border-red-600/50 text-red-800 dark:border-red-400/40 dark:text-red-300",
  merge: "border-amber-600/50 text-amber-800 dark:border-amber-400/40 dark:text-amber-300",
  shift: "border-amber-600/50 text-amber-800 dark:border-amber-400/40 dark:text-amber-300",
  rename: "border-foreground/25 text-foreground/60",
};

const W = 640, H = 150, PAD = 6;

export function Monitor() {
  const [themeId, setThemeId] = useState("t-data");
  const [reconcile, setReconcile] = useState(true);

  const atoms = useMemo(() => buildAtoms(), []);
  const events = useMemo(() => allEvents(), []);
  const s = useMemo(() => seriesFor(themeId, atoms, events), [themeId, atoms, events]);

  const max = Math.max(1, ...s.reconciled, ...s.asLabelled.map((v) => v ?? 0));
  const x = (m: number) => PAD + (m / (MONTHS - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, m) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  // The comparison a report actually makes: this quarter against the last.
  const q = (vals: (number | null)[], from: number, to: number) => {
    const slice = vals.slice(from, to).filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) : null;
  };
  const labelledNow = q(s.asLabelled, 21, 24), labelledPrev = q(s.asLabelled, 9, 12);
  const trueNow = q(s.reconciled, 21, 24), truePrev = q(s.reconciled, 9, 12);
  const change = (a: number | null, b: number | null) =>
    a === null || b === null || b === 0 ? null : ((a - b) / b) * 100;
  const reported = change(labelledNow, labelledPrev);
  const actual = change(trueNow, truePrev);
  const misleading = reported !== null && actual !== null && Math.abs(reported - actual) > 10;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {CURRENT.themes.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setThemeId(t.id)}
            className={`rounded border px-2 py-1 text-[11.5px] transition-colors ${
              themeId === t.id ? "border-foreground/40 bg-foreground/10"
                : "border-foreground/15 text-foreground/65 hover:border-foreground/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {misleading && (
        <div className="rounded-lg border border-red-600/50 bg-red-500/10 px-4 py-3">
          <div className="text-[14px] font-semibold text-red-800 dark:text-red-300">
            This trend line is not comparable across the year
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-red-900/90 dark:text-red-200/90">
            Your report says &ldquo;{s.label}&rdquo; moved{" "}
            <strong>{reported! > 0 ? "+" : ""}{reported!.toFixed(0)}%</strong> this quarter against
            Q2. Restated under today&rsquo;s taxonomy it actually moved{" "}
            <strong>{actual! > 0 ? "+" : ""}{actual!.toFixed(0)}%</strong>. The difference is a
            change of grouping, not a change in what customers said.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-foreground/12 px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
             aria-label={`Monthly mentions of ${s.label}, as labelled at the time against the reconciled series`}>
          {events.map((e) => (
            <line key={`${e.kind}-${e.month}-${e.before.join()}`}
                  x1={x(e.month)} x2={x(e.month)} y1={PAD} y2={H - PAD}
                  stroke="currentColor"
                  className={e.touches.includes(themeId) ? "text-red-500/50" : "text-foreground/12"}
                  strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {reconcile && (
            <path d={path(s.reconciled)} fill="none" stroke="currentColor"
                  className="text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          )}
          <path d={path(s.asLabelled)} fill="none" stroke="currentColor"
                className="text-red-600 dark:text-red-400" strokeWidth={2} strokeDasharray="5 3" />
        </svg>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-red-600 dark:border-red-400" />
            what the dashboard showed
          </span>
          {reconcile && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-emerald-600 dark:border-emerald-400" />
              restated under today&rsquo;s taxonomy
            </span>
          )}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={reconcile} onChange={(e) => setReconcile(e.target.checked)}
                   className="accent-foreground/70" />
            reconcile history
          </label>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-foreground/45">
          24 months. Dashed vertical lines are taxonomy changes; red ones touch this theme.
          Where the dashed series stops, the theme did not exist under that name yet —
          {" "}{s.asLabelled.filter((v) => v === null).length} of {MONTHS} months here.
          Currently on taxonomy {versionAt(MONTHS - 1).label}.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold">
          Taxonomy changes{" "}
          <span className="font-mono text-[11px] font-normal text-foreground/50">
            {events.length} in 24 months · {s.events.length} affecting {s.label}
          </span>
        </h2>
        <div className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/12">
          {events.map((e) => {
            const mine = e.touches.includes(themeId);
            return (
              <div key={`${e.kind}-${e.month}-${e.before.join()}-${e.after.join()}`}
                   className={`px-3 py-2.5 ${mine ? "bg-foreground/[0.03]" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[10.5px] text-foreground/40">month {e.month}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${KIND_STYLE[e.kind]}`}>
                    {KIND_LABEL[e.kind]}
                  </span>
                  <span className="text-[12px] [overflow-wrap:anywhere]">
                    {e.before.join(" + ")} <span className="text-foreground/40">→</span> {e.after.join(" + ")}
                  </span>
                  {mine && <span className="ml-auto font-mono text-[10.5px] text-red-700 dark:text-red-400">affects this theme</span>}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/60">{e.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
