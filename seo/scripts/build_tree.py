"""Stage 3: build the navigable folder tree of categories with per-page stubs.

Reads:   seo/index/classified.json
Writes:  seo/categories/<NN>-<category>/README.md
         seo/categories/<NN>-<category>/pages/<slug>.md   (one stub per URL)
         seo/categories/03-location-pages/<service>/pages/<slug>.md
         seo/categories/03-location-pages/<service>/README.md

Each page stub is a YAML-frontmatter markdown file Claude Code can grep/edit.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "seo" / "index"
CATS = ROOT / "seo" / "categories"

# Display order + folder names. Number prefixes make `ls` produce a stable order.
CATEGORY_ORDER = [
    ("core", "01-core", "Core site pages (home, about, pricing, reviews)"),
    ("service-hub", "02-service-hubs", "Top-level service overview pages (not city-specific)"),
    ("location-page", "03-location-pages", "City + service landing pages (the bulk of the site)"),
    ("faq-questions", "04-faq-questions", "Question-format pages (how-to, what-is, can-i, etc.)"),
    ("calculators-tools", "05-calculators-tools", "Calculator and tool pages"),
    ("comparisons", "06-comparisons", "Comparison pages (X vs Y) not tied to a single city service"),
    ("regulations-rules", "07-regulations-rules", "Local/national regulation explainers"),
    ("blog", "08-blog-posts", "Editorial blog posts"),
    ("case-studies", "09-case-studies", "Property/client case studies"),
    ("courses-academy", "10-courses-academy", "Courses, academy, mastery products"),
    ("investor-services", "11-investor-services", "Sourcing, JVs, deal selling — investor-side intent"),
    ("topical-guides", "12-topical-guides", "Informational landing pages (business plans, costs, contracts)"),
]

LOCATION_SERVICE_ORDER = [
    ("airbnb_management", "airbnb-management"),
    ("holiday_let_management", "holiday-let-management"),
    ("serviced_accommodation_management", "serviced-accommodation-management"),
    ("guaranteed_rent", "guaranteed-rent"),
    ("short_let_management", "short-let-management"),
    ("cohost", "cohost"),
    ("photography", "photography"),
]


def yaml_escape(value) -> str:
    if value is None:
        return '""'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    s = str(value)
    if any(ch in s for ch in ":#\"'\n") or s != s.strip():
        return json.dumps(s)
    return s


def stub_for(rec: dict) -> str:
    """Render a per-page stub Claude Code can populate."""
    fm = {
        "slug": rec["slug"],
        "loc": rec["loc"],
        "category": rec.get("category"),
        "subcategory": rec.get("subcategory"),
        "service": rec.get("service"),
        "city": rec.get("city"),
        "lastmod": rec.get("lastmod"),
        "priority": rec.get("priority"),
        "changefreq": rec.get("changefreq"),
        "image_count": rec.get("image_count"),
        "is_question": rec.get("is_question", False),
        "is_comparison": rec.get("is_comparison", False),
        "status": "stub",  # stub | audited | scored | drafted | published
    }
    fm_lines = ["---"]
    for k, v in fm.items():
        fm_lines.append(f"{k}: {yaml_escape(v)}")
    if rec.get("notes"):
        fm_lines.append("notes:")
        for n in rec["notes"]:
            fm_lines.append(f"  - {yaml_escape(n)}")
    fm_lines.append("---\n")

    body = [
        f"# {rec['slug']}",
        "",
        f"**Live URL:** {rec['loc']}",
        "",
        "## On-page snapshot (Stage 5 — live crawl)",
        "",
        "- title: _pending_",
        "- meta description: _pending_",
        "- h1: _pending_",
        "- word count: _pending_",
        "- internal links out: _pending_",
        "- schema present: _pending_",
        "",
        "## SEO targeting (Stage 6)",
        "",
        "- primary keyword: _tbd_",
        "- secondary keywords: _tbd_",
        "- search intent: _tbd_",
        "- competitor pages ranking: _tbd_",
        "",
        "## Opportunity assessment",
        "",
        "- action: _revise | consolidate | leave | new_",
        "- opportunity score (0–10): _tbd_",
        "- rationale: _tbd_",
        "",
        "## Revision plan (Stage 7)",
        "",
        "- proposed title:",
        "- proposed meta:",
        "- H1/H2 outline:",
        "- internal links to add:",
        "- schema (FAQ / Service / LocalBusiness):",
        "- HTML blocks (Squarespace-ready):",
        "",
        "## Notes",
        "",
        "_free-form_",
        "",
    ]
    return "\n".join(fm_lines) + "\n".join(body)


def safe_filename(slug: str) -> str:
    name = re.sub(r"[^a-z0-9._-]+", "-", slug.lower()).strip("-") or "page"
    return f"{name}.md"


def write_page(directory: Path, rec: dict) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    fname = safe_filename(rec["slug"].replace("/", "__"))
    path = directory / fname
    path.write_text(stub_for(rec))
    return path


def write_category_readme(folder: Path, title: str, description: str, records: list[dict]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {title}",
        "",
        description,
        "",
        f"**Page count:** {len(records)}",
        "",
        "## Pages",
        "",
        "| slug | lastmod | priority | images | status |",
        "|---|---|---|---|---|",
    ]
    for rec in sorted(records, key=lambda r: r["slug"]):
        lines.append(
            f"| [{rec['slug']}](pages/{safe_filename(rec['slug'].replace('/', '__'))}) "
            f"| {rec.get('lastmod') or ''} | {rec.get('priority') or ''} "
            f"| {rec.get('image_count', 0)} | stub |"
        )
    lines.append("")
    (folder / "README.md").write_text("\n".join(lines))


def write_location_readme(folder: Path, service_label: str, records: list[dict]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {service_label}",
        "",
        f"Location pages for the **{service_label}** service line.",
        "",
        f"**Page count:** {len(records)}",
        "",
        "Each page targets a UK city/region. See the parent "
        "[city × service coverage matrix](../README.md) for gap analysis.",
        "",
        "## Pages",
        "",
        "| city | slug | lastmod | priority | images | status |",
        "|---|---|---|---|---|---|",
    ]
    for rec in sorted(records, key=lambda r: (r.get("city") or "", r["slug"])):
        lines.append(
            f"| {rec.get('city') or ''} "
            f"| [{rec['slug']}](pages/{safe_filename(rec['slug'].replace('/', '__'))}) "
            f"| {rec.get('lastmod') or ''} | {rec.get('priority') or ''} "
            f"| {rec.get('image_count', 0)} | stub |"
        )
    lines.append("")
    (folder / "README.md").write_text("\n".join(lines))


def write_location_root_readme(folder: Path, classified: list[dict]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    matrix = json.loads((INDEX / "city-service-matrix.json").read_text())
    main_services = [s for s, _ in LOCATION_SERVICE_ORDER]
    rows = matrix["rows"]

    # build coverage matrix limited to main services
    lines = [
        "# 03 — Location pages",
        "",
        "City + service landing pages. This folder is the largest cluster on the site "
        f"({sum(1 for r in classified if r.get('category') == 'location-page')} pages) "
        "and the most fertile ground for SEO gap-filling.",
        "",
        "## Folders by service",
        "",
    ]
    for svc, slug in LOCATION_SERVICE_ORDER:
        count = sum(
            1
            for r in classified
            if r.get("category") == "location-page" and r.get("service") == svc
        )
        lines.append(f"- [{slug}/]({slug}/) — {count} pages")
    lines.append("- [other-location-types/](other-location-types/) — long-tail service variants (yield, income, earnings, setup, cleaning, etc.)")
    lines.append("")

    lines += [
        "## Coverage matrix (top services × cities)",
        "",
        "Legend: `✓` = page exists, blank = gap",
        "",
    ]
    header = ["city"] + [slug for _, slug in LOCATION_SERVICE_ORDER]
    lines.append("| " + " | ".join(header) + " |")
    lines.append("|" + "|".join(["---"] * len(header)) + "|")
    for row in rows:
        city = row["city"]
        if city in {"knowledge-hub"}:
            continue
        cells = [city]
        for svc, _ in LOCATION_SERVICE_ORDER:
            cells.append("✓" if row.get(svc) else "")
        lines.append("| " + " | ".join(cells) + " |")
    lines.append("")
    (folder / "README.md").write_text("\n".join(lines))


def main() -> int:
    classified = json.loads((INDEX / "classified.json").read_text())

    # group records by category
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for rec in classified:
        by_cat[rec.get("category") or "uncategorised"].append(rec)

    # write each category
    for cat_key, folder_name, description in CATEGORY_ORDER:
        folder = CATS / folder_name
        records = by_cat.get(cat_key, [])
        if cat_key == "location-page":
            # special-case: subfolders by service
            write_location_root_readme(folder, classified)
            by_service: dict[str, list[dict]] = defaultdict(list)
            main_services = {s for s, _ in LOCATION_SERVICE_ORDER}
            for rec in records:
                svc = rec.get("service")
                if svc in main_services:
                    by_service[svc].append(rec)
                else:
                    by_service["__other__"].append(rec)
            for svc, slug in LOCATION_SERVICE_ORDER:
                sub = folder / slug
                write_location_readme(sub, slug.replace("-", " "), by_service.get(svc, []))
                for rec in by_service.get(svc, []):
                    write_page(sub / "pages", rec)
            other = by_service.get("__other__", [])
            if other:
                sub = folder / "other-location-types"
                write_location_readme(sub, "other location types", other)
                for rec in other:
                    write_page(sub / "pages", rec)
        else:
            write_category_readme(
                folder,
                title=f"{folder_name.split('-', 1)[1].replace('-', ' ').title()}",
                description=description,
                records=records,
            )
            for rec in records:
                write_page(folder / "pages", rec)

    # any unexpected leftover category
    expected = {k for k, _, _ in CATEGORY_ORDER}
    leftover = {k: v for k, v in by_cat.items() if k not in expected}
    if leftover:
        misc = CATS / "99-uncategorised"
        all_recs: list[dict] = []
        for recs in leftover.values():
            all_recs.extend(recs)
        write_category_readme(misc, "Uncategorised", "Pages that did not match any category rule.", all_recs)
        for rec in all_recs:
            write_page(misc / "pages", rec)
        print(f"WARN: {sum(len(v) for v in leftover.values())} uncategorised pages -> 99-uncategorised/")

    # top-level seo/README.md
    top = ROOT / "seo" / "README.md"
    top.write_text(_render_top_readme(by_cat))
    print(f"wrote tree under {CATS}")
    print(f"top-level README -> {top}")
    return 0


def _render_top_readme(by_cat: dict[str, list[dict]]) -> str:
    total = sum(len(v) for v in by_cat.values())
    lines = [
        "# Stayful SEO workspace",
        "",
        "This folder is a Claude Code-navigable mirror of the stayful.co.uk sitemap, "
        "broken into SEO categories. The goal is to use this structure as the base for "
        "**revising existing pages** and **drafting new pages** to close SEO gaps.",
        "",
        "## Sitemap snapshot",
        "",
        f"- Total URLs: **{total}**",
        f"- Source: `.sitemap-raw.xml` (3.2 MB, downloaded from Google Drive)",
        "- Generated indexes live in [`index/`](index/)",
        "",
        "## How to navigate",
        "",
        "- [`categories/`](categories/) — every URL bucketed by category. Each category folder "
        "has a `README.md` listing its pages and a `pages/` subfolder with one `.md` stub per URL.",
        "- [`index/`](index/) — machine-readable JSON: `all-urls.json`, `classified.json`, "
        "`by-category.json`, `city-service-matrix.json`.",
        "- [`gap-analysis/`](../seo/gap-analysis/) — Stage 4 outputs: duplicates, thin/stale, missing combos.",
        "- [`working/`](../seo/working/) — Stage 7 drafts (`revisions/` and `new-pages/`).",
        "",
        "## Per-page stub format",
        "",
        "Each `categories/**/pages/<slug>.md` has YAML frontmatter (slug, loc, service, city, "
        "lastmod, priority, image_count, status) and sections for:",
        "",
        "1. **On-page snapshot** — title/meta/H1/word count (filled in Stage 5 crawl).",
        "2. **SEO targeting** — primary/secondary keywords, intent.",
        "3. **Opportunity assessment** — action (revise/consolidate/leave/new), score, rationale.",
        "4. **Revision plan** — proposed title/meta/outline, internal links, schema, HTML blocks.",
        "",
        "## Categories",
        "",
        "| # | category | pages | folder |",
        "|---|---|---|---|",
    ]
    for cat_key, folder_name, _ in CATEGORY_ORDER:
        lines.append(
            f"| {folder_name.split('-', 1)[0]} | {cat_key} "
            f"| {len(by_cat.get(cat_key, []))} "
            f"| [`categories/{folder_name}/`](categories/{folder_name}/) |"
        )
    lines.append("")
    lines += [
        "## Pipeline (7 stages)",
        "",
        "| Stage | Output | Status |",
        "|---|---|---|",
        "| 1. Parse sitemap | `index/all-urls.json`, `index/summary.json` | ✅ |",
        "| 2. Classify | `index/classified.json`, `index/by-category.json`, `index/city-service-matrix.json` | ✅ |",
        "| 3. Folder tree + stubs | `categories/**/README.md`, `categories/**/pages/*.md` | ✅ |",
        "| 4. Gap analysis | `gap-analysis/*.md` | ⬜ |",
        "| 5. Live-page audit | populated stub on-page snapshots | ⬜ |",
        "| 6. Opportunity scoring | `gap-analysis/backlog.md` | ⬜ |",
        "| 7. Revisions + new pages | `working/revisions/`, `working/new-pages/` | ⬜ |",
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
