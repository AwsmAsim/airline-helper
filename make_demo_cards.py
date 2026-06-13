"""
Generate branded intro / benefits / outro HTML cards for an airline,
based on airlines_video.json. Mirrors the Fly91 card templates but swaps
colours, name, tagline, logo, and URL.

Usage: python make_demo_cards.py <airline>
"""
import sys, json
from pathlib import Path

ROOT = Path(__file__).parent
VA = ROOT / "video_assets"
CFG = json.loads((VA / "airlines_video.json").read_text())

airline = sys.argv[1]
c = CFG[airline]
P, PD, A = c["primary"], c["primaryDark"], c["accent"]
NAME, TAG, URL, LOGO = c["name"], c["tagline"], c["url"], c["logo"]

# split airline name so the last word can be accented, like "Fly91 AI"
intro = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ width:1080px; height:2568px; overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background:linear-gradient(160deg,{PD} 0%,{P} 55%,{PD} 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    color:#fff; position:relative; }}
  .glow {{ position:absolute; width:1300px; height:1300px; border-radius:50%;
    background:radial-gradient(circle, {A}28 0%, transparent 70%); top:-300px; right:-400px; }}
  .glow2 {{ position:absolute; width:1100px; height:1100px; border-radius:50%;
    background:radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%); bottom:-300px; left:-350px; }}
  .kicker {{ font-size:30px; letter-spacing:6px; font-weight:700; color:{A};
    opacity:0; animation:rise .8s .1s forwards; margin-bottom:40px; }}
  h1 {{ font-size:96px; font-weight:800; letter-spacing:-2px; line-height:1.05;
    text-align:center; opacity:0; animation:rise .8s .3s forwards; }}
  h1 .a {{ color:{A}; }}
  p.sub {{ font-size:42px; opacity:0; margin-top:46px; font-weight:400; text-align:center;
    line-height:1.4; animation:rise .8s .55s forwards; max-width:820px; }}
  .sub b {{ font-weight:700; color:#fff; }}
  @keyframes rise {{ from{{opacity:0; transform:translateY(40px)}} to{{opacity:1; transform:translateY(0)}} }}
</style></head><body>
  <div class="glow"></div><div class="glow2"></div>
  <div class="kicker">{NAME.upper()} · CUSTOMER SUPPORT</div>
  <h1>Most support tickets<br>never need<br>a <span class="a">human</span>.</h1>
  <p class="sub">So we built an AI agent that<br>handles them — <b>instantly.</b></p>
</body></html>"""

benefits = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ width:1080px; height:2568px; overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background:linear-gradient(160deg,{PD} 0%,{P} 55%,{PD} 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    color:#fff; position:relative; padding:0 80px; }}
  .glow {{ position:absolute; width:1300px; height:1300px; border-radius:50%;
    background:radial-gradient(circle, {A}24 0%, transparent 70%); bottom:-300px; right:-400px; }}
  h2 {{ font-size:60px; font-weight:800; letter-spacing:-1px; text-align:center;
    margin-bottom:80px; opacity:0; animation:rise .7s .1s forwards; line-height:1.15; }}
  h2 .a {{ color:{A}; }}
  .row {{ display:flex; align-items:center; gap:36px; width:100%; max-width:880px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
    border-radius:32px; padding:42px 48px; margin-bottom:34px; opacity:0; }}
  .row.r1{{ animation:slide .7s .35s forwards; }}
  .row.r2{{ animation:slide .7s .6s forwards; }}
  .row.r3{{ animation:slide .7s .85s forwards; }}
  .stat {{ font-size:78px; font-weight:800; color:{A}; min-width:230px; line-height:1; }}
  .label {{ font-size:40px; font-weight:500; line-height:1.25; opacity:.95; }}
  @keyframes rise {{ from{{opacity:0; transform:translateY(40px)}} to{{opacity:1; transform:translateY(0)}} }}
  @keyframes slide {{ from{{opacity:0; transform:translateX(-40px)}} to{{opacity:1; transform:translateX(0)}} }}
</style></head><body>
  <div class="glow"></div>
  <h2>Less load on your team.<br>More <span class="a">happy</span> flyers.</h2>
  <div class="row r1"><div class="stat">24/7</div><div class="label">Instant answers from real {NAME} policies</div></div>
  <div class="row r2"><div class="stat">~80%</div><div class="label">of routine queries resolved without an agent</div></div>
  <div class="row r3"><div class="stat">Smart</div><div class="label">Escalates only what truly needs a human</div></div>
</body></html>"""

# accent the word "AI" in the airline title
outro = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ width:1080px; height:2568px; overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    background:linear-gradient(160deg,{PD} 0%,{P} 60%,{PD} 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    color:#fff; position:relative; }}
  .glow {{ position:absolute; width:1300px; height:1300px; border-radius:50%;
    background:radial-gradient(circle, {A}30 0%, transparent 70%); top:-300px; right:-400px; }}
  .glow2 {{ position:absolute; width:1150px; height:1150px; border-radius:50%;
    background:radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%); bottom:-300px; left:-350px; }}
  .logo {{ width:260px; height:260px; border-radius:60px; background:#fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 30px 100px rgba(0,0,0,0.25); margin-bottom:70px;
    animation:pop .7s cubic-bezier(.2,.8,.2,1) both; padding:36px; }}
  .logo img {{ max-width:100%; max-height:100%; object-fit:contain; }}
  h1 {{ font-size:86px; font-weight:800; letter-spacing:-1.5px; margin-bottom:26px;
    animation:rise .7s .12s both; text-align:center; }}
  h1 .a {{ color:{A}; }}
  p.sub {{ font-size:42px; opacity:.85; margin-bottom:100px; font-weight:400;
    animation:rise .7s .22s both; text-align:center; line-height:1.4; }}
  .cta {{ background:{A}; color:{PD}; font-weight:800; font-size:50px;
    padding:40px 86px; border-radius:999px; letter-spacing:.4px;
    box-shadow:0 24px 70px {A}59;
    animation:rise .7s .34s both, pulse 2s 1s infinite; }}
  .url {{ margin-top:56px; font-size:46px; font-weight:600; opacity:.95;
    animation:rise .7s .46s both; }}
  .url .dot {{ color:{A}; }}
  .badge {{ margin-top:110px; font-size:30px; opacity:.6; letter-spacing:1.5px;
    animation:rise .7s .58s both; }}
  @keyframes pop {{ from{{opacity:0; transform:scale(.6)}} to{{opacity:1; transform:scale(1)}} }}
  @keyframes rise {{ from{{opacity:0; transform:translateY(40px)}} to{{opacity:1; transform:translateY(0)}} }}
  @keyframes pulse {{ 0%,100%{{transform:scale(1)}} 50%{{transform:scale(1.04)}} }}
</style></head><body>
  <div class="glow"></div><div class="glow2"></div>
  <div class="logo"><img src="{LOGO}" alt="{NAME}"></div>
  <h1>{NAME} <span class="a">AI</span> Support</h1>
  <p class="sub">Real answers. Real actions.<br>Right inside the chat.</p>
  <div class="cta">Try it free →</div>
  <div class="url">{URL.replace('.', '<span class="dot">.</span>')}</div>
  <div class="badge">POWERED BY AI · NO HOLD MUSIC</div>
</body></html>"""

(VA / f"intro_{airline}.html").write_text(intro)
(VA / f"benefits_{airline}.html").write_text(benefits)
(VA / f"outro_{airline}.html").write_text(outro)
print(f"[{airline}] cards generated: intro/benefits/outro")
