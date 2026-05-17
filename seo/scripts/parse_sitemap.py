"""Stage 1: parse sitemap.xml -> structured JSON index.

Reads the raw XML sitemap and emits:
  seo/index/all-urls.json    — every URL with metadata
  seo/index/summary.json     — counts + top-line stats
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SITEMAP = ROOT / "seo" / "sitemap.xml"
OUT_DIR = ROOT / "seo" / "index"
OUT_DIR.mkdir(parents=True, exist_ok=True)

NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
    "xhtml": "http://www.w3.org/1999/xhtml",
    "video": "http://www.google.com/schemas/sitemap-video/1.1",
}


def slug_of(loc: str) -> str:
    path = re.sub(r"^https?://[^/]+/", "", loc).rstrip("/")
    return path or "(home)"


def parse() -> list[dict]:
    tree = ET.parse(SITEMAP)
    root = tree.getroot()
    out: list[dict] = []
    for url in root.findall("sm:url", NS):
        loc = (url.findtext("sm:loc", default="", namespaces=NS) or "").strip()
        if not loc:
            continue
        images = [
            (img.findtext("image:loc", default="", namespaces=NS) or "").strip()
            for img in url.findall("image:image", NS)
        ]
        record = {
            "loc": loc,
            "slug": slug_of(loc),
            "lastmod": url.findtext("sm:lastmod", default="", namespaces=NS) or None,
            "changefreq": url.findtext("sm:changefreq", default="", namespaces=NS) or None,
            "priority": (
                float(url.findtext("sm:priority", default="0", namespaces=NS) or 0)
                or None
            ),
            "image_count": len(images),
            "images": images,
        }
        out.append(record)
    return out


def summarize(records: list[dict]) -> dict:
    by_changefreq = Counter(r["changefreq"] for r in records)
    by_priority = Counter(r["priority"] for r in records)
    by_lastmod_year = Counter((r["lastmod"] or "")[:4] for r in records)
    image_stats = [r["image_count"] for r in records]
    return {
        "total_urls": len(records),
        "by_changefreq": dict(by_changefreq),
        "by_priority": {str(k): v for k, v in by_priority.items()},
        "by_lastmod_year": dict(by_lastmod_year),
        "image_count_total": sum(image_stats),
        "image_count_mean": round(sum(image_stats) / max(len(image_stats), 1), 2),
        "image_count_max": max(image_stats) if image_stats else 0,
        "pages_with_zero_images": sum(1 for n in image_stats if n == 0),
    }


def main() -> int:
    if not SITEMAP.exists():
        print(f"missing sitemap at {SITEMAP}", file=sys.stderr)
        return 1
    records = parse()
    records.sort(key=lambda r: r["slug"])
    (OUT_DIR / "all-urls.json").write_text(
        json.dumps(records, indent=2, ensure_ascii=False)
    )
    (OUT_DIR / "summary.json").write_text(
        json.dumps(summarize(records), indent=2, ensure_ascii=False)
    )
    print(f"wrote {len(records)} URLs -> {OUT_DIR/'all-urls.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
