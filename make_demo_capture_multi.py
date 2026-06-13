"""
Parameterized capture: drive any airline's app through 3 genuine customer
scenarios and record one webm per scene into video_assets/raw/<airline>/.

Usage: python make_demo_capture_multi.py <airline> <port>
"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

VW, VH = 440, 924  # phone-ish portrait

# Per-airline genuine scenarios. Scene 2 is always the payment add-on (click_pay).
# Each: (prompt, wait_seconds)
SCENARIOS = {
    "starair": [
        ("hey is my star air checked bag limit enough? carrying a lot this trip", 16),
        ("can you add a veg meal to my flight? happy to pay", 24),  # meal ₹2000 -> payment
        ("my flight is delayed like 5 hrs and i'll miss my connection 😡 this is urgent", 20),
    ],
    "spicejet": [
        ("yo how do i do web check-in for my spicejet flight?", 16),
        ("add spicemax to my booking please, want the priority stuff", 24),  # SpiceMax ₹950 -> payment
        ("cancelled my flight 8 days back and STILL no refund wth", 20),
    ],
    "allianceair": [
        ("whats my baggage allowance on alliance air? got 2 bags", 16),
        ("my flight to shimla got cancelled and nobody rebooked me 😞 what now", 22),
        ("also i never got the wheelchair assistance i booked, my mother needed it", 20),
    ],
}


def type_human(page, text):
    box = page.locator("textarea").first
    box.click()
    for ch in text:
        box.type(ch, delay=34)
    page.wait_for_timeout(400)
    box.press("Enter")


def run_scene(airline, url, idx, prompt, wait_s, click_pay, outdir):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--force-color-profile=srgb"])
        ctx = browser.new_context(
            viewport={"width": VW, "height": VH},
            record_video_dir=str(outdir),
            record_video_size={"width": VW, "height": VH},
            device_scale_factor=2,
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2200)

        type_human(page, prompt)

        if click_pay:
            try:
                pay = page.locator("button:has-text('Pay ₹')").first
                pay.wait_for(timeout=14000)
                page.wait_for_timeout(900)
                pay.click()
                page.wait_for_timeout(1200)
                ok = page.locator("button:has-text('OK, Proceed')").first
                ok.wait_for(timeout=5000)
                ok.click()
                page.wait_for_timeout(6000)
            except Exception as e:
                print(f"  [scene {idx}] pay-flow note: {e}")
                page.wait_for_timeout(wait_s * 1000)
        else:
            page.wait_for_timeout(wait_s * 1000)

        page.wait_for_timeout(1500)
        video_path = page.video.path()
        ctx.close()
        browser.close()
        final = outdir / f"scene{idx}.webm"
        Path(video_path).rename(final)
        print(f"  [scene {idx}] saved {final}")


if __name__ == "__main__":
    airline = sys.argv[1]
    port = sys.argv[2]
    url = f"http://localhost:{port}"
    scenes = SCENARIOS[airline]
    outdir = Path(__file__).parent / "video_assets" / "raw" / airline
    outdir.mkdir(parents=True, exist_ok=True)
    # pay scene index differs: starair/spicejet -> 2, allianceair -> none (no documented add-on)
    pay_idx = 2 if airline in ("starair", "spicejet") else None
    for i, (prompt, wait_s) in enumerate(scenes, 1):
        print(f"[{airline}] Recording scene {i}: {prompt[:42]}...")
        run_scene(airline, url, i, prompt, wait_s, click_pay=(i == pay_idx), outdir=outdir)
        time.sleep(1)
    print(f"[{airline}] All scenes captured.")
