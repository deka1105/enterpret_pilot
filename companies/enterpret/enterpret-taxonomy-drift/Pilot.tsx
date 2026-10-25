import { DemoBanner } from "@/lib/app-shell";
import { DEMO_NOTE } from "./drift";
import { Monitor } from "./Monitor";

/**
 * Taxonomy drift monitor — Enterpret P-1.
 *
 * Stateless: the corpus and the four taxonomy versions are fixtures, and every
 * number is a sum over them computed in the browser.
 */
export default function TaxonomyDriftPilot() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
      <DemoBanner>{DEMO_NOTE}</DemoBanner>

      <h1 className="text-lg font-semibold tracking-tight">
        Your theme trends are comparing different things either side of a taxonomy change
      </h1>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-foreground/65">
        An adaptive taxonomy is the right design — categories should follow the language customers
        actually use. But when a theme splits, merges or quietly absorbs a topic, every trend line
        crossing that month changes meaning, and nothing on the chart says so.
      </p>

      <div className="mt-6">
        <Monitor />
      </div>
    </div>
  );
}
