"""Generate investment memos for CRE properties using scoring data."""
import logging

logger = logging.getLogger(__name__)


def generate_memo(prop: dict) -> str:
    """Generate a structured investment memo for a property."""
    lines = []
    address = prop.get("address", "Unknown")
    ptype = prop.get("propertyType", "unknown").replace("_", " ").title()
    price = prop.get("askPrice", 0)
    score = prop.get("score", 50)
    justification = prop.get("scoreJustification", "")

    # ── Investment Thesis ──
    lines.append("## Investment Thesis")
    lines.append("")

    # Build thesis based on score and signals
    if score >= 75:
        lines.append(f"**Strong opportunity.** {address} scores {score}/100 — this property stands out in the current Minneapolis/St. Paul market.")
    elif score >= 60:
        lines.append(f"**Worth investigating.** {address} scores {score}/100 — several favorable indicators make this worth a closer look.")
    else:
        lines.append(f"**Market-rate opportunity.** {address} scores {score}/100 — fairly priced but limited upside signals at current ask.")

    lines.append("")
    if justification:
        for reason in justification.split("; "):
            lines.append(f"- {reason}")
        lines.append("")

    # Source-specific thesis
    source = prop.get("source", "")
    if source in ("hennepin_sheriff", "ramsey_sheriff"):
        lines.append("**Distressed Asset:** This is a sheriff sale property. Expect significant discount to market value. Due diligence on liens, title, and property condition is critical.")
        lines.append("")
    elif source in ("hennepin_tax", "ramsey_tax"):
        lines.append("**Tax Forfeiture:** Government-seized property available at below-market pricing. Clear title typically guaranteed. Inspect thoroughly before bidding.")
        lines.append("")
    elif source == "court_filing":
        lines.append("**Court-Ordered Sale:** Receivership or bankruptcy disposition. Motivated seller with court oversight. Potential for deep discount but timeline may be uncertain.")
        lines.append("")

    # ── Key Metrics ──
    lines.append("## Key Metrics")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
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
        lines.append(f"| | Value |")
        lines.append(f"|--|-------|")
        lines.append(f"| County Assessed Value | ${av:,} |")
        lines.append(f"| Ask Price | ${price:,} |")
        lines.append(f"| Ask/Assessed Ratio | {ratio:.0%} |")
        lines.append("")

        if ratio < 0.7:
            lines.append(f"📉 **Significant discount** — asking just {ratio:.0%} of assessed value. Could indicate motivated seller, deferred maintenance, or market dislocation.")
        elif ratio < 0.9:
            lines.append(f"📊 **Below assessed** — asking {ratio:.0%} of assessed value. Reasonable discount worth exploring.")
        elif ratio < 1.1:
            lines.append(f"📊 **At market** — asking {ratio:.0%} of assessed value. Fairly priced relative to county assessment.")
        else:
            lines.append(f"📈 **Premium pricing** — asking {ratio:.0%} of assessed value. Seller pricing above government assessment.")
        lines.append("")

    # ── Comp Analysis ──
    if prop.get("comps"):
        lines.append("## Comp Analysis")
        lines.append("")
        lines.append("| Address | Type | Price | $/SF | Date | Distance | Source |")
        lines.append("|---------|------|-------|------|------|----------|--------|")
        for c in prop["comps"]:
            psf = f"${c['pricePerSF']:.0f}" if c.get("pricePerSF") else "—"
            src = f"[{c.get('source', '—')}]({c.get('sourceUrl', '')})" if c.get("sourceUrl") else c.get("source", "—")
            lines.append(
                f"| {c.get('address', '—')} | {c.get('type', '—')} | ${c.get('price', 0):,} | {psf} | {c.get('date', '—')} | {c.get('distance', '—')} | {src} |"
            )
        lines.append("")

    # ── Risk Factors ──
    lines.append("## Risks")
    lines.append("")
    risk_flags = prop.get("riskFlags", [])
    if risk_flags:
        for flag in risk_flags:
            if flag == "CONTAMINATION_RISK":
                lines.append("- ⚠️ **Environmental contamination risk** — Phase I ESA recommended before proceeding")
            elif flag == "FLOOD_ZONE":
                lines.append("- ⚠️ **Flood zone** — Higher insurance costs and potential lending restrictions")
            else:
                lines.append(f"- ⚠️ {flag}")
    else:
        lines.append("- Standard market risk — no specific red flags identified")
        lines.append("- Recommend standard due diligence: title search, property inspection, environmental review")

    if prop.get("daysOnMarket") and prop["daysOnMarket"] > 180:
        lines.append(f"- ⏳ Extended time on market ({prop['daysOnMarket']} days) — investigate why. Could be pricing, condition, or market issue")

    lines.append("")

    # ── Recommendation ──
    lines.append("## Recommendation")
    lines.append("")
    if score >= 75:
        lines.append(f"**STRONG BUY signal.** Multiple favorable indicators align. Schedule a showing and request financials immediately.")
    elif score >= 60:
        lines.append(f"**INVESTIGATE.** Good potential — request offering memorandum, review financials, and assess condition before making a move.")
    elif score >= 45:
        lines.append(f"**MONITOR.** Fair pricing with limited standout factors. Watch for price reductions that could improve the thesis.")
    else:
        lines.append(f"**PASS at current pricing.** Below-average score suggests better opportunities exist in this market right now.")

    # Source citation
    lines.append("")
    lines.append("---")
    source_name = {"loopnet": "LoopNet", "crexi": "Crexi", "hennepin_sheriff": "Hennepin County Sheriff", "ramsey_sheriff": "Ramsey County Sheriff", "hennepin_tax": "Hennepin County", "ramsey_tax": "Ramsey County", "court_filing": "MN Courts"}.get(source, source)
    lines.append(f"*Source: {source_name}*")
    if prop.get("sourceUrl"):
        lines.append(f"*[View listing]({prop['sourceUrl']})*")

    return "\n".join(lines)
