"""Score CRE properties on investment return potential (0-100)."""
import logging

logger = logging.getLogger(__name__)


def score_property(prop: dict) -> tuple[int, str]:
    """
    Score a property 0-100 based on investment return potential.
    Returns (score, justification).
    Each property is evaluated individually.
    """
    score = 50  # baseline
    reasons = []

    # Price vs assessed value (up to +20 or -10)
    if prop.get("assessedValue") and prop.get("askPrice"):
        ratio = prop["askPrice"] / prop["assessedValue"]
        if ratio < 0.7:
            score += 20
            reasons.append(f"Asking {ratio:.0%} of assessed value — significant discount")
        elif ratio < 0.85:
            score += 12
            reasons.append(f"Asking {ratio:.0%} of assessed value — below market")
        elif ratio < 1.0:
            score += 5
            reasons.append(f"Asking {ratio:.0%} of assessed value — slight discount")
        elif ratio > 1.3:
            score -= 10
            reasons.append(f"Asking {ratio:.0%} of assessed value — premium pricing")

    # Cap rate (up to +15)
    cap = prop.get("capRate")
    if cap:
        if cap >= 10:
            score += 15
            reasons.append(f"{cap}% cap rate — excellent yield")
        elif cap >= 8:
            score += 10
            reasons.append(f"{cap}% cap rate — strong yield")
        elif cap >= 6:
            score += 5
            reasons.append(f"{cap}% cap rate — decent yield")
        elif cap < 4:
            score -= 5
            reasons.append(f"{cap}% cap rate — low yield")

    # Price per SF vs typical market (up to +10)
    psf = prop.get("pricePerSF")
    if psf:
        ptype = prop.get("propertyType", "")
        market_avg = {
            "office": 150,
            "retail": 130,
            "industrial": 90,
            "multifamily": 120,
            "mixed_use": 140,
            "land": 30,
            "special_purpose": 100,
        }
        avg = market_avg.get(ptype, 120)
        if psf < avg * 0.6:
            score += 10
            reasons.append(f"${psf:.0f}/SF — well below market avg ~${avg}/SF")
        elif psf < avg * 0.8:
            score += 5
            reasons.append(f"${psf:.0f}/SF — below market avg ~${avg}/SF")

    # Days on market — longer = potential motivation (up to +10)
    dom = prop.get("daysOnMarket")
    if dom:
        if dom > 180:
            score += 10
            reasons.append(f"{dom} days on market — seller likely motivated")
        elif dom > 90:
            score += 5
            reasons.append(f"{dom} days on market — sitting a while")

    # Distress indicators (up to +15)
    source = prop.get("source", "")
    if source in ("hennepin_sheriff", "ramsey_sheriff"):
        score += 15
        reasons.append("Sheriff sale — distressed asset, potential deep discount")
    elif source in ("hennepin_tax", "ramsey_tax"):
        score += 12
        reasons.append("Tax forfeiture — distressed asset")
    elif source == "court_filing":
        score += 10
        reasons.append("Court filing (receivership/bankruptcy) — distressed")

    # Price point sweet spot (up to +5)
    price = prop.get("askPrice", 0)
    if 500_000 <= price <= 2_000_000:
        score += 5
        reasons.append("Price in sweet spot ($500K-$2M) — less institutional competition")

    # Risk flag penalties
    risk_flags = prop.get("riskFlags", [])
    if "CONTAMINATION_RISK" in risk_flags:
        score -= 30
        reasons.append("Environmental contamination risk — major concern")
    if "FLOOD_ZONE" in risk_flags:
        score -= 25
        reasons.append("Located in flood zone — insurance/risk concern")

    score = max(0, min(100, score))
    justification = "; ".join(reasons) if reasons else "Baseline score — limited data available"

    return score, justification
