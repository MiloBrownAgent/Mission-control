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
## Why This Is An Opportunity — Lead with the specific reason this property stands out. What market inefficiency, pricing dislocation, or catalyst makes this worth attention RIGHT NOW? Be concrete: is it underpriced vs. assessed value? A distressed seller? Below-market $/SF for the submarket? Zoning upside? Don't be generic — explain the specific edge.
## Key Metrics — markdown table with all available metrics
## Risk Analysis — specific risks based on the data (not generic boilerplate)
## Recommendation — clear BUY/INVESTIGATE/MONITOR/PASS signal with 1-2 sentence reasoning

Guidelines:
- Score {score}/100 context: 75+ = strong, 60-74 = worth investigating, 45-59 = monitor, <45 = pass
- If it's a distressed asset (sheriff sale, tax forfeiture, court filing), explain the discount mechanism and what due diligence is needed
- If assessed value is available, analyze the ask-to-assessed ratio as a value signal
- Compare $/SF to typical submarket rates when possible
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

    # ── Why This Is An Opportunity ──
    lines.append("## Why This Is An Opportunity")
    lines.append("")

    source = prop.get("source", "")
    price_per_sf = prop.get("pricePerSF")
    assessed = prop.get("assessedValue")
    cap_rate = prop.get("capRate")
    days_on = prop.get("daysOnMarket")

    # Build specific opportunity reasons
    opp_reasons = []

    if assessed and price and assessed > 0:
        ratio = price / assessed
        if ratio < 0.7:
            opp_reasons.append(
                f"Priced at just {ratio:.0%} of county assessed value (${assessed:,}) — "
                f"a significant discount that suggests motivated seller or market dislocation"
            )
        elif ratio < 0.9:
            opp_reasons.append(
                f"Listed below county assessed value ({ratio:.0%} of ${assessed:,}) — "
                f"potential value buy if condition supports it"
            )

    if source in ("hennepin_sheriff", "ramsey_sheriff"):
        opp_reasons.append(
            "Sheriff sale property — forced liquidation typically means "
            "deep discount to market. Requires due diligence on liens, title, and condition"
        )
    elif source in ("hennepin_tax", "ramsey_tax"):
        opp_reasons.append(
            "Tax-forfeited property — government-seized and sold below market. "
            "Clear title typically guaranteed, but inspect thoroughly"
        )
    elif source == "court_filing":
        opp_reasons.append(
            "Court-ordered sale (receivership/bankruptcy) — motivated seller "
            "with court oversight creates potential for deep discount"
        )

    if cap_rate and cap_rate > 8:
        opp_reasons.append(
            f"Cap rate of {cap_rate}% is well above market average — "
            f"strong cash flow if tenancy is stable"
        )

    if days_on and days_on > 120:
        opp_reasons.append(
            f"Sitting on market {days_on} days — potential negotiating leverage "
            f"on price with a motivated seller"
        )

    if price_per_sf and price_per_sf < 80:
        opp_reasons.append(
            f"At ${price_per_sf:.0f}/SF, this is priced below typical MSP "
            f"commercial rates — possible value play"
        )

    if score >= 75:
        lines.append(
            f"**Strong opportunity** (score {score}/100). "
            f"This property stands out in the Minneapolis/St. Paul market for specific reasons:"
        )
    elif score >= 60:
        lines.append(
            f"**Worth investigating** (score {score}/100). "
            f"Several indicators make this worth a closer look:"
        )
    else:
        lines.append(
            f"**Monitor** (score {score}/100). "
            f"Limited standout factors at current pricing, but worth tracking:"
        )

    lines.append("")

    if opp_reasons:
        for reason in opp_reasons:
            lines.append(f"- {reason}")
    elif justification:
        for reason in justification.split("; "):
            lines.append(f"- {reason}")
    else:
        lines.append(f"- Scoring driven by property type, location, and market positioning")

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
