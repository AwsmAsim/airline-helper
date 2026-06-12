"""
Scrape SpiceJet flight schedules for the next 30 days (all domestic routes)
and write structured JSONL chunks to spicejet_data/spicejet_schedule_live.jsonl

Each chunk = one route's flights, in a clean format the backend can parse.
"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright

OUT_FILE = Path(__file__).parent / "spicejet_data" / "spicejet_schedule_live.jsonl"
SCHEDULE_URL = "https://corporate.spicejet.com/Schedules.aspx"

# All domestic airports SpiceJet serves (from the dropdown we saw earlier)
AIRPORTS = [
    ("Ahmedabad", "AMD"), ("Bagdogra", "IXB"), ("Bengaluru", "BLR"),
    ("Chennai", "MAA"), ("Darbhanga", "DBR"), ("Delhi", "DEL"),
    ("Dharamshala", "DHM"), ("Goa", "GOI"), ("Gorakhpur", "GOP"),
    ("Guwahati", "GAU"), ("Hyderabad", "HYD"), ("Jaipur", "JAI"),
    ("Jammu", "IXJ"), ("Kandla", "IXY"), ("Kochi", "COK"),
    ("Kolkata", "CCU"), ("Kozhikode", "CCJ"), ("Leh", "IXL"),
    ("Lucknow", "LKO"), ("Mumbai", "BOM"), ("Patna", "PAT"),
    ("Porbandar", "PBD"), ("Port Blair", "IXZ"), ("Pune", "PNQ"),
    ("Shillong", "SHL"), ("Shivamogga", "RQY"), ("Srinagar", "SXR"),
    ("Udaipur", "UDR"), ("Varanasi", "VNS"),
]

CITY_TO_IATA = {name: iata for name, iata in AIRPORTS}

def parse_table(table_text: str) -> list[dict]:
    """Parse tab-separated schedule table rows into flight dicts."""
    flights = []
    lines = table_text.strip().split("\n")
    for line in lines:
        cols = [c.strip() for c in line.split("\t")]
        if len(cols) < 6:
            continue
        if not re.match(r"^SG\s*\d+", cols[0]):
            continue
        flight_no = cols[0]
        origin_name = cols[1]
        dest_name = cols[2]
        departure = cols[3]
        arrival = cols[4]
        frequency = cols[5]
        via = cols[6] if len(cols) > 6 and cols[6] not in ("-", "") else None
        eff_from = cols[7] if len(cols) > 7 else ""
        eff_till = cols[8] if len(cols) > 8 else ""

        origin_iata = CITY_TO_IATA.get(origin_name, origin_name[:3].upper())
        dest_iata = CITY_TO_IATA.get(dest_name, dest_name[:3].upper())

        flights.append({
            "flightNo": flight_no,
            "origin": origin_iata,
            "originName": origin_name,
            "destination": dest_iata,
            "destName": dest_name,
            "departure": departure,
            "arrival": arrival,
            "frequency": frequency,
            "via": via,
            "effectiveFrom": eff_from,
            "effectiveTill": eff_till,
        })
    return flights


async def scrape_schedule():
    today = datetime.now()
    end_date = today + timedelta(days=30)
    print(f"Scraping SpiceJet schedules: {today.strftime('%d %b %Y')} → {end_date.strftime('%d %b %Y')}")

    all_flights: list[dict] = []
    seen_routes: set[str] = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print(f"Loading {SCHEDULE_URL} ...")
        await page.goto(SCHEDULE_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Try to get the full schedule table from the page
        # The page has a large table with all routes
        try:
            # Wait for the schedule table
            await page.wait_for_selector("table", timeout=10000)

            # Extract the entire visible table text
            table_text = await page.evaluate("""() => {
                // Find the main schedule table
                const tables = document.querySelectorAll('table');
                let result = '';
                for (const t of tables) {
                    const rows = t.querySelectorAll('tr');
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td, th');
                        const rowText = Array.from(cells).map(c => c.innerText.trim()).join('\\t');
                        if (rowText.trim()) result += rowText + '\\n';
                    }
                }
                return result;
            }""")

            flights = parse_table(table_text)
            print(f"  Found {len(flights)} flights from main table")
            all_flights.extend(flights)

        except Exception as e:
            print(f"  Table extraction failed: {e}")

        # Also try to get the full page text and parse the tab-delimited data
        full_text = await page.inner_text("body")
        header_idx = full_text.find("Flight No")
        if header_idx != -1:
            schedule_text = full_text[header_idx:]
            flights = parse_table(schedule_text)
            print(f"  Found {len(flights)} flights from body text")
            # Merge, avoiding duplicates
            existing = {(f["flightNo"], f["origin"], f["destination"]) for f in all_flights}
            for f in flights:
                key = (f["flightNo"], f["origin"], f["destination"])
                if key not in existing:
                    all_flights.append(f)
                    existing.add(key)

        await browser.close()

    if not all_flights:
        print("ERROR: No flights scraped!")
        return

    # Group by route and write as JSONL chunks
    routes: dict[str, list[dict]] = {}
    for f in all_flights:
        key = f"{f['origin']}→{f['destination']}"
        if key not in routes:
            routes[key] = []
        routes[key].append(f)

    # Filter to routes active in the next 30 days
    # (keep all since we don't have date-specific filtering from this endpoint)
    print(f"\nTotal routes scraped: {len(routes)}")
    print(f"Total flights scraped: {len(all_flights)}")

    # Write as JSONL — one chunk per route, formatted for the schedule parser
    OUT_FILE.parent.mkdir(exist_ok=True)
    chunks = []
    for route, flights in sorted(routes.items()):
        origin, dest = route.split("→")
        lines = ["Flight No\tOrigin\tDestination\tDeparture\tArrival\tFrequency\tVia\tEffective From\tEffective Till"]
        for f in flights:
            via = f["via"] or "-"
            lines.append(f"{f['flightNo']}\t{f['originName']}\t{f['destName']}\t{f['departure']}\t{f['arrival']}\t{f['frequency']}\t{via}\t{f['effectiveFrom']}\t{f['effectiveTill']}")

        chunk = {
            "id": f"spicejet_schedule_{origin}_{dest}",
            "airline": "spicejet",
            "url": SCHEDULE_URL,
            "title": "SpiceJet Flight Schedules",
            "heading": f"Flights from {flights[0]['originName']} to {flights[0]['destName']} ({origin}→{dest})",
            "text": "\n".join(lines),
        }
        chunks.append(chunk)

    with open(OUT_FILE, "w") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"\nWrote {len(chunks)} route chunks to {OUT_FILE}")

    # Print sample routes
    print("\nSample routes:")
    for route in list(routes.keys())[:10]:
        print(f"  {route}: {len(routes[route])} flights")


if __name__ == "__main__":
    asyncio.run(scrape_schedule())
