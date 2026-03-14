"""
Minnesota Courts scraper — receiverships and bankruptcies with real property
in Hennepin and Ramsey counties.

Uses Playwright instead of scrapling for consistency with the rest of the pipeline.
"""
import re
import logging
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape MN courts for receiverships and bankruptcies involving real property."""
    results = []
    results.extend(_scrape_mn_receiverships(max_price))
    results.extend(_scrape_mn_bankruptcies(max_price))
    return results


def _scrape_mn_receiverships(max_price: int) -> list[dict]:
    """
    Scrape Minnesota District Court for receivership cases involving real property
    in Hennepin and Ramsey counties via the MN Judicial Branch public case search.
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

            for county_code, county_name, city in [
                ("27", "Hennepin", "Minneapolis"),
                ("62", "Ramsey", "St. Paul"),
            ]:
                page = context.new_page()
                try:
                    url = "https://publicaccess.courts.state.mn.us/CaseSearch"
                    logger.info(
                        f"Scraping MN courts receiverships for {county_name} County..."
                    )
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(3000)

                    # Try to fill the search form
                    # Look for county selector
                    try:
                        county_select = page.locator(
                            'select[name*="county" i], '
                            'select[id*="county" i], '
                            '#county, [name="county"]'
                        ).first
                        if county_select and county_select.is_visible():
                            county_select.select_option(value=county_code)
                            page.wait_for_timeout(1000)
                    except Exception:
                        pass

                    # Try to select case type / sub-type
                    try:
                        case_type = page.locator(
                            'select[name*="caseType" i], '
                            'select[id*="caseType" i]'
                        ).first
                        if case_type and case_type.is_visible():
                            case_type.select_option(label="Civil")
                            page.wait_for_timeout(1000)
                    except Exception:
                        pass

                    # Try to search for receivership
                    try:
                        search_input = page.locator(
                            'input[name*="search" i], '
                            'input[type="text"], '
                            'input[name*="keyword" i], '
                            '#SearchCriteria'
                        ).first
                        if search_input and search_input.is_visible():
                            search_input.fill("receivership")
                            page.wait_for_timeout(500)
                    except Exception:
                        pass

                    # Submit search
                    try:
                        submit = page.locator(
                            'button[type="submit"], '
                            'input[type="submit"], '
                            'button:has-text("Search")'
                        ).first
                        if submit and submit.is_visible():
                            submit.click()
                            page.wait_for_timeout(5000)
                    except Exception:
                        pass

                    # Extract results from whatever table/list appears
                    rows_data = page.evaluate("""() => {
                        const rows = [];
                        
                        // Try tables first
                        const tables = document.querySelectorAll('table');
                        for (const table of tables) {
                            const trs = table.querySelectorAll('tr');
                            for (let i = 1; i < trs.length && i < 100; i++) {
                                const cells = trs[i].querySelectorAll('td, th');
                                if (cells.length < 2) continue;
                                const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                                const link = trs[i].querySelector('a');
                                const href = link ? link.getAttribute('href') : '';
                                rows.push({cells: cellTexts, href: href});
                            }
                        }
                        
                        // Try result list items
                        if (rows.length === 0) {
                            const items = document.querySelectorAll(
                                '.case-row, .search-result, .result-row, ' +
                                '[class*="case"], [class*="result"]'
                            );
                            for (const item of items) {
                                const text = item.textContent.trim();
                                const link = item.querySelector('a');
                                const href = link ? link.getAttribute('href') : '';
                                if (text.length > 10) {
                                    rows.push({cells: [text], href: href});
                                }
                            }
                        }
                        
                        return rows;
                    }""")

                    for row in rows_data:
                        try:
                            cells = row.get("cells", [])
                            if not cells:
                                continue

                            # First cell is usually case number
                            case_number = cells[0].strip() if cells else ""
                            case_title = cells[1].strip() if len(cells) > 1 else ""
                            filing_date = cells[2].strip() if len(cells) > 2 else ""

                            if not case_title and not case_number:
                                continue

                            # Try to extract address from case title
                            address = (
                                _extract_address_from_case_title(case_title)
                                or case_title
                                or case_number
                            )

                            href = row.get("href", "")
                            case_url = (
                                f"https://publicaccess.courts.state.mn.us{href}"
                                if href and href.startswith("/")
                                else href or url
                            )

                            results.append({
                                "address": address,
                                "city": city,
                                "state": "MN",
                                "propertyType": "special_purpose",
                                "askPrice": 0,
                                "listingDate": filing_date,
                                "source": "court_filing",
                                "sourceUrl": case_url,
                                "description": (
                                    f"MN District Court Receivership — "
                                    f"Case {case_number} — {case_title}"
                                ),
                                "flags": ["RECEIVERSHIP", "DISTRESSED", "COURT_FILING"],
                            })
                        except Exception as e:
                            logger.debug(f"Failed to parse court row: {e}")

                    logger.info(
                        f"MN courts {county_name}: {len(results)} receivership cases"
                    )

                except PlaywrightTimeout:
                    logger.error(f"MN courts timed out for {county_name}")
                except Exception as e:
                    logger.error(
                        f"MN courts receivership scrape failed for {county_name}: {e}"
                    )
                finally:
                    page.close()

            browser.close()

    except Exception as e:
        logger.error(f"MN receiverships scrape failed: {e}")

    return results


def _scrape_mn_bankruptcies(max_price: int) -> list[dict]:
    """
    Scrape MN Bankruptcy Court (District of Minnesota) for Chapter 11 cases
    involving commercial real property.
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

            url = "https://ecf.mnb.uscourts.gov/cgi-bin/iquery.pl"
            logger.info("Scraping MN Bankruptcy Court Chapter 11 cases...")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            # Try to fill Chapter 11 search
            try:
                chapter_input = page.locator(
                    'select[name*="chapter" i], '
                    'input[name*="chapter" i]'
                ).first
                if chapter_input and chapter_input.is_visible():
                    chapter_input.select_option("11")
                    page.wait_for_timeout(1000)
            except Exception:
                pass

            # Submit
            try:
                submit = page.locator(
                    'input[type="submit"], button[type="submit"]'
                ).first
                if submit and submit.is_visible():
                    submit.click()
                    page.wait_for_timeout(5000)
            except Exception:
                pass

            rows_data = page.evaluate("""() => {
                const rows = [];
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const trs = table.querySelectorAll('tr');
                    for (let i = 1; i < trs.length && i < 50; i++) {
                        const cells = trs[i].querySelectorAll('td');
                        if (cells.length < 3) continue;
                        const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                        const link = trs[i].querySelector('a');
                        const href = link ? link.getAttribute('href') : '';
                        rows.push({cells: cellTexts, href: href});
                    }
                }
                return rows;
            }""")

            browser.close()

            for row in rows_data:
                try:
                    cells = row.get("cells", [])
                    if len(cells) < 3:
                        continue

                    case_number = cells[0].strip()
                    debtor_name = cells[1].strip()
                    filing_date = cells[2].strip()

                    if not debtor_name:
                        continue

                    # Only include cases that look like real property entities
                    title_lower = debtor_name.lower()
                    is_real_property = any(
                        kw in title_lower
                        for kw in [
                            "llc", "properties", "realty", "real estate",
                            "holdings", "building", "plaza", "center",
                            "tower", "development", "apartments", "lofts",
                        ]
                    )
                    if not is_real_property:
                        continue

                    href = row.get("href", "")
                    case_url = (
                        f"https://ecf.mnb.uscourts.gov{href}"
                        if href and href.startswith("/")
                        else href or url
                    )

                    results.append({
                        "address": debtor_name,
                        "city": "Minneapolis",
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": 0,
                        "listingDate": filing_date,
                        "source": "court_filing",
                        "sourceUrl": case_url,
                        "description": (
                            f"MN Bankruptcy Court Ch.11 — "
                            f"Case {case_number} — {debtor_name}"
                        ),
                        "flags": ["BANKRUPTCY", "DISTRESSED", "COURT_FILING"],
                    })
                except Exception as e:
                    logger.debug(f"Failed to parse bankruptcy row: {e}")

            logger.info(f"MN Bankruptcy Court: {len(results)} Chapter 11 cases")

    except PlaywrightTimeout:
        logger.error("MN Bankruptcy Court: timed out")
    except Exception as e:
        logger.error(f"MN bankruptcy scrape failed: {e}")

    return results


def _extract_address_from_case_title(title: str) -> str | None:
    """
    Try to extract a property address from a court case title.
    """
    m = re.search(
        r"\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way|N|S|E|W|NW|NE|SW|SE)\.?",
        title,
        re.IGNORECASE,
    )
    if m:
        return m.group(0).strip()
    return None
