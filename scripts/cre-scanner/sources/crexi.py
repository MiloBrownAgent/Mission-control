"""Crexi scraper using Brave + playwright-stealth."""
import re
import logging
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)
from .loopnet import parse_price, parse_sf, parse_cap_rate, normalize_type

stealth = Stealth()

BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape Crexi for commercial property listings."""
    results = []

    with stealth.use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=BRAVE_PATH,
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        page = context.new_page()

        for city in cities:
            try:
                city_slug = city.replace(" ", "_").replace(".", "")
                # Use pageSize param to get more results
                url = f"https://www.crexi.com/properties/MN/{city_slug}?pageSize=60&maxPrice={max_price}"

                logger.info(f"Scraping Crexi for {city}...")
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(10000)

                # Scroll thoroughly to load all listings
                for _ in range(8):
                    page.evaluate("window.scrollBy(0, window.innerHeight)")
                    page.wait_for_timeout(2000)

                listings_data = page.evaluate(r"""() => {
                    const listings = [];
                    const seen = new Set();

                    // Find all property detail links (unique by property ID)
                    const links = document.querySelectorAll('a[href*="/properties/"]');

                    for (const link of links) {
                        try {
                            const href = link.getAttribute('href') || '';
                            // Only match actual property detail pages
                            const propIdMatch = href.match(/\/properties\/(\d+)\//);
                            if (!propIdMatch) continue;

                            const propId = propIdMatch[1];
                            if (seen.has(propId)) continue;
                            seen.add(propId);

                            // Walk up to find the card container
                            let card = link;
                            for (let i = 0; i < 6; i++) {
                                if (!card.parentElement) break;
                                card = card.parentElement;
                                // Stop if we find a container that has price + address
                                if (card.querySelector('h4') && card.querySelector('h5')) break;
                            }

                            const allText = card.textContent || '';

                            // Price
                            let price = '';
                            const priceMatch = allText.match(/\$([\d,]+(?:\.\d+)?)/);
                            if (priceMatch) price = '$' + priceMatch[1];

                            // Title from h5
                            const h5 = card.querySelector('h5');
                            const title = h5 ? h5.textContent.trim() : '';

                            // Address from h4
                            const h4 = card.querySelector('h4');
                            let address = '', cityState = '';
                            if (h4) {
                                const raw = h4.textContent.trim();
                                const parts = raw.split(/\n/).map(s => s.trim()).filter(Boolean);
                                if (parts.length >= 2) {
                                    address = parts[0];
                                    cityState = parts[parts.length - 1];
                                } else {
                                    address = raw;
                                }
                            }

                            // Details line with type/cap/sqft/units
                            let details = '';
                            const spans = card.querySelectorAll('div, span');
                            for (const el of spans) {
                                const t = el.textContent.trim();
                                if (t.length > 10 && t.length < 200 &&
                                    t.match(/\b(Retail|Office|Industrial|Multifamily|Mixed|Land|Restaurant|Medical|Warehouse|Special)\b/i) &&
                                    (t.includes('•') || t.includes('SqFt') || t.includes('CAP') || t.includes('Units') || t.includes('Acres'))) {
                                    details = t;
                                    break;
                                }
                            }

                            // Parse from details
                            let capRate = '';
                            const capMatch = details.match(/([\d.]+)%\s*CAP/i);
                            if (capMatch) capRate = capMatch[1];

                            let sqft = '';
                            const sqftMatch = details.match(/([\d,]+)\s*SqFt/i);
                            if (sqftMatch) sqft = sqftMatch[1];

                            let units = '';
                            const unitsMatch = details.match(/(\d+)\s*Units?/i);
                            if (unitsMatch) units = unitsMatch[1];

                            let acres = '';
                            const acresMatch = details.match(/([\d.]+)\s*Acres?/i);
                            if (acresMatch) acres = acresMatch[1];

                            if (address || title) {
                                listings.push({
                                    address, cityState, title, price, capRate,
                                    sqft, units, acres, details,
                                    sourceUrl: 'https://www.crexi.com' + href,
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

                        sf = parse_sf(item.get("sqft", "") or item.get("details", ""))
                        prop_type = normalize_type(
                            item.get("details", "") + " " + item.get("title", "")
                        )
                        cap_rate = parse_cap_rate(item.get("capRate", ""))
                        units_str = item.get("units", "")
                        units = int(units_str) if units_str else None

                        address = item.get("address", "").strip()
                        if not address and item.get("title"):
                            address = item["title"]

                        # Parse lot size from acres
                        lot_size = None
                        if item.get("acres"):
                            lot_size = f"{item['acres']} acres"

                        results.append({
                            "address": address,
                            "city": city,
                            "state": "MN",
                            "propertyType": prop_type,
                            "askPrice": price or 0,
                            "pricePerSF": round(price / sf, 2) if price and sf else None,
                            "squareFeet": sf,
                            "capRate": cap_rate,
                            "units": units,
                            "lotSize": lot_size,
                            "source": "crexi",
                            "sourceUrl": item.get("sourceUrl", ""),
                            "description": item.get("title", ""),
                        })
                        city_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to parse Crexi listing: {e}")

                logger.info(f"Crexi {city}: {city_count} listings")
            except PlaywrightTimeout:
                logger.error(f"Crexi timed out for {city}")
            except Exception as e:
                logger.error(f"Crexi scrape failed for {city}: {e}")

        browser.close()

    return results
