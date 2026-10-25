import type { ComponentType } from "react";

/**
 * The pilots built for Enterpret.
 *
 * Extracted from the pilot factory; each entry points at a folder under
 * `companies/enterpret/`. Adding one by hand means creating that folder and
 * appending here, exactly as in the source repo.
 */
export type Pilot = {
  slug: string;
  title: string;
  company: string;
  useCase: string;
  demo: string;
  built: string;
  tier: "eval" | "outreach";
  load: () => Promise<{ default: ComponentType }>;
};

export const pilots: Pilot[] = [
  {
    slug: "enterpret-taxonomy-drift",
    title: "Taxonomy drift monitor",
    company: "enterpret",
    useCase: "UC-2",
    demo: "Seven taxonomy changes in 24 months, found by comparing groupings rather than labels \\u2014 and \\u201cData & import\\u201d reads as a 43% jump in month 13 when the restated series shows it actually fell.",
    built: "2026-10-25",
    tier: "eval",
    load: () => import("@companies/enterpret/enterpret-taxonomy-drift/Pilot"),
  },
];

export function getPilot(slug: string): Pilot | undefined {
  return pilots.find((p) => p.slug === slug);
}
