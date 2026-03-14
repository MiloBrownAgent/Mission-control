"""
County data scrapers: Hennepin & Ramsey sheriff sales, tax forfeitures, assessed values.

Sheriff sale / tax forfeiture pages use Playwright since the county sites may use JS rendering.
The GIS assessed-value API endpoints use plain requests (they work fine without a browser).
"""
import re
import logging
import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

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


# ── Shared Playwright scraper ────────────────────────────────

def _playwright_scrape_county(url: str, source: str, default_city: str,
                               max_price: int, flags: list[str],
                               description_template: str) -> list[dict]:
    """
    Generic county page scraper using Playwright.
    Attempts to find a data table on the page and extract address/date/price rows.
    Returns empty list (with a log message) if no usable table data is found.
    """
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()

            logger.info(f"Fetching {source} page: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            rows_data = page.evaluate("""() => {
                const rows = [];

                // Try standard HTML tables first
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const trs = table.querySelectorAll('tr');
                    for (let i = 1; i < trs.length; i++) {  // skip header row
                        const cells = trs[i].querySelectorAll('td, th');
                        if (cells.length < 2) continue;
                        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                        rows.push(cellTexts);
                    }
                }

                // If no table rows, try list items / views-rows
                if (rows.length === 0) {
                    const items = document.querySelectorAll('.views-row, .field-item, li.property-item');
                    for (const item of items) {
                        const text = item.textContent.trim();
                        if (text) rows.push([text]);
                    }
                }

                return rows;
            }""")

            browser.close()

            if not rows_data:
                logger.info(f"{source}: no table data found on page — skipping")
                return []

            for row in rows_data:
                try:
                    if not row:
                        continue

                    # First cell is typically address
                    address = row[0].strip() if row else ""
                    if not address or len(address) < 5:
                        continue

                    city = default_city
                    sale_date = row[1].strip() if len(row) > 1 else ""
                    price_text = row[2].strip() if len(row) > 2 else ""

                    # If only one cell, try to parse everything from it
                    if len(row) == 1:
                        price_text = row[0]
                        sale_date = ""

                    price = _parse_price(price_text)
                    if price and price > max_price:
                        continue

                    desc = description_template
                    if sale_date:
                        desc = f"{description_template} — {sale_date}"

                    results.append({
                        "address": address,
                        "city": city,
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "listingDate": sale_date,
                        "source": source,
                        "sourceUrl": url,
                        "description": desc,
                        "flags": flags,
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse {source} row: {e}")

        logger.info(f"{source}: {len(results)} properties found")
    except PlaywrightTimeout:
        logger.error(f"{source}: timed out fetching {url}")
    except Exception as e:
        logger.error(f"{source}: scrape failed: {e}")

    return results


# ── Hennepin Sheriff Sales ──────────────────────────────────

def _scrape_hennepin_sheriff(max_price: int) -> list[dict]:
    """Scrape Hennepin County sheriff sale listings."""
    return _playwright_scrape_county(
        url="https://www.hennepincounty.gov/residents/property/sheriff-sales",
        source="hennepin_sheriff",
        default_city="Minneapolis",
        max_price=max_price,
        flags=["SHERIFF_SALE", "DISTRESSED"],
        description_template="Hennepin County Sheriff Sale",
    )


# ── Hennepin Tax Forfeitures ────────────────────────────────

def _scrape_hennepin_tax(max_price: int) -> list[dict]:
    """Scrape Hennepin County tax forfeiture listings."""
    return _playwright_scrape_county(
        url="https://www.hennepincounty.gov/residents/property/tax-forfeited-land",
        source="hennepin_tax",
        default_city="Minneapolis",
        max_price=max_price,
        flags=["TAX_FORFEITURE", "DISTRESSED"],
        description_template="Hennepin County Tax Forfeited Land",
    )


# ── Ramsey Sheriff Sales ────────────────────────────────────

def _scrape_ramsey_sheriff(max_price: int) -> list[dict]:
    """Scrape Ramsey County sheriff sale listings."""
    return _playwright_scrape_county(
        url="https://www.ramseycountymn.gov/your-government/county-attorney/civil-division/sheriff-sales",
        source="ramsey_sheriff",
        default_city="St. Paul",
        max_price=max_price,
        flags=["SHERIFF_SALE", "DISTRESSED"],
        description_template="Ramsey County Sheriff Sale",
    )


# ── Ramsey Tax Forfeitures ──────────────────────────────────

def _scrape_ramsey_tax(max_price: int) -> list[dict]:
    """Scrape Ramsey County tax forfeiture listings."""
    return _playwright_scrape_county(
        url="https://www.ramseycountymn.gov/residents/property/tax-forfeited-land",
        source="ramsey_tax",
        default_city="St. Paul",
        max_price=max_price,
        flags=["TAX_FORFEITURE", "DISTRESSED"],
        description_template="Ramsey County Tax Forfeited Land",
    )


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
