"""Generate investment memos for CRE properties using Claude AI with template fallback."""
import logging
import json

logger = logging.getLogger(__name__)

# Lazy-loaded Anthropic client
_client = None


def _get_client():
    """Get or create Anthropic client."""
    global _client
    if _client is None:
        from config import ANTHROPIC_API_KEY
        if not ANTHROPIC_API_KEY:
            return None
        try:
            import anthropic
            _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        except ImportError:
            logger.warning("anthropic package not installed — pip install anthropic")
            return None
        except Exception as e:
            logger.warning(f"Failed to init Anthropic client: {e}")
            return None
    return _client


def generate_memo(prop: dict) -> str:
    """
    Generate an investment memo for a property.
    Tries AI-generated memo first (Claude), falls back to template.
    """
    # Try AI memo first
    try:
        ai_memo = _generate_ai_memo(prop)
        if ai_memo:
            return ai_memo
    except Exception as e:
        logger.warning(f"AI memo generation failed for {prop.get('address', '?')}: {e}")

    # Fallback to template
    return _generate_template_memo(prop)


def _generate_ai_memo(prop: dict) -> str | None:
    """Generate an AI-written investment memo using Claude."""
    client = _get_client()
    if not client:
        return None

    address = prop.get("address", "Unknown")
    city = prop.get("city", "")
    state = prop.get("state", "MN")
    ptype = prop.get("propertyType", "unknown").replace("_", " ").title()
    price = prop.get("askPrice", 0)
    score = prop.get("score", 50)
    justification = prop.get("scoreJustification", "")
    source = prop.get("source", "")

    # Build context for Claude
    metrics = {
        "address": address,
        "city": city,
        "state": state,
        "propertyType": ptype,
        "askPrice": price,
        "score": score,
        "scoreJustification": justification,
        "source": source,
    }

    # Add optional metrics
    for field in [
        "pricePerSF", "squareFeet", "capRate", "units", "yearBuilt",
        "daysOnMarket", "lotSize", "assessedValue", "assessedValueSource",
        "sourceUrl", "description", "flags", "riskFlags", "comps",
    ]:
        if prop.get(field) is not None:
            metrics[field] = prop[field]

    # Map source to readable name
    source_names = {
        "loopnet": "LoopNet",
        "crexi": "Crexi",
        "hennepin_sheriff": "Hennepin County Foreclosure Sale",
        "ramsey_sheriff": "Ramsey County Sheriff Sale",
        "hennepin_tax": "Hennepin County Tax Forfeited Land",
        "ramsey_tax": "Ramsey County Tax Forfeited Land",
        "court_filing": "MN Courts (Receivership/Bankruptcy)",
    }
    source_name = source_names.get(source, source)

    prompt = f"""Write a concise investment memo for this commercial real estate property in the Minneapolis/St. Paul market. Be direct and analytical — this is for an experienced investor.

Property data:
```json
{json.dumps(metrics, indent=2, default=str)}
```

Source: {source_name}

Write the memo with these sections (use markdown headings):
## Investment Thesis — 2-3 sentences on why this property is or isn't worth pursuing
## Key Metrics — markdown table with all available metrics
## Risk Analysis — specific risks based on the data (not generic boilerplate)
## Recommendation — clear BUY/INVESTIGATE/MONITOR/PASS signal with reasoning

Guidelines:
- Score {score}/100 context: 75+ = strong, 60-74 = worth investigating, 45-59 = monitor, <45 = pass
- If it's a distressed asset (sheriff sale, tax forfeiture, court filing), highlight the opportunity and extra due diligence needed
- If assessed value is available, analyze the ask-to-assessed ratio
- Keep it under 400 words
- End with source attribution"""

    try:
        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        content = message.content[0].text.strip()
        if content and len(content) > 100:
            # Append source link if available
            if prop.get("sourceUrl"):
                content += f"\n\n---\n*Source: {source_name}*\n*[View listing]({prop['sourceUrl']})*"
            return content
    except Exception as e:
        logger.warning(f"Claude API call failed: {e}")

    return None


def _generate_template_memo(prop: dict) -> str:
    """Generate a structured investment memo (template fallback)."""
    lines = []
    address = prop.get("address", "Unknown")
    ptype = prop.get("propertyType", "unknown").replace("_", " ").title()
    price = prop.get("askPrice", 0)
    score = prop.get("score", 50)
    justification = prop.get("scoreJustification", "")

    # ── Investment Thesis ──
    lines.append("## Investment Thesis")
    lines.append("")

    if score >= 75:
        lines.append(
            f"**Strong opportunity.** {address} scores {score}/100 — "
            f"this property stands out in the current Minneapolis/St. Paul market."
        )
    elif score >= 60:
        lines.append(
            f"**Worth investigating.** {address} scores {score}/100 — "
            f"several favorable indicators make this worth a closer look."
        )
    else:
        lines.append(
            f"**Market-rate opportunity.** {address} scores {score}/100 — "
            f"fairly priced but limited upside signals at current ask."
        )

    lines.append("")
    if justification:
        for reason in justification.split("; "):
            lines.append(f"- {reason}")
        lines.append("")

    source = prop.get("source", "")
    if source in ("hennepin_sheriff", "ramsey_sheriff"):
        lines.append(
            "**Distressed Asset:** Sheriff sale property. Expect significant "
            "discount to market value. Due diligence on liens, title, and "
            "property condition is critical."
        )
        lines.append("")
    elif source in ("hennepin_tax", "ramsey_tax"):
        lines.append(
            "**Tax Forfeiture:** Government-seized property available at "
            "below-market pricing. Clear title typically guaranteed. "
            "Inspect thoroughly before bidding."
        )
        lines.append("")
    elif source == "court_filing":
        lines.append(
            "**Court-Ordered Sale:** Receivership or bankruptcy disposition. "
            "Motivated seller with court oversight. Potential for deep discount "
            "but timeline may be uncertain."
        )
        lines.append("")

    # ── Key Metrics ──
    lines.append("## Key Metrics")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|--------|-------|")
    lines.append(f"| Ask Price | ${price:,} |")

    if prop.get("pricePerSF"):
        lines.append(f"| Price/SF | ${prop['pricePerSF']:.0f} |")
    if prop.get("squareFeet"):
        lines.append(f"| Square Feet | {prop['squareFeet']:,} |")
    if prop.get("units"):
        ppu = price / prop["units"] if price and prop["units"] else 0
        lines.append(f"| Units | {prop['units']} |")
        if ppu:
            lines.append(f"| Price/Unit | ${ppu:,.0f} |")
    if prop.get("capRate"):
        lines.append(f"| Cap Rate | {prop['capRate']}% |")
    if prop.get("yearBuilt"):
        lines.append(f"| Year Built | {prop['yearBuilt']} |")
    if prop.get("daysOnMarket"):
        lines.append(f"| Days on Market | {prop['daysOnMarket']} |")
    if prop.get("lotSize"):
        lines.append(f"| Lot Size | {prop['lotSize']} |")

    lines.append(f"| Type | {ptype} |")
    lines.append(f"| Score | {score}/100 |")
    lines.append("")

    # ── Assessed Value Analysis ──
    if prop.get("assessedValue"):
        av = prop["assessedValue"]
        ratio = price / av if price and av else 0
        lines.append("## Assessed Value Analysis")
        lines.append("")
        lines.append("| | Value |")
        lines.append("|--|-------|")
        lines.append(f"| County Assessed Value | ${av:,} |")
        lines.append(f"| Ask Price | ${price:,} |")
        lines.append(f"| Ask/Assessed Ratio | {ratio:.0%} |")
        lines.append("")

        if ratio < 0.7:
            lines.append(
                f"📉 **Significant discount** — asking just {ratio:.0%} of assessed "
                f"value. Could indicate motivated seller, deferred maintenance, "
                f"or market dislocation."
            )
        elif ratio < 0.9:
            lines.append(
                f"📊 **Below assessed** — asking {ratio:.0%} of assessed value. "
                f"Reasonable discount worth exploring."
            )
        elif ratio < 1.1:
            lines.append(
                f"📊 **At market** — asking {ratio:.0%} of assessed value. "
                f"Fairly priced relative to county assessment."
            )
        else:
            lines.append(
                f"📈 **Premium pricing** — asking {ratio:.0%} of assessed value. "
                f"Seller pricing above government assessment."
            )
        lines.append("")

    # ── Risk Factors ──
    lines.append("## Risks")
    lines.append("")
    risk_flags = prop.get("riskFlags", [])
    if risk_flags:
        for flag in risk_flags:
            if flag == "CONTAMINATION_RISK":
                lines.append(
                    "- ⚠️ **Environmental contamination risk** — Phase I ESA "
                    "recommended before proceeding"
                )
            elif flag == "FLOOD_ZONE":
                lines.append(
                    "- ⚠️ **Flood zone** — Higher insurance costs and "
                    "potential lending restrictions"
                )
            else:
                lines.append(f"- ⚠️ {flag}")
    else:
        lines.append(
            "- Standard market risk — no specific red flags identified"
        )
        lines.append(
            "- Recommend standard due diligence: title search, property "
            "inspection, environmental review"
        )

    if prop.get("daysOnMarket") and prop["daysOnMarket"] > 180:
        lines.append(
            f"- ⏳ Extended time on market ({prop['daysOnMarket']} days) — "
            f"investigate why. Could be pricing, condition, or market issue"
        )

    lines.append("")

    # ── Recommendation ──
    lines.append("## Recommendation")
    lines.append("")
    if score >= 75:
        lines.append(
            "**STRONG BUY signal.** Multiple favorable indicators align. "
            "Schedule a showing and request financials immediately."
        )
    elif score >= 60:
        lines.append(
            "**INVESTIGATE.** Good potential — request offering memorandum, "
            "review financials, and assess condition before making a move."
        )
    elif score >= 45:
        lines.append(
            "**MONITOR.** Fair pricing with limited standout factors. "
            "Watch for price reductions that could improve the thesis."
        )
    else:
        lines.append(
            "**PASS at current pricing.** Below-average score suggests "
            "better opportunities exist in this market right now."
        )

    # Source citation
    lines.append("")
    lines.append("---")
    source_name = {
        "loopnet": "LoopNet",
        "crexi": "Crexi",
        "hennepin_sheriff": "Hennepin County Sheriff",
        "ramsey_sheriff": "Ramsey County Sheriff",
        "hennepin_tax": "Hennepin County",
        "ramsey_tax": "Ramsey County",
        "court_filing": "MN Courts",
    }.get(source, source)
    lines.append(f"*Source: {source_name}*")
    if prop.get("sourceUrl"):
        lines.append(f"*[View listing]({prop['sourceUrl']})*")

    return "\n".join(lines)
