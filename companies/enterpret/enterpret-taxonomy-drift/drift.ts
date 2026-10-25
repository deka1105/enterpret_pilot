/**
 * Taxonomy drift monitor — Enterpret P-1.
 *
 * Enterpret's differentiator is a taxonomy generated from customer language
 * and adapted as that language changes. Their most-quoted customer outcome is
 * a recurring report. Those two facts are in tension: a taxonomy that adapts
 * silently invalidates the longitudinal comparison the report is made of, and
 * nobody reading the trend line knows which side of a theme split they are on.
 *
 * The model here separates the two things that normally get conflated:
 *
 *   atoms     fine-grained topics in the feedback. The ground truth. Stable.
 *   versions  successive groupings of those atoms into named themes.
 *
 * Drift is then not a mystery — it is a change of grouping, and every kind of
 * drift falls out of comparing two groupings over the same atoms. A theme
 * whose atoms land in two themes next version is a split; two themes whose
 * atoms land in one is a merge; the same atoms under a new name is a rename;
 * a few atoms moving between otherwise stable themes is a semantic shift.
 *
 * The reconciled series is the whole point: restate history under the current
 * grouping and the trend becomes comparable again. It is a sum over atoms,
 * which is why it can be shown rather than asserted.
 */

export const MONTHS = 24;

export type Atom = { id: string; label: string; counts: number[] };
export type Theme = { id: string; label: string; atoms: string[] };
export type Version = { id: string; label: string; from: number; themes: Theme[] };

export type DriftKind = "split" | "merge" | "rename" | "shift";
export type DriftEvent = {
  kind: DriftKind;
  month: number;
  fromVersion: string;
  toVersion: string;
  before: string[];
  after: string[];
  detail: string;
  /** Themes in the current taxonomy whose history is affected. */
  touches: string[];
};

/* ------------------------------------------------------------- the data --- */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ATOM_SPEC: [string, string, number, number][] = [
  // id, label, base volume, monthly trend (per month, as a fraction of base)
  ["a1", "cannot find the invite link", 38, 0.00],
  ["a2", "SSO setup fails silently", 22, 0.04],
  ["a3", "import stalls on large CSV", 31, -0.01],
  ["a4", "first-run tour is confusing", 44, -0.02],
  ["a5", "mobile app logs you out", 27, 0.03],
  ["a6", "search misses recent items", 35, 0.02],
  ["a7", "notification volume too high", 41, 0.01],
  ["a8", "cannot export to CSV", 19, 0.00],
  ["a9", "billing page shows wrong seat count", 16, 0.05],
  ["a10", "invoice VAT field missing", 12, 0.02],
  ["a11", "API rate limit undocumented", 24, 0.06],
  ["a12", "webhook retries duplicate", 18, 0.03],
  ["a13", "slow dashboard load", 52, -0.03],
  ["a14", "report builder drops filters", 29, 0.01],
  ["a15", "permissions model unclear", 33, 0.02],
  ["a16", "cannot reassign a workspace owner", 14, 0.01],
  ["a17", "dark mode contrast", 9, 0.00],
  ["a18", "onboarding emails never arrive", 21, -0.04],
];

export function buildAtoms(seed = 11): Atom[] {
  const r = rng(seed);
  return ATOM_SPEC.map(([id, label, base, trend]) => ({
    id, label,
    counts: Array.from({ length: MONTHS }, (_, m) =>
      Math.max(0, Math.round(base * (1 + trend * m) * (0.78 + r() * 0.44))),
    ),
  }));
}

/*
  Four groupings of the same atoms. Read down a column to see an atom's theme
  drift across the year — that is the thing a trend line cannot show you.
*/
export const VERSIONS: Version[] = [
  {
    id: "v1", label: "v1", from: 0,
    themes: [
      { id: "t-onboarding", label: "Onboarding friction", atoms: ["a1", "a2", "a4", "a18"] },
      { id: "t-data", label: "Data & import", atoms: ["a3", "a8", "a14"] },
      { id: "t-perf", label: "Performance", atoms: ["a13", "a6"] },
      { id: "t-notify", label: "Notifications", atoms: ["a5", "a7"] },
      { id: "t-billing", label: "Billing", atoms: ["a9", "a10"] },
      { id: "t-api", label: "Developer platform", atoms: ["a11", "a12"] },
      { id: "t-admin", label: "Admin & permissions", atoms: ["a15", "a16"] },
      { id: "t-ui", label: "Visual design", atoms: ["a17"] },
    ],
  },
  {
    id: "v2", label: "v2", from: 7,
    themes: [
      // split: onboarding friction splits into account setup vs first-run
      { id: "t-setup", label: "Account setup", atoms: ["a1", "a2"] },
      { id: "t-firstrun", label: "First-run experience", atoms: ["a4", "a18"] },
      { id: "t-data", label: "Data & import", atoms: ["a3", "a8", "a14"] },
      { id: "t-perf", label: "Performance", atoms: ["a13", "a6"] },
      { id: "t-notify", label: "Notifications", atoms: ["a5", "a7"] },
      { id: "t-billing", label: "Billing", atoms: ["a9", "a10"] },
      { id: "t-api", label: "Developer platform", atoms: ["a11", "a12"] },
      { id: "t-admin", label: "Admin & permissions", atoms: ["a15", "a16"] },
      { id: "t-ui", label: "Visual design", atoms: ["a17"] },
    ],
  },
  {
    id: "v3", label: "v3", from: 13,
    themes: [
      { id: "t-setup", label: "Account setup", atoms: ["a1", "a2"] },
      { id: "t-firstrun", label: "First-run experience", atoms: ["a4", "a18"] },
      // shift: search moves out of Performance into Data
      { id: "t-data", label: "Data & import", atoms: ["a3", "a8", "a14", "a6"] },
      { id: "t-perf", label: "Performance", atoms: ["a13"] },
      // merge: notifications + visual design folded into one experience theme
      { id: "t-experience", label: "App experience", atoms: ["a5", "a7", "a17"] },
      { id: "t-billing", label: "Billing", atoms: ["a9", "a10"] },
      { id: "t-api", label: "Developer platform", atoms: ["a11", "a12"] },
      { id: "t-admin", label: "Admin & permissions", atoms: ["a15", "a16"] },
    ],
  },
  {
    id: "v4", label: "v4", from: 19,
    themes: [
      { id: "t-setup", label: "Account setup", atoms: ["a1", "a2"] },
      { id: "t-firstrun", label: "First-run experience", atoms: ["a4", "a18"] },
      { id: "t-data", label: "Data & import", atoms: ["a3", "a8", "a14", "a6"] },
      { id: "t-perf", label: "Performance", atoms: ["a13"] },
      { id: "t-experience", label: "App experience", atoms: ["a5", "a7", "a17"] },
      // rename only: same atoms, new words
      { id: "t-billing", label: "Billing & invoicing", atoms: ["a9", "a10"] },
      { id: "t-api", label: "API & webhooks", atoms: ["a11", "a12"] },
      { id: "t-admin", label: "Admin & permissions", atoms: ["a15", "a16"] },
    ],
  },
];

export const CURRENT = VERSIONS[VERSIONS.length - 1];

/** Which taxonomy version was in force in a given month. */
export function versionAt(month: number): Version {
  let v = VERSIONS[0];
  for (const candidate of VERSIONS) if (month >= candidate.from) v = candidate;
  return v;
}

/* -------------------------------------------------------------- the diff --- */

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Compares two groupings over the same atoms and names what changed.
 *
 * Classification is by where atoms went, not by label similarity — labels are
 * exactly the thing that cannot be trusted across a drift event.
 */
export function diff(a: Version, b: Version): DriftEvent[] {
  const events: DriftEvent[] = [];
  const homeIn = (v: Version, atom: string) => v.themes.find((t) => t.atoms.includes(atom));

  for (const before of a.themes) {
    const destinations = new Set(before.atoms.map((x) => homeIn(b, x)?.id).filter(Boolean) as string[]);

    if (destinations.size > 1) {
      events.push({
        kind: "split", month: b.from, fromVersion: a.id, toVersion: b.id,
        before: [before.label],
        after: [...destinations].map((id) => b.themes.find((t) => t.id === id)!.label),
        detail: `"${before.label}" no longer exists as one theme. Its ${before.atoms.length} topics are now spread across ${destinations.size}. Any series that crosses this month is comparing a container to its parts.`,
        touches: [...destinations],
      });
      continue;
    }

    const [onlyId] = [...destinations];
    const after = b.themes.find((t) => t.id === onlyId);
    if (!after) continue;

    if (sameSet(before.atoms, after.atoms)) {
      if (before.label !== after.label) {
        events.push({
          kind: "rename", month: b.from, fromVersion: a.id, toVersion: b.id,
          before: [before.label], after: [after.label],
          detail: `Same topics, new name. Harmless to the numbers and the one kind of drift that is safe to ignore — but a report filtered by label will silently return nothing.`,
          touches: [after.id],
        });
      }
      continue;
    }

    const gained = after.atoms.filter((x) => !before.atoms.includes(x));
    const sources = new Set(gained.map((x) => homeIn(a, x)?.id).filter(Boolean) as string[]);
    sources.delete(before.id);

    if (sources.size > 0 && gained.length >= 2) {
      events.push({
        kind: "merge", month: b.from, fromVersion: a.id, toVersion: b.id,
        before: [before.label, ...[...sources].map((id) => a.themes.find((t) => t.id === id)!.label)],
        after: [after.label],
        detail: `Separate themes folded into "${after.label}". The combined series steps up at this month for a reason that has nothing to do with customers.`,
        touches: [after.id],
      });
    } else if (gained.length > 0) {
      events.push({
        kind: "shift", month: b.from, fromVersion: a.id, toVersion: b.id,
        before: [before.label], after: [after.label],
        detail: `${gained.length} topic${gained.length === 1 ? "" : "s"} moved into "${after.label}" from elsewhere. The label did not change, so nothing on a dashboard marks this — and it is the hardest kind to notice.`,
        touches: [after.id],
      });
    }
  }
  return events;
}

export function allEvents(): DriftEvent[] {
  const out: DriftEvent[] = [];
  for (let i = 1; i < VERSIONS.length; i++) out.push(...diff(VERSIONS[i - 1], VERSIONS[i]));
  return out.sort((x, y) => x.month - y.month || x.kind.localeCompare(y.kind));
}

/* ------------------------------------------------------------ the series --- */

export type Series = {
  themeId: string;
  label: string;
  /** What the dashboard shows: whatever the theme of that name held at the time. */
  asLabelled: (number | null)[];
  /** History restated under today's grouping. Comparable by construction. */
  reconciled: number[];
  /** Months where the two disagree by more than a rounding error. */
  breaks: number[];
  events: DriftEvent[];
};

export function seriesFor(themeId: string, atoms: Atom[], events: DriftEvent[]): Series {
  const theme = CURRENT.themes.find((t) => t.id === themeId)!;
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const sum = (ids: string[], m: number) => ids.reduce((acc, id) => acc + (byId.get(id)?.counts[m] ?? 0), 0);

  const asLabelled: (number | null)[] = [];
  const reconciled: number[] = [];
  const breaks: number[] = [];

  for (let m = 0; m < MONTHS; m++) {
    // The dashboard's number: the theme that carried this *label* back then.
    const v = versionAt(m);
    const historical = v.themes.find((t) => t.label === theme.label) ?? v.themes.find((t) => t.id === theme.id);
    const labelled = historical ? sum(historical.atoms, m) : null;
    asLabelled.push(labelled);

    const truth = sum(theme.atoms, m);
    reconciled.push(truth);
    if (labelled === null || Math.abs(labelled - truth) > Math.max(2, truth * 0.02)) breaks.push(m);
  }

  return {
    themeId, label: theme.label, asLabelled, reconciled, breaks,
    events: events.filter((e) => e.touches.includes(themeId)),
  };
}

export const KIND_LABEL: Record<DriftKind, string> = {
  split: "Split", merge: "Merge", rename: "Rename", shift: "Semantic shift",
};

export const DEMO_NOTE =
  "The feedback corpus, the themes and the four taxonomy versions here are invented for this demo — no Enterpret account or customer data is involved, and nothing here describes how Enterpret actually versions a taxonomy. What is real is the arithmetic: drift is detected by comparing groupings over the same underlying topics, and the reconciled line is a sum, not an estimate.";
