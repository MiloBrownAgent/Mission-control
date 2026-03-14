import os

CITIES = ["Minneapolis", "St. Paul"]
STATE = "MN"
MAX_PRICE = 5_000_000
EXCLUDE_FLAGS = ["CONTAMINATION_RISK", "FLOOD_ZONE"]

CONVEX_URL = os.environ.get("CONVEX_URL", "https://proper-rat-443.convex.site")
CONVEX_CRE_TOKEN = os.environ.get("CONVEX_CRE_TOKEN", "cre-ingest-token")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "logs")
