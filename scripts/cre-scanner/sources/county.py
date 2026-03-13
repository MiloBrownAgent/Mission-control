"""
County data scrapers: Hennepin & Ramsey sheriff sales, tax forfeitures, assessed values.
"""
import re
import logging
import requests

logger = logging.getLogger(__name__)


# ── Public entry point for the scanner ──────────────────────

def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape county sheriff sales and tax forfeitures."""
    results = []
    results.extend(_scrape_hennepin_sheriff(max_price))
    results.extend(_scrape_hennepin_tax(max_price))
    results.extend(_scrape_ramsey_sheriff(max_price))
    results.extend(_scrape_ramsey_tax(max_price))
    return results


# ── Assessed value lookup ───────────────────────────────────

def get_assessed_value(address: str, city: str) -> int | None:
    """
    Look up assessed value for a property address via county assessor APIs.
    Returns assessed value in dollars or None if not found.
    """
    city_lower = city.lower()
    if "minneapolis" in city_lower or "hennepin" in city_lower:
        return _hennepin_assessed_value(address)
    elif "paul" in city_lower or "ramsey" in city_lower:
        return _ramsey_assessed_value(address)
    # Try both
    val = _hennepin_assessed_value(address)
    if val:
        return val
    return _ramsey_assessed_value(address)


def _hennepin_assessed_value(address: str) -> int | None:
    """
    Query Hennepin County property info API.
    Endpoint: https://gis.hennepin.us/arcgis/rest/services/HennepinData/HENNEPIN_LOCATE/MapServer/1/query
    """
    try:
        url = (
            "https://gis.hennepin.us/arcgis/rest/services/HennepinData/"
            "HENNEPIN_LOCATE/MapServer/1/query"
        )
        params = {
            "where": f"FULL_ADDRESS LIKE '%{address.upper().split(',')[0].strip()}%'",
            "outFields": "FULL_ADDRESS,EMV_TOTAL,TAX_TOTAL",
            "f": "json",
            "resultRecordCount": 1,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])
        if features:
            attrs = features[0].get("attributes", {})
            val = attrs.get("EMV_TOTAL")
            if val and val > 0:
                return int(val)
    except Exception as e:
        logger.debug(f"Hennepin assessed value lookup failed for {address}: {e}")
    return None


def _ramsey_assessed_value(address: str) -> int | None:
    """
    Query Ramsey County property info via their open data portal.
    Endpoint: https://maps.ramseycounty.us/arcgis/rest/services/Property/PropertySearch/MapServer/0/query
    """
    try:
        url = (
            "https://maps.ramseycounty.us/arcgis/rest/services/Property/"
            "PropertySearch/MapServer/0/query"
        )
        params = {
            "where": f"SITUS_ADDR LIKE '%{address.upper().split(',')[0].strip()}%'",
            "outFields": "SITUS_ADDR,MARKET_VALUE",
            "f": "json",
            "resultRecordCount": 1,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])
        if features:
            attrs = features[0].get("attributes", {})
            val = attrs.get("MARKET_VALUE")
            if val and val > 0:
                return int(val)
    except Exception as e:
        logger.debug(f"Ramsey assessed value lookup failed for {address}: {e}")
    return None


# ── Hennepin Sheriff Sales ──────────────────────────────────

def _scrape_hennepin_sheriff(max_price: int) -> list[dict]:
    """Scrape Hennepin County sheriff sale listings."""
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)
        url = "https://www.hennepin.us/residents/property/sheriff-foreclosure-sales"
        logger.info("Scraping Hennepin County sheriff sales...")
        page = fetcher.get(url)

        # Parse table rows
        rows = page.css("table tr") or page.css(".field-items li") or []
        for row in rows[1:]:  # skip header
            try:
                cells = row.css("td")
                if len(cells) < 3:
                    continue

                address = cells[0].text.strip() if cells[0] else ""
                city = cells[1].text.strip() if cells[1] else "Minneapolis"
                sale_date = cells[2].text.strip() if cells[2] else ""
                price_text = cells[3].text.strip() if len(cells) > 3 else ""

                if not address:
                    continue

                price = _parse_price(price_text)
                if price and price > max_price:
                    continue

                results.append(
                    {
                        "address": address,
                        "city": city or "Minneapolis",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "listingDate": sale_date,
                        "source": "hennepin_sheriff",
                        "sourceUrl": url,
                        "description": f"Hennepin County Sheriff Sale — {sale_date}",
                        "flags": ["SHERIFF_SALE", "DISTRESSED"],
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to parse Hennepin sheriff row: {e}")

        logger.info(f"Hennepin sheriff: {len(results)} properties")
    except Exception as e:
        logger.error(f"Hennepin sheriff scrape failed: {e}")
    return results


# ── Hennepin Tax Forfeitures ────────────────────────────────

def _scrape_hennepin_tax(max_price: int) -> list[dict]:
    """Scrape Hennepin County tax forfeiture listings."""
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)
        url = "https://www.hennepin.us/residents/property/tax-forfeited-land-sale"
        logger.info("Scraping Hennepin tax forfeitures...")
        page = fetcher.get(url)

        # Property listings may be in a table or list
        rows = page.css("table tr") or page.css(".views-row") or []
        for row in rows[1:]:
            try:
                cells = row.css("td")
                if len(cells) < 2:
                    continue

                address = cells[0].text.strip()
                city = cells[1].text.strip() if len(cells) > 1 else "Minneapolis"
                price_text = cells[2].text.strip() if len(cells) > 2 else ""

                if not address:
                    continue

                price = _parse_price(price_text)
                if price and price > max_price:
                    continue

                results.append(
                    {
                        "address": address,
                        "city": city or "Minneapolis",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "source": "hennepin_tax",
                        "sourceUrl": url,
                        "description": "Hennepin County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to parse Hennepin tax row: {e}")

        logger.info(f"Hennepin tax forfeitures: {len(results)} properties")
    except Exception as e:
        logger.error(f"Hennepin tax scrape failed: {e}")
    return results


# ── Ramsey Sheriff Sales ────────────────────────────────────

def _scrape_ramsey_sheriff(max_price: int) -> list[dict]:
    """Scrape Ramsey County sheriff sale listings."""
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)
        url = "https://www.ramseycounty.us/residents/property/sheriff-sales"
        logger.info("Scraping Ramsey County sheriff sales...")
        page = fetcher.get(url)

        rows = page.css("table tr") or page.css(".field-items li") or []
        for row in rows[1:]:
            try:
                cells = row.css("td")
                if len(cells) < 2:
                    continue

                address = cells[0].text.strip()
                sale_date = cells[1].text.strip() if len(cells) > 1 else ""
                price_text = cells[2].text.strip() if len(cells) > 2 else ""

                if not address:
                    continue

                price = _parse_price(price_text)
                if price and price > max_price:
                    continue

                results.append(
                    {
                        "address": address,
                        "city": "St. Paul",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "listingDate": sale_date,
                        "source": "ramsey_sheriff",
                        "sourceUrl": url,
                        "description": f"Ramsey County Sheriff Sale — {sale_date}",
                        "flags": ["SHERIFF_SALE", "DISTRESSED"],
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to parse Ramsey sheriff row: {e}")

        logger.info(f"Ramsey sheriff: {len(results)} properties")
    except Exception as e:
        logger.error(f"Ramsey sheriff scrape failed: {e}")
    return results


# ── Ramsey Tax Forfeitures ──────────────────────────────────

def _scrape_ramsey_tax(max_price: int) -> list[dict]:
    """Scrape Ramsey County tax forfeiture listings."""
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)
        url = "https://www.ramseycounty.us/residents/property/tax-forfeited-land"
        logger.info("Scraping Ramsey tax forfeitures...")
        page = fetcher.get(url)

        rows = page.css("table tr") or page.css(".views-row") or []
        for row in rows[1:]:
            try:
                cells = row.css("td")
                if len(cells) < 2:
                    continue

                address = cells[0].text.strip()
                city = "St. Paul"
                price_text = cells[1].text.strip() if len(cells) > 1 else ""

                if not address:
                    continue

                price = _parse_price(price_text)
                if price and price > max_price:
                    continue

                results.append(
                    {
                        "address": address,
                        "city": city,
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "source": "ramsey_tax",
                        "sourceUrl": url,
                        "description": "Ramsey County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to parse Ramsey tax row: {e}")

        logger.info(f"Ramsey tax forfeitures: {len(results)} properties")
    except Exception as e:
        logger.error(f"Ramsey tax scrape failed: {e}")
    return results


# ── Helpers ─────────────────────────────────────────────────

def _parse_price(text: str) -> int | None:
    """Parse a price string to int."""
    text = text.replace(",", "").replace("$", "").strip()
    m = re.search(r"([\d.]+)\s*[Mm]", text)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*[Kk]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None
