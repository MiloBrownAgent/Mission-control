"""Crexi scraper for Minneapolis/St. Paul CRE listings."""
import re
import logging

logger = logging.getLogger(__name__)

# Re-use parse helpers from loopnet
from .loopnet import parse_price, parse_sf, parse_cap_rate, parse_int, normalize_type


def scrape(cities: list[str], max_price: int) -> list[dict]:
    """Scrape Crexi for commercial property listings."""
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
            # Crexi search with state + city filters
            url = (
                f"https://www.crexi.com/properties?state=MN"
                f"&cities={city.replace(' ', '%20')}&transactionTypes=For%20Sale"
                f"&maxPrice={max_price}"
            )

            logger.info(f"Scraping Crexi for {city}...")
            page = fetcher.get(url)

            # Crexi property card selectors (may vary with their SPA)
            listings = (
                page.css("[data-qa='property-card']")
                or page.css(".property-card")
                or page.css("[class*='PropertyCard']")
                or page.css("article[class*='property']")
            )

            if not listings:
                logger.warning(f"Crexi: no listing elements found for {city}. Page may require JS.")
                continue

            city_count = 0
            for listing in listings:
                try:
                    address_el = listing.css_first(
                        "[data-qa='property-address'], .property-address, [class*='address']"
                    )
                    price_el = listing.css_first(
                        "[data-qa='listing-price'], .price, [class*='price']"
                    )
                    type_el = listing.css_first(
                        "[data-qa='property-type'], .property-type, [class*='type']"
                    )
                    sf_el = listing.css_first(
                        "[data-qa='square-feet'], .square-feet, [class*='sqft']"
                    )
                    cap_el = listing.css_first(
                        "[data-qa='cap-rate'], .cap-rate, [class*='capRate']"
                    )
                    link_el = listing.css_first("a[href*='/properties/']")

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

                    source_url = ""
                    if link_el:
                        href = link_el.attrib.get("href", "")
                        source_url = (
                            f"https://www.crexi.com{href}"
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
                            "source": "crexi",
                            "sourceUrl": source_url,
                            "description": "",
                        }
                    )
                    city_count += 1
                except Exception as e:
                    logger.warning(f"Failed to parse Crexi listing: {e}")
                    continue

            logger.info(f"Crexi {city}: {city_count} listings")
        except Exception as e:
            logger.error(f"Crexi scrape failed for {city}: {e}")

    return results
