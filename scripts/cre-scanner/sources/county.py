"""
County data scrapers: Hennepin & Ramsey sheriff sales, tax forfeitures, assessed values.

Updated March 2026 for redesigned county websites:
- Hennepin foreclosures: Direct API at api.hennepincounty.gov (JSON)
- Hennepin tax-forfeited: ePropertyPlus inventory site via Playwright
- Ramsey sheriff: No public list available (per county policy)
- Ramsey tax-forfeited: County page + MNBid auctions via Playwright
"""
import re
import logging
import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Hennepin foreclosure API (public subscription key embedded in their SPA)
HENNEPIN_FORECLOSURE_API = (
    "https://api.hennepincounty.gov/hcso-public-services-api/v1/Foreclosure/Search"
)
HENNEPIN_API_KEY = "e522a816143443189f09de85c4288b98"

# Cities we care about in Hennepin County
HENNEPIN_CITIES = {"minneapolis", "brooklyn park", "bloomington", "eden prairie",
                   "richfield", "st louis park", "golden valley", "edina",
                   "brooklyn center", "crystal", "robbinsdale", "plymouth",
                   "maple grove", "new hope", "hopkins"}


# ── Public entry point ──────────────────────────────────────

def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape county sheriff sales and tax forfeitures."""
    results = []
    results.extend(_scrape_hennepin_foreclosures(max_price))
    results.extend(_scrape_hennepin_tax(max_price))
    results.extend(_scrape_ramsey_sheriff(max_price))
    results.extend(_scrape_ramsey_tax(max_price))
    return results


# ── Assessed value lookup ───────────────────────────────────

def get_assessed_value(address: str, city: str) -> int | None:
    """Look up assessed value via county assessor APIs."""
    city_lower = city.lower()
    if "minneapolis" in city_lower or "hennepin" in city_lower:
        return _hennepin_assessed_value(address)
    elif "paul" in city_lower or "ramsey" in city_lower:
        return _ramsey_assessed_value(address)
    val = _hennepin_assessed_value(address)
    return val if val else _ramsey_assessed_value(address)


def _hennepin_assessed_value(address: str) -> int | None:
    """Query Hennepin County property info API."""
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
            val = features[0].get("attributes", {}).get("EMV_TOTAL")
            if val and val > 0:
                return int(val)
    except Exception as e:
        logger.debug(f"Hennepin assessed value lookup failed for {address}: {e}")
    return None


def _ramsey_assessed_value(address: str) -> int | None:
    """Query Ramsey County property info."""
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
            val = features[0].get("attributes", {}).get("MARKET_VALUE")
            if val and val > 0:
                return int(val)
    except Exception as e:
        logger.debug(f"Ramsey assessed value lookup failed for {address}: {e}")
    return None


# ── Hennepin Foreclosure Sales (API) ────────────────────────

def _scrape_hennepin_foreclosures(max_price: int) -> list[dict]:
    """
    Fetch Hennepin County foreclosure sales via their public JSON API.
    This is the same API their SPA at foreclosure.hennepin.us uses.
    """
    results = []
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Ocp-Apim-Subscription-Key": HENNEPIN_API_KEY,
        "Referer": "https://foreclosure.hennepin.us/",
        "Origin": "https://foreclosure.hennepin.us",
    }

    page_num = 1
    page_size = 100
    total_fetched = 0
    max_records = 500  # safety limit

    logger.info("Fetching Hennepin foreclosures via API...")

    while total_fetched < max_records:
        try:
            payload = {
                "dateOfSale": None,
                "address": None,
                "city": None,
                "mortgagorName": None,
                "pagination": {
                    "activePage": page_num,
                    "pageSize": page_size,
                },
            }
            resp = requests.post(
                HENNEPIN_FORECLOSURE_API,
                json=payload,
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            records = data.get("data", [])

            if not records:
                break

            for rec in records:
                try:
                    address = rec.get("address", "").strip()
                    city = rec.get("city", "Minneapolis").strip()
                    sale_date = rec.get("dateOfSale", "")
                    sale_type = rec.get("typeOfSale", "")
                    record_num = rec.get("saleRecordNumber", "")
                    mortgagors = rec.get("mortgagors", [])
                    mortgagor_names = ", ".join(
                        m.get("display", "") for m in mortgagors
                    )

                    if not address:
                        continue

                    # Only include Minneapolis metro area
                    if city.lower() not in HENNEPIN_CITIES:
                        continue

                    # Format date
                    if sale_date and "T" in sale_date:
                        sale_date = sale_date.split("T")[0]

                    desc = f"Hennepin County Foreclosure — {sale_type}"
                    if mortgagor_names:
                        desc += f" — {mortgagor_names}"
                    if record_num:
                        desc += f" (#{record_num})"

                    results.append({
                        "address": address,
                        "city": city,
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": 0,
                        "listingDate": sale_date,
                        "source": "hennepin_sheriff",
                        "sourceUrl": "https://foreclosure.hennepin.us/mortgage-foreclosure",
                        "description": desc,
                        "flags": ["SHERIFF_SALE", "DISTRESSED"],
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse foreclosure record: {e}")

            total_fetched += len(records)
            logger.info(
                f"Hennepin foreclosures page {page_num}: {len(records)} records "
                f"(total: {total_fetched})"
            )

            # If we got fewer than page_size, we're at the end
            if len(records) < page_size:
                break

            page_num += 1

        except requests.exceptions.HTTPError as e:
            logger.error(f"Hennepin foreclosure API HTTP error: {e}")
            break
        except Exception as e:
            logger.error(f"Hennepin foreclosure API error: {e}")
            break

    logger.info(f"Hennepin foreclosures: {len(results)} properties (from {total_fetched} total records)")
    return results


# ── Hennepin Tax Forfeitures ────────────────────────────────

def _scrape_hennepin_tax(max_price: int) -> list[dict]:
    """
    Scrape Hennepin County tax-forfeited land inventory.
    The ePropertyPlus site is a JS web app — use Playwright to interact.
    """
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
            )

            # Intercept API responses from ePropertyPlus
            api_data = []

            def capture_response(response):
                url = response.url
                if any(kw in url.lower() for kw in ["parcel", "property", "search", "listing", "inventory"]):
                    try:
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            api_data.append(response.json())
                    except Exception:
                        pass

            page = context.new_page()
            page.on("response", capture_response)

            url = "https://public-hennepin.epropertyplus.com/landmgmtpub/app/base/landing"
            logger.info(f"Fetching Hennepin tax-forfeited land: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)

            # Try clicking search/browse buttons
            for btn_text in ["Search", "View All", "Browse", "Find", "Submit"]:
                try:
                    btn = page.locator(f'button:has-text("{btn_text}"), a:has-text("{btn_text}"), input[value="{btn_text}"]').first
                    if btn and btn.is_visible():
                        btn.click()
                        page.wait_for_timeout(5000)
                        break
                except Exception:
                    continue

            # Also try: click any visible search icon or submit
            try:
                page.locator('button[type="submit"], input[type="submit"]').first.click()
                page.wait_for_timeout(5000)
            except Exception:
                pass

            # Parse any captured API data
            for data in api_data:
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    items = data.get("data", data.get("results", data.get("parcels", [])))
                    if not isinstance(items, list):
                        continue
                else:
                    continue

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    address = (
                        item.get("address", "")
                        or item.get("propertyAddress", "")
                        or item.get("siteAddress", "")
                        or item.get("parcelAddress", "")
                    )
                    if not address:
                        continue

                    price = 0
                    for pf in ["askPrice", "price", "listPrice", "marketValue", "appraised"]:
                        if item.get(pf):
                            try:
                                price = int(float(str(item[pf]).replace(",", "").replace("$", "")))
                            except (ValueError, TypeError):
                                pass
                            if price:
                                break

                    if price and price > max_price:
                        continue

                    results.append({
                        "address": address,
                        "city": item.get("city", "Minneapolis"),
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price,
                        "source": "hennepin_tax",
                        "sourceUrl": url,
                        "description": "Hennepin County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })

            # Fallback: scrape visible page content
            if not results:
                page_data = page.evaluate("""() => {
                    const rows = [];
                    const tables = document.querySelectorAll('table');
                    for (const table of tables) {
                        const trs = table.querySelectorAll('tr');
                        for (let i = 1; i < trs.length; i++) {
                            const cells = trs[i].querySelectorAll('td');
                            if (cells.length >= 2) {
                                rows.push(Array.from(cells).map(c => c.textContent.trim()));
                            }
                        }
                    }
                    return rows;
                }""")

                for cells in page_data:
                    if not cells or len(cells) < 2:
                        continue
                    address = cells[0].strip()
                    if len(address) < 5:
                        continue
                    price = _parse_price(cells[1]) if len(cells) > 1 else 0
                    if price and price > max_price:
                        continue
                    results.append({
                        "address": address,
                        "city": "Minneapolis",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "source": "hennepin_tax",
                        "sourceUrl": url,
                        "description": "Hennepin County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })

            browser.close()
            logger.info(f"Hennepin tax-forfeited: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.error("Hennepin tax-forfeited: timed out")
    except Exception as e:
        logger.error(f"Hennepin tax-forfeited: scrape failed: {e}")

    return results


# ── Ramsey Sheriff Sales ────────────────────────────────────

def _scrape_ramsey_sheriff(max_price: int) -> list[dict]:
    """
    Ramsey County Sheriff's Office does not provide a public list of
    foreclosure sales. Post-sale info only at the Recorder's Office.
    """
    logger.info(
        "Ramsey County Sheriff: No public foreclosure list available "
        "(per county policy — post-sale records only at Recorder's Office)"
    )
    return []


# ── Ramsey Tax Forfeitures ──────────────────────────────────

def _scrape_ramsey_tax(max_price: int) -> list[dict]:
    """Scrape Ramsey County tax-forfeited public sales + MNBid."""
    results = []

    # Try county page
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()

            url = (
                "https://www.ramseycountymn.gov/residents/property-home/"
                "taxes-values/productive-properties/tax-forfeited-public-sales"
            )
            logger.info(f"Fetching Ramsey tax-forfeited sales: {url}")
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(3000)

            # Click expandable sections
            for btn_text in [
                "Public Sales",
                "Parcels available for immediate purchase",
            ]:
                try:
                    btn = page.locator(f'button:has-text("{btn_text}")').first
                    if btn and btn.is_visible():
                        btn.click()
                        page.wait_for_timeout(2000)
                except Exception:
                    pass

            # Extract data
            rows_data = page.evaluate("""() => {
                const rows = [];
                
                // Tables in expanded sections
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const trs = table.querySelectorAll('tr');
                    for (let i = 1; i < trs.length; i++) {
                        const cells = trs[i].querySelectorAll('td');
                        if (cells.length >= 2) {
                            rows.push(Array.from(cells).map(c => c.textContent.trim()));
                        }
                    }
                }
                
                // Links to PDFs with parcel lists
                const pdfLinks = document.querySelectorAll('a[href*=".pdf"]');
                for (const link of pdfLinks) {
                    const text = link.textContent.trim();
                    const href = link.getAttribute('href') || '';
                    if (text && (text.toLowerCase().includes('parcel') || 
                        text.toLowerCase().includes('sale') ||
                        text.toLowerCase().includes('list'))) {
                        rows.push(['PDF: ' + text, href]);
                    }
                }
                
                return rows;
            }""")

            browser.close()

            for row in rows_data:
                if not row or not row[0]:
                    continue
                text = row[0].strip()
                if text.startswith("PDF:"):
                    logger.info(f"Ramsey tax-forfeited: found PDF link — {text}")
                    continue
                if len(text) < 5:
                    continue
                price = _parse_price(row[1]) if len(row) > 1 else 0
                if price and price > max_price:
                    continue
                results.append({
                    "address": text,
                    "city": "St. Paul",
                    "state": "MN",
                    "propertyType": "special_purpose",
                    "askPrice": price or 0,
                    "source": "ramsey_tax",
                    "sourceUrl": url,
                    "description": "Ramsey County Tax Forfeited Land",
                    "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                })

            logger.info(f"Ramsey tax-forfeited: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.warning("Ramsey tax-forfeited: timed out (will try MNBid)")
    except Exception as e:
        logger.error(f"Ramsey tax-forfeited: scrape failed: {e}")

    # Also try MNBid
    results.extend(_scrape_mnbid(max_price))
    return results


def _scrape_mnbid(max_price: int) -> list[dict]:
    """Scrape MNBid auction site for Ramsey County properties."""
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
            )

            api_data = []

            def capture_response(response):
                url_str = response.url
                if any(kw in url_str.lower() for kw in ["auction", "parcel", "listing", "search", "bid"]):
                    try:
                        ct = response.headers.get("content-type", "")
                        if "json" in ct:
                            api_data.append(response.json())
                    except Exception:
                        pass

            page = context.new_page()
            page.on("response", capture_response)

            url = "https://mnbid.mn.gov"
            logger.info(f"Fetching MNBid auctions: {url}")
            page.goto(url, wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(5000)

            # Try filtering to Ramsey
            try:
                for sel in [
                    'select:has(option:has-text("Ramsey"))',
                    '[name*="county" i]',
                ]:
                    el = page.locator(sel).first
                    if el and el.is_visible():
                        el.select_option(label="Ramsey")
                        page.wait_for_timeout(3000)
                        break
            except Exception:
                pass

            # Check captured API data
            for data in api_data:
                items = []
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    for key in ["data", "results", "auctions", "parcels", "items"]:
                        if isinstance(data.get(key), list):
                            items = data[key]
                            break

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    # Filter to Ramsey
                    county = str(item.get("county", item.get("countyName", ""))).lower()
                    if county and "ramsey" not in county:
                        continue

                    address = (
                        item.get("address", "")
                        or item.get("propertyAddress", "")
                        or item.get("parcelAddress", "")
                    )
                    if not address:
                        continue

                    price = 0
                    for pf in ["minimumBid", "askPrice", "startingBid", "price"]:
                        if item.get(pf):
                            try:
                                price = int(float(str(item[pf]).replace(",", "").replace("$", "")))
                            except (ValueError, TypeError):
                                pass
                            if price:
                                break

                    if price and price > max_price:
                        continue

                    results.append({
                        "address": address,
                        "city": item.get("city", "St. Paul"),
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price,
                        "source": "ramsey_tax",
                        "sourceUrl": url,
                        "description": "Ramsey County Tax Forfeited (MNBid)",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })

            # Fallback: scrape visible table
            if not results:
                page_rows = page.evaluate("""() => {
                    const rows = [];
                    const elements = document.querySelectorAll('tr, [class*="auction"], [class*="listing"]');
                    for (const el of elements) {
                        const text = el.textContent.trim().toLowerCase();
                        if (text.includes('ramsey') && text.length > 20 && text.length < 500) {
                            rows.push(el.textContent.trim());
                        }
                    }
                    return rows;
                }""")

                for text in page_rows:
                    addr_match = re.search(
                        r"\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way)\.?",
                        text, re.IGNORECASE,
                    )
                    if addr_match:
                        address = addr_match.group(0).strip()
                        price = _parse_price(text)
                        if price and price > max_price:
                            continue
                        results.append({
                            "address": address,
                            "city": "St. Paul",
                            "state": "MN",
                            "propertyType": "special_purpose",
                            "askPrice": price or 0,
                            "source": "ramsey_tax",
                            "sourceUrl": url,
                            "description": "Ramsey County Tax Forfeited (MNBid)",
                            "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                        })

            browser.close()
            logger.info(f"MNBid Ramsey: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.warning("MNBid: timed out")
    except Exception as e:
        logger.error(f"MNBid: scrape failed: {e}")

    return results


# ── Helpers ─────────────────────────────────────────────────

def _parse_price(text: str) -> int | None:
    """Parse a price string to int."""
    if not text:
        return None
    text = str(text).replace(",", "").replace("$", "").strip()
    m = re.search(r"([\d.]+)\s*[Mm]", text)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*[Kk]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d{4,})", text)
    return int(m.group(1)) if m else None
