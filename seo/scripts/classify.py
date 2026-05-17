"""Stage 2: classify URLs into SEO categories + service/city tags.

Reads:   seo/index/all-urls.json
Writes:  seo/index/by-category.json       (records grouped by primary category)
         seo/index/city-service-matrix.json (rows=cities, cols=services, values=slug or null)
         seo/index/classified.json        (every record with its tags)
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "seo" / "index"

# Service prefixes in slug form, longest-first so the matcher hits the most
# specific service before falling through.
SERVICE_PREFIXES: list[tuple[str, str]] = [
    ("serviced-accommodation-management-in-", "serviced_accommodation_management"),
    ("serviced-accommodation-management-", "serviced_accommodation_management"),
    ("airbnb-professional-photography-", "photography"),
    ("airbnb-photographer-", "photography"),
    ("airbnb-photography-", "photography"),
    ("holiday-let-management-in-", "holiday_let_management"),
    ("holiday-let-management-", "holiday_let_management"),
    ("short-let-management-in-", "short_let_management"),
    ("short-let-management-", "short_let_management"),
    ("airbnb-management-in-", "airbnb_management"),
    ("airbnb-management-", "airbnb_management"),
    ("guaranteed-rent-", "guaranteed_rent"),
    ("airbnb-cohost-", "cohost"),
    ("second-home-management-", "second_home_management"),
    ("vacation-rental-management-", "vacation_rental_management"),
    ("airbnb-setup-", "airbnb_setup"),
    ("airbnb-yield-", "airbnb_yield_lp"),
    ("airbnb-income-", "airbnb_income_lp"),
    ("airbnb-earnings-", "airbnb_earnings_lp"),
    ("airbnb-rules-", "airbnb_rules"),
    ("short-let-regulations-", "short_let_regulations"),
    ("holiday-let-income-", "holiday_let_income_lp"),
    ("holiday-let-tax-", "holiday_let_tax"),
    ("holiday-home-cleaning-", "holiday_home_cleaning"),
    ("airbnb-cleaning-", "airbnb_cleaning"),
    ("airbnb-guest-management-", "airbnb_guest_management"),
    ("airbnb-agency-", "airbnb_agency_lp"),
    ("best-airbnb-management-company-", "best_airbnb_management_lp"),
    ("best-airbnb-management-", "best_airbnb_management_lp"),
    ("best-areas-for-airbnb-", "best_areas_airbnb_lp"),
    ("best-areas-in-", "best_areas_lp"),
    ("best-areas-airbnb-", "best_areas_airbnb_lp"),
]

# Known/likely UK cities & regions seen in the sitemap. Kept lowercase, hyphenated.
KNOWN_CITIES = {
    "altrincham", "ambleside", "bakewell", "bath", "beeston", "bicester",
    "birmingham", "blackpool", "blyth", "bournemouth", "bradford", "brighton",
    "bristol", "buxton", "cambridge", "camden", "canterbury", "chelsea",
    "cheltenham", "cheshire", "chester", "cornwall", "cotswolds", "coventry",
    "crewe", "croydon", "cumbria", "darlington", "derby", "devon", "doncaster",
    "edinburgh", "exeter", "gateshead", "gloucestershire", "grasmere",
    "greenwich", "harrogate", "hartlepool", "hull", "jarrow", "kenilworth",
    "kensington", "kent", "keswick", "knowledge-hub", "lake-district",
    "lambeth", "lancashire", "lancaster", "leamington-spa", "leeds",
    "leicester", "lichfield", "lincoln", "lincolnshire", "liverpool",
    "liverpool-city-centre", "london", "ludlow", "malvern", "manchester",
    "manchester-city-centre", "mansfield", "margate", "melton-mowbray",
    "milton-keynes", "morpeth", "nationwide", "newark", "newcastle",
    "north-shields", "northampton", "northamptonshire", "nottingham",
    "old-trafford", "oxford", "oxfordshire", "peak-district", "perranporth",
    "peterborough", "plymouth", "prestwich", "preston", "reading", "redcar",
    "robin-hoods-bay", "salford", "sailsbury", "scarborough", "sheffield",
    "smethwick", "south-lakeland", "south-london", "south-shields",
    "southampton", "southwark", "stockton", "stoke-on-trent",
    "stratford-upon-avon", "suffolk", "surrey", "sussex", "swindon",
    "torquay", "tynemouth", "uk", "ullswater", "warrington", "warwick",
    "warwickshire", "west-bridgford", "west-yorkshire", "westminster",
    "weymouth", "whitby", "whitley-bay", "wiltshire", "windermere",
    "windsor", "wolverhampton", "york", "yorkshire", "county-durham",
}

QUESTION_PREFIXES = (
    "how-much-", "how-do-", "how-to-", "how-often-", "how-long-",
    "how-many-", "how-should-", "how-can-", "what-", "can-i-", "can-a-",
    "do-i-", "do-you-", "does-", "is-", "are-", "should-i-",
    "which-", "where-",
)

CORE_SLUGS = {
    "(home)", "home-airbnb-management", "about-us", "pricing", "meet-the-team",
    "stayful-reviews", "stayful-newsletter", "stayful-case-studies",
    "stayful-academy-sign-up", "consult-with-stayful", "direct-booking-form",
    "calculateyourincome-airbnb-management",
}

# Service hub pages: top-level service overviews not tied to a city.
SERVICE_HUB_SLUGS = {
    "airbnb-management",
    "airbnb-agency",
    "airbnb-guaranteed-rent",
    "holiday-let-property-management",
    "fully-managed-holiday-letting",
    "short-term-rental-management",
    "short-term-let-management-nationwide",
    "airbnb-interior-design",
    "airbnb-interior-design-consultant",
    "airbnb-professional-photos-portfolio",
    "airbnb-property-management-birmingham",  # appears to be a service hub variant
}

# Investor / sourcing services (distinct intent from core letting services).
INVESTOR_SLUGS = {
    "airbnb-sourcing",
    "bespoke-airbnb-sourcing",
    "airbnb-deal-selling",
    "rent-to-rent-deal-sourcer",
    "property-joint-ventures",
    "invest-in-airbnb",
    "buying-airbnb-investment-property-uk",
}

# Topical landing pages (informational but commercial intent, not blog posts).
# Bucket-of-last-resort below the more specific classifiers.
TOPICAL_HINTS = (
    "holiday-let-business-plan",
    "holiday-let-business-plan-template",
    "holiday-let-financial-plan",
    "holiday-let-company-structure",
    "holiday-let-business-rates",
    "holiday-let-cleaning-prices",
    "holiday-let-start-up-costs",
    "holiday-let-agency-fees",
    "costs-of-running-a-holiday-let",
    "hidden-costs-of-holiday-let-management",
    "furnished-holiday-let-allowable-expenses",
    "running-a-holiday-let",
    "starting-a-holiday-let",
    "free-serviced-accommodation-business-plan",
    "serviced-accommodation-contract",
    "airbnb-company-let-agreement",
    "marketing-and-promotion-for-my-holiday-let",
    "manage-holiday-let-remotely",
    "make-my-property-attract-more-bookings",
    "maintenance-and-repairs-during-a-guests-stay",
    "guest-complaints-or-issues-during-their-stay",
    "complaints-or-negative-reviews-from-guests",
    "booking-requests-from-large-groups-or-families",
    "evicting-a-tenant-with-mental-health-issues",
    "guest-vetting-short-lets",
    "additional-fees-or-charges",
    "contract-lengths-for-guaranteed-rent",
    "switch-long-let-to-short-let",
    "luxury-airbnb-management-uk-standards-pricing-strategy-checklist",
    "best-areas-for-serviced-accommodation",
    "best-areas-for-serviced-accommodation-uk",
    "best-areas-for-serviced-accommodation-nottingham",
    "best-areas-for-holiday-let-lake-district",
    "best-serviced-accommodation-company-nottingham",
    "best-uk-markets-for-contractor-stays",
    "cities-with-the-highest-airbnb-occupancy-rates-uk",
    "most-profitable-airbnb-locations-london",
    "corporate-demand-serviced-accommodation-uk",
    "will-airbnb-last-our-opinion-on-the-market",
    "windsor-property-suitable-for-short-term-letting",
)

COMPARISON_HINTS = (
    "holiday-let-vs-guaranteed-rent-uk",
    "holiday-let-vs-long-let-net-profit-comparison-uk",
    "short-term-vs-long-term-letting-oxford",
    "serviced-accommodation-nottingham-vs-guaranteed-rent",
    "how-does-guaranteed-rent-benefit-landlords",
    "how-does-guaranteed-rent-benefit-tenants",
)


def _strip_blog(slug: str) -> str | None:
    # blog posts live under /airbnb-management-blog-serviced-accommodation-stayful/<post>
    prefix = "airbnb-management-blog-serviced-accommodation-stayful"
    if slug == prefix:
        return ""  # blog index
    if slug.startswith(prefix + "/"):
        return slug[len(prefix) + 1 :]
    if slug == "airbnb-management-blog-is-airbnb-profitable-uk":
        return "is-airbnb-profitable-uk"
    if slug == "airbnb-management-blog-serviced-accommodation-stayful-is-airbnb-profitable-in-leeds":
        return "is-airbnb-profitable-in-leeds"
    return None


# Tails that mean "this is a service-hub-style page, not a city page"
HUB_TAILS = {
    "uk", "nationwide", "company", "company-uk", "fees", "fees-uk", "cost",
    "costs", "contract", "course", "checklist", "locations", "knowledge-hub",
    "companies-in-the-uk", "companies-in-yorkshire",
}


def _detect_service_and_city(slug: str) -> tuple[str | None, str | None, str]:
    """Return (service_key, city, residue) for slug if a service prefix matches."""
    for prefix, service in SERVICE_PREFIXES:
        if slug.startswith(prefix):
            tail = slug[len(prefix) :]
            if not tail:
                return service, None, "hub"
            tail_clean = tail
            modifier = None
            for mod in (
                "-vs-guaranteed-rent", "-vs-self-managing", "-vs-self-management",
                "-vs-airbnb-management", "-cost", "-costs",
            ):
                if tail_clean.endswith(mod):
                    modifier = mod.lstrip("-")
                    tail_clean = tail_clean[: -len(mod)]
                    break
            if tail_clean in KNOWN_CITIES:
                return service, tail_clean, modifier or "city"
            if tail_clean in HUB_TAILS:
                # treat as a service-hub variant, not a city page
                return service, None, tail_clean
            return service, tail_clean, modifier or "city?"
    return None, None, ""


def classify(record: dict) -> dict:
    slug = record["slug"]
    tags = {
        "category": None,
        "subcategory": None,
        "service": None,
        "city": None,
        "is_question": False,
        "is_comparison": "-vs-" in slug,
        "is_case_study": "case-study" in slug
        or slug in {"9-museum-court", "14-chapel-apartments", "803-case-study"},
        "is_calculator": (
            "calculator" in slug
            or slug.endswith("-analyser")
            or slug == "airbnb-deal-analyser"
            or slug == "stayful-airbnb-deal-analyser"
        ),
        "is_course": (
            "course" in slug
            or "academy" in slug
            or "mastery" in slug
            or "classes" in slug
        ),
        "is_blog": False,
        "notes": [],
    }

    # 1. blog
    blog_tail = _strip_blog(slug)
    if blog_tail is not None:
        tags["is_blog"] = True
        tags["category"] = "blog"
        tags["subcategory"] = "blog-index" if blog_tail == "" else "blog-post"
        return tags

    # 2. core
    if slug in CORE_SLUGS:
        tags["category"] = "core"
        return tags

    # 2a. service hubs (explicit list)
    if slug in SERVICE_HUB_SLUGS:
        tags["category"] = "service-hub"
        return tags

    # 2b. investor / sourcing services
    if slug in INVESTOR_SLUGS:
        tags["category"] = "investor-services"
        return tags

    # 2c. explicit comparisons not tied to a service+city pattern
    if slug in COMPARISON_HINTS:
        tags["category"] = "comparisons"
        return tags

    # 2d. topical guides (commercial-intent landing pages, not blog/FAQ)
    if slug in TOPICAL_HINTS:
        tags["category"] = "topical-guides"
        return tags

    # 3. case studies
    if tags["is_case_study"]:
        tags["category"] = "case-studies"
        return tags

    # 4. courses / academy
    if tags["is_course"]:
        tags["category"] = "courses-academy"
        return tags

    # 5. calculators
    if tags["is_calculator"]:
        tags["category"] = "calculators-tools"
        return tags

    # 6. questions / FAQs
    if slug.startswith(QUESTION_PREFIXES):
        tags["is_question"] = True
        tags["category"] = "faq-questions"
        return tags

    # 7. regulations / rules
    if slug.endswith("-airbnb-rules") or "-regulations-" in slug or slug.endswith(
        "-regulations-uk"
    ) or slug.endswith("-rules-liverpool") or slug in {
        "oxford-airbnb-rules", "manchester-airbnb-rules",
        "short-term-let-rules-liverpool", "airbnb-rules-stratford-upon-avon",
        "holiday-let-regulations-uk", "short-let-regulations-warwickshire",
        "short-let-regulations-nottinghamshire",
    }:
        tags["category"] = "regulations-rules"
        return tags

    # 8. service / location pages
    service, city, modifier = _detect_service_and_city(slug)
    if service:
        tags["service"] = service
        tags["city"] = city
        if city:
            tags["category"] = "location-page"
            tags["subcategory"] = service
            if modifier and modifier not in {"city", "modifier"}:
                tags["notes"].append(f"variant:{modifier}")
        else:
            tags["category"] = "service-hub"
            tags["subcategory"] = service
            if modifier and modifier != "hub":
                tags["notes"].append(f"hub-variant:{modifier}")
        return tags

    # 9. anything else -> other (we'll pick it up in stage 3 review)
    tags["category"] = "other"
    return tags


def main() -> int:
    records = json.loads((INDEX / "all-urls.json").read_text())
    classified: list[dict] = []
    by_cat: dict[str, list[dict]] = defaultdict(list)
    matrix: dict[str, dict[str, str]] = defaultdict(dict)
    for rec in records:
        tags = classify(rec)
        entry = {**rec, **tags}
        classified.append(entry)
        by_cat[tags["category"] or "uncategorised"].append(entry)
        if (
            tags["category"] == "location-page"
            and tags["city"]
            and tags["city"] in KNOWN_CITIES
        ):
            existing = matrix[tags["city"]].get(tags["service"])
            if existing:
                # mark duplicate
                entry.setdefault("notes", []).append(f"duplicate-of:{existing}")
            else:
                matrix[tags["city"]][tags["service"]] = rec["slug"]

    (INDEX / "classified.json").write_text(
        json.dumps(classified, indent=2, ensure_ascii=False)
    )
    (INDEX / "by-category.json").write_text(
        json.dumps(
            {k: sorted(v, key=lambda r: r["slug"]) for k, v in sorted(by_cat.items())},
            indent=2,
            ensure_ascii=False,
        )
    )
    # matrix output: list-of-rows for readability
    services_in_use = sorted(
        {s for row in matrix.values() for s in row.keys()}
    )
    matrix_rows = []
    for city in sorted(matrix.keys()):
        row = {"city": city}
        for s in services_in_use:
            row[s] = matrix[city].get(s)
        matrix_rows.append(row)
    (INDEX / "city-service-matrix.json").write_text(
        json.dumps(
            {"services": services_in_use, "rows": matrix_rows},
            indent=2,
            ensure_ascii=False,
        )
    )
    # short summary on stdout
    print("Category counts:")
    for k in sorted(by_cat.keys(), key=lambda x: -len(by_cat[x])):
        print(f"  {k:<24} {len(by_cat[k])}")
    print(f"\nCities with at least one location page: {len(matrix)}")
    print(f"Service columns: {services_in_use}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
