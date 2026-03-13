#!/usr/bin/env python3
"""CRE Scanner — Daily commercial real estate opportunity scanner for Minneapolis/St. Paul."""

import json
import logging
import sys
import os
import requests
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import CITIES, STATE, MAX_PRICE, CONVEX_URL, CONVEX_CRE_TOKEN, EXCLUDE_FLAGS
from scoring import score_property
from memo import generate_memo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cre-scanner")


# ── Scrapers ─────────────────────────────────────────────────

def run_scrapers() -> list[dict]:
    """Run all source scrapers and collect results."""
    all_properties = []

    scrapers = [
        ("loopnet", "sources.loopnet"),
        ("crexi", "sources.crexi"),
        ("county", "sources.county"),
        ("courts", "sources.courts"),
    ]

    for name, module_path in scrapers:
        try:
            logger.info(f"Running {name} scraper...")
            module = __import__(module_path, fromlist=["scrape"])
            results = module.scrape(CITIES, MAX_PRICE)
            logger.info(f"{name}: found {len(results)} properties")
            all_properties.extend(results)
        except Exception as e:
            logger.error(f"{name} scraper failed: {e}", exc_info=True)

    return all_properties


# ── Deduplication ─────────────────────────────────────────────

def normalize_address(address: str) -> str:
    """Normalize address for deduplication."""
    import re

    addr = address.upper().strip()
    addr = re.sub(r"\s+", " ", addr)
    replacements = {
        " STREET": " ST",
        " AVENUE": " AVE",
        " BOULEVARD": " BLVD",
        " DRIVE": " DR",
        " ROAD": " RD",
        " LANE": " LN",
        " COURT": " CT",
        " PLACE": " PL",
        " NORTH": " N",
        " SOUTH": " S",
        " EAST": " E",
        " WEST": " W",
        " NORTHWEST": " NW",
        " NORTHEAST": " NE",
        " SOUTHWEST": " SW",
        " SOUTHEAST": " SE",
    }
    for old, new in replacements.items():
        addr = addr.replace(old, new)
    return addr


def deduplicate(properties: list[dict]) -> list[dict]:
    """Deduplicate properties by normalized address, merging sources."""
    seen: dict[str, dict] = {}

    for prop in properties:
        key = normalize_address(prop.get("address", ""))
        if not key:
            continue

        if key in seen:
            existing = seen[key]
            # Merge sources list
            if not existing.get("allSources"):
                existing["allSources"] = [
                    {
                        "source": existing["source"],
                        "url": existing.get("sourceUrl", ""),
                    }
                ]
            existing["allSources"].append(
                {"source": prop["source"], "url": prop.get("sourceUrl", "")}
            )
            # Prefer non-zero fields from either record
            for field in ["capRate", "squareFeet", "pricePerSF", "yearBuilt", "description", "daysOnMarket"]:
                if prop.get(field) and not existing.get(field):
                    existing[field] = prop[field]
            # Take lower price if both have prices (conservative)
            if prop.get("askPrice") and existing.get("askPrice"):
                existing["askPrice"] = min(existing["askPrice"], prop["askPrice"])
        else:
            seen[key] = prop

    return list(seen.values())


def filter_excluded(properties: list[dict]) -> list[dict]:
    """Remove properties with excluded risk flags."""
    filtered = []
    for prop in properties:
        risk_flags = prop.get("riskFlags", [])
        if not any(f in EXCLUDE_FLAGS for f in risk_flags):
            filtered.append(prop)
    excluded = len(properties) - len(filtered)
    if excluded:
        logger.info(f"Filtered out {excluded} properties due to risk flags: {EXCLUDE_FLAGS}")
    return filtered


# ── Scoring & Memos ───────────────────────────────────────────

def enrich_and_score(properties: list[dict]) -> list[dict]:
    """Enrich with assessed values, score, and generate memos."""
    for prop in properties:
        # Try to get assessed value from county data
        try:
            from sources.county import get_assessed_value

            assessed = get_assessed_value(prop.get("address", ""), prop.get("city", ""))
            if assessed:
                prop["assessedValue"] = assessed
                prop["assessedValueSource"] = "county_assessor"
        except Exception as e:
            logger.debug(f"Could not fetch assessed value for {prop.get('address')}: {e}")

        # Score the property
        score, justification = score_property(prop)
        prop["score"] = score
        prop["scoreJustification"] = justification

    # Sort by score descending
    properties.sort(key=lambda p: p.get("score", 0), reverse=True)

    # Generate AI investment memos for top-scored properties
    memo_limit = 25
    logger.info(f"Generating investment memos for top {memo_limit} properties...")
    for i, prop in enumerate(properties[:memo_limit]):
        try:
            logger.info(
                f"  [{i+1}/{memo_limit}] Memo for {prop.get('address', 'unknown')} "
                f"(score: {prop.get('score', 0)})..."
            )
            prop["investmentMemo"] = generate_memo(prop)
        except Exception as e:
            logger.warning(f"Memo generation failed for {prop.get('address')}: {e}")

    return properties


# ── Convex Push ───────────────────────────────────────────────

def push_to_convex(properties: list[dict]) -> dict:
    """Push properties to Convex via HTTP ingest endpoint."""
    if not properties:
        logger.info("No properties to push")
        return {"newCount": 0, "updatedCount": 0, "priceDropCount": 0}

    url = f"{CONVEX_URL}/api/cre/ingest"

    # Clean and validate each property for the API
    clean_props = []
    for prop in properties:
        address = prop.get("address", "").strip()
        if not address:
            continue

        clean: dict = {
            "address": address,
            "city": prop.get("city", "").strip() or "Minneapolis",
            "state": prop.get("state", STATE),
            "propertyType": _normalize_property_type(prop.get("propertyType", "")),
            "askPrice": int(prop.get("askPrice", 0)),
            "score": int(prop.get("score", 50)),
            "source": prop.get("source", "other"),
        }

        # Optional fields — only include if present and valid
        optional_fields = [
            "pricePerSF",
            "squareFeet",
            "lotSize",
            "units",
            "capRate",
            "yearBuilt",
            "zoning",
            "assessedValue",
            "assessedValueSource",
            "listingDate",
            "daysOnMarket",
            "sourceUrl",
            "scoreJustification",
            "investmentMemo",
            "comps",
            "flags",
            "riskFlags",
            "imageUrl",
            "description",
            "listingAgent",
            "listingBrokerage",
        ]
        for field in optional_fields:
            val = prop.get(field)
            if val is not None:
                # Ensure numeric types are correct
                if field in ("pricePerSF", "capRate"):
                    val = float(val) if val else None
                elif field in ("squareFeet", "units", "yearBuilt", "daysOnMarket", "assessedValue"):
                    val = int(val) if val else None
                if val is not None:
                    clean[field] = val

        clean_props.append(clean)

    if not clean_props:
        logger.warning("No valid properties to push after cleaning")
        return {"newCount": 0, "updatedCount": 0, "priceDropCount": 0}

    logger.info(f"Pushing {len(clean_props)} properties to Convex at {url}...")

    try:
        response = requests.post(
            url,
            json={"properties": clean_props},
            headers={
                "Authorization": f"Bearer {CONVEX_CRE_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()
        logger.info(f"Convex push result: {result}")
        return result
    except requests.exceptions.HTTPError as e:
        logger.error(f"Convex push HTTP error: {e.response.status_code} — {e.response.text[:500]}")
        return {"error": str(e)}
    except Exception as e:
        logger.error(f"Convex push failed: {e}")
        return {"error": str(e)}


def _normalize_property_type(ptype: str) -> str:
    """Ensure property type is a valid enum value."""
    valid = {"office", "retail", "industrial", "multifamily", "mixed_use", "land", "special_purpose"}
    ptype = ptype.lower().replace("-", "_").replace(" ", "_")
    return ptype if ptype in valid else "special_purpose"


# ── Main ──────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info(f"CRE Scanner starting at {datetime.now().isoformat()}")
    logger.info(f"Cities: {', '.join(CITIES)} | Max Price: ${MAX_PRICE:,}")
    logger.info("=" * 60)

    # 1. Scrape all sources
    raw = run_scrapers()
    logger.info(f"Total raw listings: {len(raw)}")

    if not raw:
        logger.warning("No listings scraped. Check scraper connectivity.")
        return

    # 2. Deduplicate
    deduped = deduplicate(raw)
    logger.info(f"After dedup: {len(deduped)} unique properties")

    # 3. Filter excluded
    filtered = filter_excluded(deduped)
    logger.info(f"After filtering: {len(filtered)} properties")

    # 4. Score and generate memos
    scored = enrich_and_score(filtered)

    # 5. Push to Convex
    result = push_to_convex(scored)

    logger.info("=" * 60)
    logger.info(f"CRE Scanner complete. Results: {json.dumps(result)}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
