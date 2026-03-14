"""LoopNet scraper using OpenClaw browser CDP connection."""
import re
import logging
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

CDP_URL = "http://127.0.0.1:18800"


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape LoopNet via OpenClaw's managed browser (CDP)."""
    results = []

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            logger.error(f"Cannot connect to OpenClaw browser at {CDP_URL}: {e}")
            logger.error("Ensure the OpenClaw browser is running: openclaw browser start")
            return []

        context = browser.contexts[0] if browser.contexts else browser.new_context()

        for city in cities:
            try:
                city_slug = city.lower().replace(" ", "-").replace(".", "")
                url = f"https://www.loopnet.com/search/commercial-real-estate/{city_slug}-mn/for-sale/"

                logger.info(f"Scraping LoopNet for {city} via CDP...")
                page = context.new_page()
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(10000)

                # Scroll to load more listings
                for _ in range(8):
                    page.evaluate("window.scrollBy(0, window.innerHeight)")
                    page.wait_for_timeout(1500)

                listings_data = page.evaluate(r"""() => {
                    const listings = [];
                    const articles = document.querySelectorAll('article');

                    for (const article of articles) {
                        try {
                            const links = article.querySelectorAll('a[href*="/Listing/"]');
                            if (links.length === 0) continue;

                            const href = links[0].getAttribute('href') || '';
                            const urlMatch = href.match(/\/Listing\/([^/]+)\/([^/]+)\//);
                            let address = '';
                            if (urlMatch) address = urlMatch[1].replace(/-/g, ' ');

                            // Get all headings
                            const h4s = article.querySelectorAll('h4');
                            const h6s = article.querySelectorAll('h6');

                            let title = '', details = '', location = '';

                            h6s.forEach((h, i) => {
                                const text = h.textContent.trim();
                                if (i === 0) title = text;
                                if (text.match(/\b(MN|Minneapolis|St\.?\s*Paul)\b/i)) location = text;
                            });

                            h4s.forEach(h => {
                                const text = h.textContent.trim();
                                if (text.match(/\bSF\b|\bAcre|\bUnit/i)) details = text;
                            });

                            // Full text for price/cap extraction
                            const allText = article.textContent;

                            let price = '';
                            const priceMatch = allText.match(/\$([\d,]+(?:\.\d+)?)/);
                            if (priceMatch) price = '$' + priceMatch[1];

                            let capRate = '';
                            const capMatch = allText.match(/([\d.]+)\s*%\s*CAP/i);
                            if (capMatch) capRate = capMatch[1];

                            // Try to get property type from various elements
                            let propType = '';
                            const typePatterns = /\b(Retail|Office|Industrial|Multifamily|Mixed.?Use|Land|Warehouse|Flex|Restaurant|Medical|Apartment|Special)\b/i;
                            const typeMatch = allText.match(typePatterns);
                            if (typeMatch) propType = typeMatch[1];

                            // Try to get SF from full text if not in h4
                            let sf = '';
                            if (!details) {
                                const sfMatch = allText.match(/([\d,]+)\s*SF\b/);
                                if (sfMatch) sf = sfMatch[1];
                            }

                            // Get list items for features
                            const features = [];
                            article.querySelectorAll('li').forEach(li => {
                                features.push(li.textContent.trim());
                            });

                            if (address || title) {
                                listings.push({
                                    address, title, details, location, price, capRate,
                                    propType, sf, features,
                                    sourceUrl: href.startsWith('/') ? 'https://www.loopnet.com' + href : href,
                                });
                            }
                        } catch(e) {}
                    }
                    return listings;
                }""")

                city_count = 0
                for item in listings_data:
                    try:
                        price = parse_price(item.get("price", ""))
                        if price and price > max_price:
                            continue

                        details = item.get("details", "")
                        sf = parse_sf(details) or parse_sf(item.get("sf", ""))
                        prop_type = normalize_type(
                            item.get("propType", "") + " " +
                            details + " " +
                            item.get("title", "") + " " +
                            " ".join(item.get("features", []))
                        )
                        cap_rate = parse_cap_rate(item.get("capRate", ""))

                        address = item.get("address", "").strip()
                        if not address and item.get("title"):
                            address = item["title"]

                        # Clean address: capitalize properly
                        address = " ".join(w.capitalize() for w in address.split())

                        results.append({
                            "address": address,
                            "city": city,
                            "state": "MN",
                            "propertyType": prop_type,
                            "askPrice": price or 0,
                            "pricePerSF": round(price / sf, 2) if price and sf else None,
                            "squareFeet": sf,
                            "capRate": cap_rate,
                            "source": "loopnet",
                            "sourceUrl": item.get("sourceUrl", ""),
                            "description": item.get("title", ""),
                        })
                        city_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to parse LoopNet listing: {e}")

                logger.info(f"LoopNet {city}: {city_count} listings")
                page.close()
            except PlaywrightTimeout:
                logger.error(f"LoopNet timed out for {city}")
            except Exception as e:
                logger.error(f"LoopNet scrape failed for {city}: {e}")

    return results


# ── Parse helpers (shared by other scrapers) ──────────────────

def parse_price(text: str) -> int | None:
    """Parse price string like '$1,500,000' or '$1.5M' to int."""
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


def parse_sf(text: str) -> int | None:
    """Parse square footage like '12,500 SF' or '7,745 SqFt'."""
    if not text:
        return None
    m = re.search(r"([\d,]+)\s*(?:SF|sq\.?\s*ft|SqFt|square\s*feet)", text, re.IGNORECASE)
    if m:
        return int(m.group(1).replace(",", ""))
    m = re.search(r"(\d[\d,]*)", text)
    return int(m.group(1).replace(",", "")) if m else None


def parse_cap_rate(text: str) -> float | None:
    """Parse cap rate like '6.5' or '6.5%'."""
    if not text:
        return None
    m = re.search(r"([\d.]+)", text)
    return float(m.group(1)) if m else None


def parse_int(text: str) -> int | None:
    """Parse an integer from text."""
    if not text:
        return None
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def normalize_type(text: str) -> str:
    """Normalize property type to our enum values."""
    text = text.lower()
    if "office" in text:
        return "office"
    if "retail" in text or "restaurant" in text or "storefront" in text:
        return "retail"
    if "industrial" in text or "warehouse" in text or "flex" in text:
        return "industrial"
    if "multi" in text or "apartment" in text or "unit" in text:
        return "multifamily"
    if "mixed" in text:
        return "mixed_use"
    if "land" in text or "lot" in text or "acre" in text:
        return "land"
    return "special_purpose"
