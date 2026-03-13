"""LoopNet scraper for Minneapolis/St. Paul CRE listings."""
import re
import logging

logger = logging.getLogger(__name__)


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape LoopNet for commercial property listings."""
    try:
        from scrapling import Fetcher
    except ImportError:
        logger.error("scrapling not installed. Run: pip install scrapling")
        return []

    results = []
    fetcher = Fetcher(auto_match=True)

    for city in cities:
        try:
            city_slug = city.lower().replace(" ", "-").replace(".", "")
            url = (
                f"https://www.loopnet.com/search/commercial-real-estate/"
                f"{city_slug}-mn/for-sale/?sk=c5de5fd74e28b5380a4e8c89eb036a0d&e=u"
            )

            logger.info(f"Scraping LoopNet for {city}...")
            page = fetcher.get(url)

            listings = (
                page.css("article.placard")
                or page.css("[data-testid='placard']")
                or page.css(".placard-content")
            )

            city_count = 0
            for listing in listings:
                try:
                    address_el = listing.css_first(
                        ".placard-header-title, .header-col h2 a, [data-testid='address']"
                    )
                    price_el = listing.css_first(
                        ".placard-header-price, .price, [data-testid='price']"
                    )
                    type_el = listing.css_first(
                        ".placard-header-type, .type, [data-testid='type']"
                    )
                    sf_el = listing.css_first("[data-testid='size'], .size")
                    cap_el = listing.css_first("[data-testid='cap-rate'], .cap-rate")
                    link_el = listing.css_first("a[href*='/listing/']")
                    dom_el = listing.css_first("[data-testid='days-on-market'], .days-on-market")
                    year_el = listing.css_first("[data-testid='year-built'], .year-built")

                    if not address_el:
                        continue

                    address = address_el.text.strip()
                    price_text = price_el.text.strip() if price_el else ""
                    price = parse_price(price_text)

                    if price and price > max_price:
                        continue

                    prop_type = normalize_type(
                        type_el.text.strip() if type_el else ""
                    )
                    sf = parse_sf(sf_el.text.strip() if sf_el else "")
                    cap_rate = parse_cap_rate(cap_el.text.strip() if cap_el else "")
                    dom = parse_int(dom_el.text.strip() if dom_el else "")
                    year_built = parse_int(year_el.text.strip() if year_el else "")

                    source_url = ""
                    if link_el:
                        href = link_el.attrib.get("href", "")
                        source_url = (
                            f"https://www.loopnet.com{href}"
                            if href.startswith("/")
                            else href
                        )

                    results.append(
                        {
                            "address": address,
                            "city": city,
                            "state": "MN",
                            "propertyType": prop_type,
                            "askPrice": price or 0,
                            "pricePerSF": (
                                round(price / sf, 2) if price and sf else None
                            ),
                            "squareFeet": sf,
                            "capRate": cap_rate,
                            "daysOnMarket": dom,
                            "yearBuilt": year_built,
                            "source": "loopnet",
                            "sourceUrl": source_url,
                            "description": "",
                        }
                    )
                    city_count += 1
                except Exception as e:
                    logger.warning(f"Failed to parse LoopNet listing: {e}")
                    continue

            logger.info(f"LoopNet {city}: {city_count} listings")
        except Exception as e:
            logger.error(f"LoopNet scrape failed for {city}: {e}")

    return results


def parse_price(text: str) -> int | None:
    """Parse price string like '$1,500,000' to int."""
    text = text.replace(",", "").replace("$", "").strip()
    # Handle 'M' suffix
    m = re.search(r"([\d.]+)\s*[Mm]", text)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*[Kk]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def parse_sf(text: str) -> int | None:
    """Parse square footage like '12,500 SF'."""
    text = text.strip()
    m = re.search(r"([\d,]+)\s*(?:SF|sq\.?\s*ft|square\s*feet)", text, re.IGNORECASE)
    if m:
        return int(m.group(1).replace(",", ""))
    m = re.search(r"(\d[\d,]*)", text)
    return int(m.group(1).replace(",", "")) if m else None


def parse_cap_rate(text: str) -> float | None:
    """Parse cap rate like '6.5%'."""
    m = re.search(r"([\d.]+)\s*%", text)
    return float(m.group(1)) if m else None


def parse_int(text: str) -> int | None:
    """Parse an integer from text."""
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def normalize_type(text: str) -> str:
    """Normalize property type to our enum values."""
    text = text.lower()
    if "office" in text:
        return "office"
    if "retail" in text or "storefront" in text:
        return "retail"
    if "industrial" in text or "warehouse" in text or "flex" in text:
        return "industrial"
    if "multi" in text or "apartment" in text:
        return "multifamily"
    if "mixed" in text:
        return "mixed_use"
    if "land" in text or "lot" in text:
        return "land"
    return "special_purpose"
