"""Generate investment memos for CRE properties."""
import os
import logging
import requests

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def generate_memo(prop: dict) -> str:
    """Generate a structured investment memo for a property."""
    if not ANTHROPIC_API_KEY:
        return _generate_basic_memo(prop)

    try:
        prompt = _build_prompt(prop)
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]
    except Exception as e:
        logger.warning(f"AI memo generation failed: {e}, falling back to basic")
        return _generate_basic_memo(prop)


def _build_prompt(prop: dict) -> str:
    comps_text = ""
    if prop.get("comps"):
        comps_text = "\n\nComparable Properties:\n"
        for c in prop["comps"]:
            comps_text += f"- {c['address']}: ${c['price']:,} ({c['type']}) {c.get('date', '')} {c.get('distance', '')}\n"

    assessed_text = ""
    if prop.get("assessedValue"):
        ratio = prop["askPrice"] / prop["assessedValue"] if prop["askPrice"] else 0
        assessed_text = f"\nAssessed Value: ${prop['assessedValue']:,} (asking {ratio:.0%} of assessed)"

    psf_str = f"${prop.get('pricePerSF', 0):.0f}/SF" if prop.get("pricePerSF") else "N/A"

    return f"""Write a concise investment memo for this commercial real estate opportunity. Be specific and data-driven. Explain why this is or isn't a good investment. Include your thesis, the key numbers, comp analysis, and risks.

Property: {prop.get('address', 'Unknown')}
City: {prop.get('city', '')}, {prop.get('state', 'MN')}
Type: {prop.get('propertyType', 'Unknown')}
Ask Price: ${prop.get('askPrice', 0):,}
Price/SF: {psf_str}
Square Feet: {prop.get('squareFeet', 'N/A')}
Cap Rate: {prop.get('capRate', 'N/A')}%
Year Built: {prop.get('yearBuilt', 'N/A')}
Days on Market: {prop.get('daysOnMarket', 'N/A')}
Source: {prop.get('source', '')}
Score: {prop.get('score', 'N/A')}/100
Score Justification: {prop.get('scoreJustification', '')}
{assessed_text}
{comps_text}

Format the memo with these sections:
## Investment Thesis
## Key Metrics
## Comp Analysis
## Risks
## Recommendation"""


def _generate_basic_memo(prop: dict) -> str:
    """Fallback memo when AI is unavailable."""
    lines = []
    lines.append("## Investment Thesis")
    lines.append(
        f"{prop.get('address', 'Unknown')} — {prop.get('propertyType', 'unknown').replace('_', ' ').title()}"
    )
    lines.append("")

    if prop.get("scoreJustification"):
        lines.append(prop["scoreJustification"])
        lines.append("")

    lines.append("## Key Metrics")
    lines.append(f"- Ask Price: ${prop.get('askPrice', 0):,}")
    if prop.get("pricePerSF"):
        lines.append(f"- Price/SF: ${prop['pricePerSF']:.0f}")
    if prop.get("squareFeet"):
        lines.append(f"- Square Feet: {prop['squareFeet']:,}")
    if prop.get("capRate"):
        lines.append(f"- Cap Rate: {prop['capRate']}%")
    if prop.get("assessedValue"):
        ratio = prop["askPrice"] / prop["assessedValue"] if prop["askPrice"] else 0
        lines.append(f"- Assessed Value: ${prop['assessedValue']:,} ({ratio:.0%} of assessed)")
    if prop.get("daysOnMarket"):
        lines.append(f"- Days on Market: {prop['daysOnMarket']}")
    lines.append("")

    if prop.get("comps"):
        lines.append("## Comp Analysis")
        for c in prop["comps"]:
            psf = f" (${c['pricePerSF']:.0f}/SF)" if c.get("pricePerSF") else ""
            lines.append(
                f"- {c['address']}: ${c['price']:,}{psf} [{c['type']}] {c.get('date', '')} — {c.get('source', '')}"
            )
        lines.append("")

    lines.append("## Risks")
    if prop.get("riskFlags"):
        for flag in prop["riskFlags"]:
            lines.append(f"- {flag}")
    else:
        lines.append("- Standard market risk; further due diligence recommended")

    return "\n".join(lines)
