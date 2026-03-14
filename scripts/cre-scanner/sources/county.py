"""
County data scrapers: Hennepin & Ramsey sheriff sales, tax forfeitures, assessed values.

Updated March 2026 for redesigned county websites:
- Hennepin foreclosures: https://foreclosure.hennepin.us/mortgage-foreclosure
- Hennepin tax-forfeited: https://public-hennepin.epropertyplus.com/landmgmtpub/app/base/landing
- Ramsey sheriff: No public list available (per county policy)
- Ramsey tax-forfeited: https://www.ramseycountymn.gov/.../tax-forfeited-public-sales + MNBid
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
    results.extend(_scrape_hennepin_foreclosures(max_price))
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
            attrs = features[0].get("attributes", {})
            val = attrs.get("EMV_TOTAL")
            if val and val > 0:
                return int(val)
    except Exception as e:
        logger.debug(f"Hennepin assessed value lookup failed for {address}: {e}")
    return None


def _ramsey_assessed_value(address: str) -> int | None:
    """Query Ramsey County property info via their open data portal."""
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


# ── Hennepin Foreclosure Sales ──────────────────────────────

def _scrape_hennepin_foreclosures(max_price: int) -> list[dict]:
    """
    Scrape Hennepin County foreclosure sales database.
    URL: https://foreclosure.hennepin.us/mortgage-foreclosure
    Paginated table with Sale Record Number, Address, Date of Sale, Type, Mortgagors.
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
            page = context.new_page()

            url = "https://foreclosure.hennepin.us/mortgage-foreclosure"
            logger.info(f"Fetching Hennepin foreclosures: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            # Change page size to 100 to get more results
            try:
                page_size_select = page.locator("select, [role='combobox']").first
                if page_size_select:
                    page_size_select.select_option("100")
                    page.wait_for_timeout(3000)
            except Exception as e:
                logger.debug(f"Could not change page size: {e}")

            # Scrape multiple pages
            for page_num in range(1, 6):  # up to 5 pages of 100 = 500 records
                rows_data = page.evaluate("""() => {
                    const rows = [];
                    // The table has buttons with record numbers, followed by text with details
                    // Look for all buttons that contain numeric record numbers
                    const buttons = document.querySelectorAll('button');
                    for (const btn of buttons) {
                        const text = btn.textContent.trim();
                        // Record numbers are like "2503018"
                        if (/^\\d{7}$/.test(text)) {
                            // Get the sibling/adjacent text which contains address, date, type, name
                            let parent = btn.parentElement;
                            if (!parent) continue;
                            
                            // The row text follows the button
                            let rowText = '';
                            let sibling = btn.nextSibling;
                            while (sibling) {
                                if (sibling.textContent) rowText += sibling.textContent;
                                sibling = sibling.nextSibling;
                            }
                            // Also try parent's text minus the button text
                            if (!rowText.trim()) {
                                rowText = parent.textContent.replace(text, '').trim();
                            }
                            // Try going up one more level
                            if (!rowText.trim() && parent.parentElement) {
                                rowText = parent.parentElement.textContent.replace(text, '').trim();
                            }
                            
                            rows.push({recordNumber: text, rowText: rowText.trim()});
                        }
                    }
                    
                    // Fallback: look for table rows
                    if (rows.length === 0) {
                        const trs = document.querySelectorAll('tr, [role="row"]');
                        for (const tr of trs) {
                            const text = tr.textContent.trim();
                            if (/\\d{7}/.test(text) && /\\d{4}/.test(text)) {
                                rows.push({recordNumber: '', rowText: text});
                            }
                        }
                    }
                    
                    return rows;
                }""")

                if not rows_data:
                    logger.info(f"Hennepin foreclosures page {page_num}: no data found")
                    break

                for row in rows_data:
                    try:
                        row_text = row.get("rowText", "")
                        if not row_text:
                            continue

                        # Parse: "ADDRESS, CITY DATE TYPE NAMES"
                        # Example: "5908 83rd Parkway N, Brooklyn Park Mar 17, 2025 Mortgage Ivey, Jean"
                        
                        # Try to extract address (everything before a month name)
                        month_pattern = r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b'
                        m = re.search(month_pattern, row_text)
                        if not m:
                            continue
                        
                        address_part = row_text[:m.start()].strip().rstrip(',').strip()
                        remainder = row_text[m.start():]
                        
                        # Extract date
                        date_match = re.match(
                            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})',
                            remainder
                        )
                        sale_date = date_match.group(1) if date_match else ""
                        
                        # Extract type (Mortgage, Assessment, Judgment)
                        sale_type = ""
                        for t in ["Mortgage", "Assessment", "Judgment"]:
                            if t in remainder:
                                sale_type = t
                                break
                        
                        # Parse city from address (after last comma)
                        city = "Minneapolis"
                        if "," in address_part:
                            parts = address_part.rsplit(",", 1)
                            address = parts[0].strip()
                            city = parts[1].strip() or "Minneapolis"
                        else:
                            address = address_part
                        
                        if not address or len(address) < 5:
                            continue

                        record_num = row.get("recordNumber", "")
                        source_url = url
                        
                        desc = f"Hennepin County Foreclosure Sale — {sale_type}"
                        if sale_date:
                            desc += f" — {sale_date}"
                        if record_num:
                            desc += f" — Record #{record_num}"

                        results.append({
                            "address": address,
                            "city": city,
                            "state": "MN",
                            "propertyType": "special_purpose",
                            "askPrice": 0,
                            "listingDate": sale_date,
                            "source": "hennepin_sheriff",
                            "sourceUrl": source_url,
                            "description": desc,
                            "flags": ["SHERIFF_SALE", "DISTRESSED"],
                        })
                    except Exception as e:
                        logger.debug(f"Failed to parse Hennepin foreclosure row: {e}")

                # Try to go to next page
                try:
                    next_btn = page.locator('button:has-text("go to next")').first
                    if next_btn and next_btn.is_enabled():
                        next_btn.click()
                        page.wait_for_timeout(3000)
                    else:
                        break
                except Exception:
                    break

            browser.close()
            logger.info(f"Hennepin foreclosures: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.error("Hennepin foreclosures: timed out")
    except Exception as e:
        logger.error(f"Hennepin foreclosures: scrape failed: {e}")

    return results


# ── Hennepin Tax Forfeitures ────────────────────────────────

def _scrape_hennepin_tax(max_price: int) -> list[dict]:
    """
    Scrape Hennepin County tax-forfeited land inventory.
    URL: https://public-hennepin.epropertyplus.com/landmgmtpub/app/base/landing
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
            page = context.new_page()

            url = "https://public-hennepin.epropertyplus.com/landmgmtpub/app/base/landing"
            logger.info(f"Fetching Hennepin tax-forfeited land: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)

            # Try to find and click a "Search" or "View All" button
            for selector in [
                'button:has-text("Search")',
                'button:has-text("View")',
                'a:has-text("Search")',
                'a:has-text("Browse")',
                'input[type="submit"]',
            ]:
                try:
                    el = page.locator(selector).first
                    if el and el.is_visible():
                        el.click()
                        page.wait_for_timeout(5000)
                        break
                except Exception:
                    continue

            # Scrape whatever table/list we find
            rows_data = page.evaluate("""() => {
                const rows = [];
                
                // Try standard tables
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const trs = table.querySelectorAll('tr');
                    for (let i = 1; i < trs.length; i++) {
                        const cells = trs[i].querySelectorAll('td');
                        if (cells.length < 2) continue;
                        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                        // Also grab any links
                        const link = trs[i].querySelector('a');
                        const href = link ? link.getAttribute('href') : '';
                        rows.push({cells: cellTexts, href: href});
                    }
                }
                
                // Try card/grid layouts
                if (rows.length === 0) {
                    const cards = document.querySelectorAll(
                        '.property-card, .listing-card, .result-item, ' +
                        '[class*="property"], [class*="listing"], [class*="parcel"]'
                    );
                    for (const card of cards) {
                        const text = card.textContent.trim();
                        const link = card.querySelector('a');
                        const href = link ? link.getAttribute('href') : '';
                        if (text.length > 10) {
                            rows.push({cells: [text], href: href});
                        }
                    }
                }
                
                return rows;
            }""")

            browser.close()

            if not rows_data:
                logger.info("Hennepin tax-forfeited: no listings found on inventory site")
                return []

            for row in rows_data:
                try:
                    cells = row.get("cells", [])
                    if not cells or not cells[0]:
                        continue

                    # Try to parse address from first cell
                    address = cells[0].strip()
                    if len(address) < 5:
                        continue

                    # Try to find price in cells
                    price = 0
                    for cell in cells:
                        price = _parse_price(cell)
                        if price:
                            break

                    if price and price > max_price:
                        continue

                    href = row.get("href", "")
                    source_url = href if href.startswith("http") else url

                    results.append({
                        "address": address,
                        "city": "Minneapolis",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "source": "hennepin_tax",
                        "sourceUrl": source_url,
                        "description": "Hennepin County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse Hennepin tax row: {e}")

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
    foreclosure sales. Post-sale information is only available at the
    Ramsey County Recorder's Office (Plato Building) in person.
    
    Ref: https://www.ramseycountymn.gov/.../mortgage-foreclosures
    """
    logger.info(
        "Ramsey County Sheriff: No public foreclosure list available "
        "(per county policy — post-sale records only at Recorder's Office)"
    )
    return []


# ── Ramsey Tax Forfeitures ──────────────────────────────────

def _scrape_ramsey_tax(max_price: int) -> list[dict]:
    """
    Scrape Ramsey County tax-forfeited public sales.
    Primary: county page with expandable sections
    Fallback: MNBid auction site (http://mnbid.mn.gov)
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
            page = context.new_page()

            url = (
                "https://www.ramseycountymn.gov/residents/property-home/"
                "taxes-values/productive-properties/tax-forfeited-public-sales"
            )
            logger.info(f"Fetching Ramsey tax-forfeited sales: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            # Click expandable sections to reveal content
            for btn_text in [
                "Public Sales",
                "Parcels available for immediate purchase",
                "Past sales results",
            ]:
                try:
                    btn = page.locator(f'button:has-text("{btn_text}")').first
                    if btn and btn.is_visible():
                        btn.click()
                        page.wait_for_timeout(2000)
                except Exception:
                    pass

            # Scrape any property data from expanded sections
            rows_data = page.evaluate("""() => {
                const rows = [];
                
                // Look for tables in expanded sections
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const trs = table.querySelectorAll('tr');
                    for (let i = 1; i < trs.length; i++) {
                        const cells = trs[i].querySelectorAll('td');
                        if (cells.length < 2) continue;
                        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                        rows.push(cellTexts);
                    }
                }
                
                // Look for list items with property data
                if (rows.length === 0) {
                    const items = document.querySelectorAll(
                        '[class*="accordion"] li, [class*="expand"] li, ' +
                        '[class*="panel"] li, .field-item'
                    );
                    for (const item of items) {
                        const text = item.textContent.trim();
                        // Only include items that look like property listings
                        if (text.length > 20 && /\\d/.test(text)) {
                            rows.push([text]);
                        }
                    }
                }
                
                // Look for links to property details or PDFs
                const links = document.querySelectorAll('a[href*=".pdf"], a[href*="parcel"]');
                for (const link of links) {
                    const text = link.textContent.trim();
                    const href = link.getAttribute('href');
                    if (text.length > 5) {
                        rows.push([text, href || '']);
                    }
                }
                
                return rows;
            }""")

            browser.close()

            for row in rows_data:
                try:
                    if not row or not row[0]:
                        continue

                    text = row[0].strip()
                    if len(text) < 5:
                        continue

                    address = text
                    price = 0
                    for cell in row:
                        p = _parse_price(cell)
                        if p:
                            price = p
                            break

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
                        "description": "Ramsey County Tax Forfeited Land",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse Ramsey tax row: {e}")

            logger.info(f"Ramsey tax-forfeited: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.error("Ramsey tax-forfeited: timed out")
    except Exception as e:
        logger.error(f"Ramsey tax-forfeited: scrape failed: {e}")

    # Also try MNBid
    results.extend(_scrape_mnbid(max_price))

    return results


def _scrape_mnbid(max_price: int) -> list[dict]:
    """Scrape MNBid auction site for Ramsey County tax-forfeited properties."""
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
            page = context.new_page()

            url = "https://mnbid.mn.gov"
            logger.info(f"Fetching MNBid auctions: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)

            # Try to filter to Ramsey County if possible
            try:
                county_filter = page.locator(
                    'select:has(option:has-text("Ramsey")), '
                    '[placeholder*="county" i], '
                    'input[name*="county" i]'
                ).first
                if county_filter and county_filter.is_visible():
                    county_filter.select_option(label="Ramsey")
                    page.wait_for_timeout(3000)
            except Exception:
                pass

            rows_data = page.evaluate("""() => {
                const rows = [];
                
                // Look for auction listing cards/rows
                const items = document.querySelectorAll(
                    'tr, .auction-item, .listing, [class*="auction"], [class*="property"]'
                );
                for (const item of items) {
                    const text = item.textContent.trim();
                    // Filter to Ramsey County items
                    if (text.toLowerCase().includes('ramsey') && text.length > 20) {
                        const link = item.querySelector('a');
                        const href = link ? link.getAttribute('href') : '';
                        rows.push({text: text, href: href});
                    }
                }
                
                return rows;
            }""")

            browser.close()

            for row in rows_data:
                try:
                    text = row.get("text", "").strip()
                    if not text or len(text) < 10:
                        continue

                    # Try to extract address-like content
                    addr_match = re.search(
                        r'\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way)\.?',
                        text, re.IGNORECASE
                    )
                    address = addr_match.group(0).strip() if addr_match else text[:100]

                    price = _parse_price(text)
                    if price and price > max_price:
                        continue

                    href = row.get("href", "")
                    source_url = (
                        f"https://mnbid.mn.gov{href}"
                        if href and href.startswith("/")
                        else href or url
                    )

                    results.append({
                        "address": address,
                        "city": "St. Paul",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": price or 0,
                        "source": "ramsey_tax",
                        "sourceUrl": source_url,
                        "description": "Ramsey County Tax Forfeited Land (MNBid)",
                        "flags": ["TAX_FORFEITURE", "DISTRESSED"],
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse MNBid row: {e}")

            logger.info(f"MNBid Ramsey: {len(results)} properties found")

    except PlaywrightTimeout:
        logger.error("MNBid: timed out")
    except Exception as e:
        logger.error(f"MNBid: scrape failed: {e}")

    return results


# ── Helpers ─────────────────────────────────────────────────

def _parse_price(text: str) -> int | None:
    """Parse a price string to int."""
    if not text:
        return None
    text = text.replace(",", "").replace("$", "").strip()
    m = re.search(r"([\d.]+)\s*[Mm]", text)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*[Kk]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None
