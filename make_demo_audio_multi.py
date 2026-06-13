"""
Generate per-airline voiceover (gpt-audio via OpenRouter) from airlines_video.json.
Saves PCM into video_assets/audio/<airline>/.

Usage: python make_demo_audio_multi.py <airline>
"""
import sys, json, base64, urllib.request, re
from pathlib import Path

ROOT = Path(__file__).parent
airline = sys.argv[1]
CFG = json.loads((ROOT / "video_assets" / "airlines_video.json").read_text())
LINES = CFG[airline]["vo"]

AUD = ROOT / "video_assets" / "audio" / airline
AUD.mkdir(parents=True, exist_ok=True)

def get_key():
    for line in open(ROOT / "backend" / ".env"):
        m = re.match(r'\s*OPENROUTER_API_KEY\s*=\s*(.+)', line)
        if m:
            return m.group(1).strip().strip('"').strip("'")
    raise SystemExit("no key")

KEY = get_key()
URL = "https://openrouter.ai/api/v1/chat/completions"

def tts(text, voice="alloy"):
    body = json.dumps({
        "model": "openai/gpt-audio",
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "pcm16"},
        "stream": True,
        "messages": [{
            "role": "user",
            "content": f"Read this as an upbeat, confident product-demo voiceover. "
                       f"Natural pace, friendly energy. Say ONLY these exact words, nothing else: {text}"
        }],
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    b64 = ""
    with urllib.request.urlopen(req, timeout=120) as r:
        for raw in r:
            line = raw.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            p = line[5:].strip()
            if p == "[DONE]":
                break
            try:
                d = json.loads(p)
            except:
                continue
            au = d.get("choices", [{}])[0].get("delta", {}).get("audio")
            if au and au.get("data"):
                b64 += au["data"]
    return base64.b64decode(b64) if b64 else b""

for name, text in LINES.items():
    print(f"[{airline}] TTS {name}...")
    raw = tts(text)
    if raw:
        (AUD / f"{name}.pcm").write_bytes(raw)
        print(f"  {name}: {len(raw)} bytes")
    else:
        print(f"  {name}: FAILED")
print(f"[{airline}] voiceover done")
