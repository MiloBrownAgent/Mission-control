"""
Minnesota Courts scraper — receiverships and bankruptcies with real property
in Hennepin and Ramsey counties.
"""
import re
import logging
import requests

logger = logging.getLogger(__name__)

# Minnesota court case search base URL
MN_COURTS_BASE = "https://publicaccess.courts.state.mn.us/CaseSearch"

# PACER / federal courts for bankruptcy (public access)
PACER_BASE = "https://ecf.mnb.uscourts.gov"


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape MN courts for receiverships and bankruptcies involving real property."""
    results = []
    results.extend(_scrape_mn_receiverships(max_price))
    results.extend(_scrape_mn_bankruptcies(max_price))
    return results


def _scrape_mn_receiverships(max_price: int) -> list[dict]:
    """
    Scrape Minnesota District Court for receivership cases involving real property
    in Hennepin and Ramsey counties.
    """
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)

        # MN Judicial Branch public case search
        # Search for receivership cases in Hennepin/Ramsey
        for county_code, county_name, city in [
            ("27", "Hennepin", "Minneapolis"),
            ("62", "Ramsey", "St. Paul"),
        ]:
            try:
                url = (
                    f"https://publicaccess.courts.state.mn.us/CaseSearch"
                    f"?county={county_code}&caseType=civil&searchType=caseType"
                    f"&caseSubType=receivership"
                )
                logger.info(f"Scraping MN courts receiverships for {county_name} County...")
                page = fetcher.get(url)

                rows = page.css("table.search-results tr") or page.css(".case-row") or []
                for row in rows[1:]:
                    try:
                        cells = row.css("td")
                        if len(cells) < 3:
                            continue

                        case_number = cells[0].text.strip()
                        case_title = cells[1].text.strip()
                        filing_date = cells[2].text.strip()
                        link_el = row.css_first("a[href*='CaseDetail']")

                        if not case_title:
                            continue

                        # Try to extract address from case title
                        address = _extract_address_from_case_title(case_title) or case_title
                        case_url = ""
                        if link_el:
                            href = link_el.attrib.get("href", "")
                            case_url = (
                                f"https://publicaccess.courts.state.mn.us{href}"
                                if href.startswith("/")
                                else href
                            )

                        results.append(
                            {
                                "address": address,
                                "city": city,
                                "state": "MN",
                                "propertyType": "special_purpose",
                                "askPrice": 0,  # Price TBD — requires further research
                                "listingDate": filing_date,
                                "source": "court_filing",
                                "sourceUrl": case_url or url,
                                "description": f"MN District Court Receivership — Case {case_number} — {case_title}",
                                "flags": ["RECEIVERSHIP", "DISTRESSED", "COURT_FILING"],
                            }
                        )
                    except Exception as e:
                        logger.debug(f"Failed to parse court row: {e}")

                logger.info(f"MN courts {county_name}: {len(results)} receivership cases")
            except Exception as e:
                logger.error(f"MN courts receivership scrape failed for {county_name}: {e}")

    except Exception as e:
        logger.error(f"MN receiverships scrape failed: {e}")
    return results


def _scrape_mn_bankruptcies(max_price: int) -> list[dict]:
    """
    Scrape MN Bankruptcy Court (District of Minnesota) for Chapter 11 cases
    involving commercial real property in Hennepin/Ramsey.
    
    Uses the PACER public search for MN Bankruptcy Court.
    Note: Full access requires PACER account; this scrapes the public search.
    """
    results = []
    try:
        from scrapling import Fetcher

        fetcher = Fetcher(auto_match=True)

        # MN Bankruptcy Court public case search
        url = "https://ecf.mnb.uscourts.gov/cgi-bin/iquery.pl?chapter=11&State=MN"
        logger.info("Scraping MN Bankruptcy Court Chapter 11 cases...")
        page = fetcher.get(url)

        rows = page.css("table tr") or []
        for row in rows[1:50]:  # limit to 50 rows
            try:
                cells = row.css("td")
                if len(cells) < 3:
                    continue

                case_number = cells[0].text.strip()
                debtor_name = cells[1].text.strip()
                filing_date = cells[2].text.strip()
                link_el = row.css_first("a")

                if not debtor_name:
                    continue

                # Heuristic: only include cases that look like real property
                title_lower = debtor_name.lower()
                is_real_property = any(
                    kw in title_lower
                    for kw in [
                        "llc",
                        "properties",
                        "realty",
                        "real estate",
                        "holdings",
                        "building",
                        "plaza",
                        "center",
                        "tower",
                        "development",
                    ]
                )
                if not is_real_property:
                    continue

                case_url = ""
                if link_el:
                    href = link_el.attrib.get("href", "")
                    case_url = (
                        f"https://ecf.mnb.uscourts.gov{href}"
                        if href.startswith("/")
                        else href
                    )

                results.append(
                    {
                        "address": debtor_name,  # debtor name as proxy for address
                        "city": "Minneapolis",  # default; would need case details to confirm
                        "state": "MN",
                        "propertyType": "special_purpose",
                        "askPrice": 0,
                        "listingDate": filing_date,
                        "source": "court_filing",
                        "sourceUrl": case_url or url,
                        "description": f"MN Bankruptcy Court Ch.11 — Case {case_number} — {debtor_name}",
                        "flags": ["BANKRUPTCY", "DISTRESSED", "COURT_FILING"],
                    }
                )
            except Exception as e:
                logger.debug(f"Failed to parse bankruptcy row: {e}")

        logger.info(f"MN Bankruptcy Court: {len(results)} Chapter 11 cases")
    except Exception as e:
        logger.error(f"MN bankruptcy scrape failed: {e}")
    return results


def _extract_address_from_case_title(title: str) -> str | None:
    """
    Try to extract a property address from a court case title.
    Case titles often follow patterns like:
    - "123 Main St LLC Receivership"
    - "In Re: 456 Oak Ave Properties"
    """
    # Match patterns like "123 Main St" or "456 Oak Ave NW"
    m = re.search(
        r"\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way|N|S|E|W|NW|NE|SW|SE)\.?",
        title,
        re.IGNORECASE,
    )
    if m:
        return m.group(0).strip()
    return None
