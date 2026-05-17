"""Stage 4: produce gap-analysis markdown reports from the classified index.

Reads:   seo/index/classified.json
         seo/index/city-service-matrix.json
Writes:  seo/gap-analysis/city-service-coverage.md
         seo/gap-analysis/duplicate-and-thin-pages.md
         seo/gap-analysis/new-page-opportunities.md
         seo/gap-analysis/README.md
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "seo" / "index"
OUT = ROOT / "seo" / "gap-analysis"
OUT.mkdir(parents=True, exist_ok=True)

MAIN_SERVICES = [
    "airbnb_management",
    "holiday_let_management",
    "serviced_accommodation_management",
    "guaranteed_rent",
    "short_let_management",
    "cohost",
    "photography",
]

# Rough "tier" of UK cities by population / commercial interest. Used only to
# bias suggestion ordering — not authoritative. Edit freely.
TIER_1 = {
    "london", "manchester", "birmingham", "leeds", "liverpool", "bristol",
    "sheffield", "nottingham", "newcastle", "edinburgh",
}
TIER_2 = {
    "leicester", "coventry", "cardiff", "york", "oxford", "cambridge",
    "brighton", "bath", "bournemouth", "southampton", "reading",
    "milton-keynes", "cheltenham", "harrogate", "stratford-upon-avon",
    "windsor", "chester", "warwick", "leamington-spa", "lancaster",
    "peterborough", "bradford", "salford", "stoke-on-trent", "plymouth",
    "exeter", "doncaster", "hull", "wolverhampton", "derby",
}


def tier(city: str) -> int:
    if city in TIER_1:
        return 1
    if city in TIER_2:
        return 2
    return 3


def load() -> tuple[list[dict], dict]:
    classified = json.loads((INDEX / "classified.json").read_text())
    matrix = json.loads((INDEX / "city-service-matrix.json").read_text())
    return classified, matrix


def report_coverage(classified: list[dict], matrix: dict) -> str:
    rows = matrix["rows"]
    # Sort rows by tier then by # of services covered
    def score(row):
        present = sum(1 for s in MAIN_SERVICES if row.get(s))
        return (tier(row["city"]), -present, row["city"])

    rows = sorted(rows, key=score)
    lines = [
        "# City × service coverage",
        "",
        "Each row is a UK city/region; columns are the seven main service lines. "
        "`✓` means a page exists, blank is a gap. Cities are ordered by tier "
        "(rough city size) then by coverage descending.",
        "",
        f"Total cities with at least one page: **{len(rows)}**",
        "",
        "| tier | city | "
        + " | ".join(s.replace("_", "-") for s in MAIN_SERVICES)
        + " | covered |",
        "|---|---|"
        + "|".join(["---"] * (len(MAIN_SERVICES) + 1))
        + "|",
    ]
    for row in rows:
        present = sum(1 for s in MAIN_SERVICES if row.get(s))
        cells = [str(tier(row["city"])), row["city"]] + [
            "✓" if row.get(s) else "" for s in MAIN_SERVICES
        ] + [f"{present}/{len(MAIN_SERVICES)}"]
        lines.append("| " + " | ".join(cells) + " |")
    lines.append("")

    # Per-service totals
    lines += [
        "## Per-service coverage totals",
        "",
        "| service | cities covered |",
        "|---|---|",
    ]
    for s in MAIN_SERVICES:
        cnt = sum(1 for row in rows if row.get(s))
        lines.append(f"| {s.replace('_', '-')} | {cnt} |")
    lines.append("")
    return "\n".join(lines)


def report_dupes_thin(classified: list[dict]) -> str:
    # Duplicate slugs: -1 suffix, or two pages with same (service, city)
    dupes_by_pair: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in classified:
        if r.get("service") and r.get("city"):
            dupes_by_pair[(r["service"], r["city"])].append(r)
    duplicate_pairs = {k: v for k, v in dupes_by_pair.items() if len(v) > 1}

    # Numeric suffix that's *not* a 4-digit year (2010-2099 = year, otherwise = duplicate marker).
    def _is_dupe_suffix(slug: str) -> bool:
        m = re.search(r"-(\d+)$", slug)
        if not m:
            return False
        n = int(m.group(1))
        return n < 100  # -1, -2, ..., -99 are dupe markers; -2025 is a year
    suffix_dupes = [r for r in classified if _is_dupe_suffix(r["slug"])]

    # Thin content (zero images)
    zero_img = [r for r in classified if r["image_count"] == 0]
    by_cat = Counter(r.get("category") for r in zero_img)

    # Stale content
    stale_2024 = [
        r for r in classified
        if (r.get("lastmod") or "").startswith("2024")
    ]
    no_lastmod = [r for r in classified if not r.get("lastmod")]

    lines = [
        "# Duplicates, thin & stale pages",
        "",
        "## City + service collisions",
        "",
        "Same service line + city → more than one URL. Some are legitimate "
        "variants (`-cost`, `-vs-guaranteed-rent`) targeting distinct intent, "
        "others are accidental duplicates. Mark `action: consolidate` in the "
        "per-page stub if a single canonical page should replace the cluster.",
        "",
    ]
    if duplicate_pairs:
        lines.append("| service | city | canonical-looking slug | variant slugs / type |")
        lines.append("|---|---|---|---|")
        for (svc, city), recs in sorted(duplicate_pairs.items()):
            # canonical = shortest slug (no modifier)
            ranked = sorted(recs, key=lambda r: len(r["slug"]))
            canonical = ranked[0]["slug"]
            variants = []
            for r in ranked[1:]:
                vslug = r["slug"]
                vtype = "duplicate"
                if "-vs-" in vslug:
                    vtype = "comparison-variant"
                elif vslug.endswith("-cost") or vslug.endswith("-costs"):
                    vtype = "cost-variant"
                elif vslug.startswith("airbnb-management-in-") and not canonical.startswith("airbnb-management-in-"):
                    vtype = "prefix-variant (-in-)"
                variants.append(f"`{vslug}` *({vtype})*")
            lines.append(
                f"| {svc} | {city} | `{canonical}` | "
                + "<br>".join(variants)
                + " |"
            )
    else:
        lines.append("_None found._")
    lines.append("")

    lines += [
        "## Slugs with numeric suffix (likely accidental duplicates)",
        "",
    ]
    if suffix_dupes:
        for r in sorted(suffix_dupes, key=lambda r: r["slug"]):
            lines.append(f"- `{r['slug']}` — {r['loc']}")
    else:
        lines.append("_None found._")
    lines.append("")

    lines += [
        "## Pages with zero images (thin content candidates)",
        "",
        f"**Total:** {len(zero_img)} of {len(classified)} URLs.",
        "",
        "Breakdown by category:",
        "",
        "| category | zero-image pages |",
        "|---|---|",
    ]
    for cat, n in by_cat.most_common():
        lines.append(f"| {cat} | {n} |")
    lines.append("")
    lines.append("Top 30 (alphabetical) — full list in `seo/index/classified.json`:")
    lines.append("")
    for r in sorted(zero_img, key=lambda r: r["slug"])[:30]:
        lines.append(f"- `{r['slug']}` ({r.get('category')})")
    lines.append("")

    lines += [
        "## Stale pages (last modified 2024)",
        "",
        f"**Total:** {len(stale_2024)} pages.",
        "",
    ]
    for r in sorted(stale_2024, key=lambda r: (r.get("lastmod") or "", r["slug"])):
        lines.append(f"- `{r['slug']}` — lastmod {r.get('lastmod')}")
    lines.append("")
    if no_lastmod:
        lines += ["## Pages with no lastmod", ""]
        for r in no_lastmod:
            lines.append(f"- `{r['slug']}`")
        lines.append("")
    return "\n".join(lines)


def report_opportunities(classified: list[dict], matrix: dict) -> str:
    rows = matrix["rows"]
    # An opportunity is a (city, service) combo where the city already has at
    # least one page in our main 7 services (signal that we serve this city),
    # but is missing this service.
    opportunities: list[tuple[int, str, str]] = []  # (tier, city, service)
    for row in rows:
        if not any(row.get(s) for s in MAIN_SERVICES):
            continue
        for s in MAIN_SERVICES:
            if not row.get(s):
                opportunities.append((tier(row["city"]), row["city"], s))

    opportunities.sort(key=lambda x: (x[0], x[1], x[2]))

    lines = [
        "# New-page opportunities",
        "",
        "Cities where we already have at least one service page — but a major "
        "service line is missing. Each row is a candidate net-new page.",
        "",
        "Sort: tier 1 cities (largest) first, then alphabetical.",
        "",
        f"**Total opportunities:** {len(opportunities)}",
        "",
        "| tier | city | missing service | suggested slug |",
        "|---|---|---|---|",
    ]
    suggested_slug = {
        "airbnb_management": "airbnb-management-{city}",
        "holiday_let_management": "holiday-let-management-{city}",
        "serviced_accommodation_management": "serviced-accommodation-management-{city}",
        "guaranteed_rent": "guaranteed-rent-{city}",
        "short_let_management": "short-let-management-{city}",
        "cohost": "airbnb-cohost-{city}",
        "photography": "airbnb-professional-photography-{city}",
    }
    for t, city, s in opportunities:
        slug = suggested_slug[s].format(city=city)
        lines.append(f"| {t} | {city} | {s.replace('_', '-')} | `{slug}` |")
    lines.append("")

    # Counts by service
    svc_counts = Counter(s for _, _, s in opportunities)
    lines += [
        "## Counts by service line",
        "",
        "| service | opportunity count |",
        "|---|---|",
    ]
    for svc, n in svc_counts.most_common():
        lines.append(f"| {svc.replace('_', '-')} | {n} |")
    lines.append("")

    # Tier 1 only quickview
    t1 = [o for o in opportunities if o[0] == 1]
    lines += [
        "## Tier 1 priority shortlist",
        "",
        "These are the highest-priority gaps to fill first (largest UK markets).",
        "",
    ]
    if t1:
        lines.append("| city | missing services |")
        lines.append("|---|---|")
        by_city = defaultdict(list)
        for t, city, s in t1:
            by_city[city].append(s.replace("_", "-"))
        for city, services in sorted(by_city.items()):
            lines.append(f"| {city} | {', '.join(services)} |")
    else:
        lines.append("_No tier-1 gaps — all big cities are fully covered._")
    lines.append("")
    return "\n".join(lines)


def index_readme(classified: list[dict]) -> str:
    return "\n".join([
        "# Gap analysis",
        "",
        "Outputs of Stage 4 — read alongside the per-category READMEs under "
        "[`../categories/`](../categories/).",
        "",
        "- [`city-service-coverage.md`](city-service-coverage.md) — full city × service matrix.",
        "- [`duplicate-and-thin-pages.md`](duplicate-and-thin-pages.md) — consolidation candidates, "
        "zero-image pages, stale pages.",
        "- [`new-page-opportunities.md`](new-page-opportunities.md) — missing (city, service) combos with "
        "suggested slugs, prioritised by city tier.",
        "",
        f"Last regenerated against {len(classified)} URLs.",
        "",
    ])


def main() -> int:
    classified, matrix = load()
    (OUT / "city-service-coverage.md").write_text(report_coverage(classified, matrix))
    (OUT / "duplicate-and-thin-pages.md").write_text(report_dupes_thin(classified))
    (OUT / "new-page-opportunities.md").write_text(report_opportunities(classified, matrix))
    (OUT / "README.md").write_text(index_readme(classified))
    print(f"wrote 4 reports to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
