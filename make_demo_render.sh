#!/bin/bash
# Full per-airline render: cards -> padded scenes -> concat -> audio mix -> subtitles.
# Usage: ./make_demo_render.sh <airline> <barColorHex e.g. 0x001F5C>
set -e
AIRLINE=$1
BAR=$2
cd "$(dirname "$0")/video_assets"
RAW=raw/$AIRLINE
P=proc/$AIRLINE
AUD=audio/$AIRLINE
mkdir -p $P
FPS=30
W=1080; H=2268; PADH=2568

echo "=== [$AIRLINE] 1/6 Rendering branded cards to webm ==="
render_card () {
  local html=$1 out=$2 secs=$3
  python3 - "$html" "$out" "$secs" <<'PYEOF'
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
html, outname, secs = sys.argv[1], sys.argv[2], int(sys.argv[3])
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--force-color-profile=srgb"])
    ctx = b.new_context(viewport={"width":540,"height":1284},
        record_video_dir="proc", record_video_size={"width":540,"height":1284},
        device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto("file://" + str(Path(html).resolve()))
    pg.wait_for_timeout(secs*1000)
    vp = pg.video.path()
    ctx.close(); b.close()
    Path(vp).rename(outname)
    print("recorded", outname)
PYEOF
}
render_card intro_$AIRLINE.html proc/${AIRLINE}_intro_raw.webm 5
render_card benefits_$AIRLINE.html proc/${AIRLINE}_benefits_raw.webm 8
render_card outro_$AIRLINE.html proc/${AIRLINE}_outro_raw.webm 7
# normalize cards to 1080x2568 mp4 at fixed durations
ffmpeg -y -i proc/${AIRLINE}_intro_raw.webm    -t 4.5 -vf "fps=$FPS,scale=$W:$PADH" -c:v libx264 -pix_fmt yuv420p $P/introp.mp4 2>/dev/null
ffmpeg -y -i proc/${AIRLINE}_benefits_raw.webm -t 8   -vf "fps=$FPS,scale=$W:$PADH" -c:v libx264 -pix_fmt yuv420p $P/benefitsp.mp4 2>/dev/null
ffmpeg -y -i proc/${AIRLINE}_outro_raw.webm    -t 6.5 -vf "fps=$FPS,scale=$W:$PADH" -c:v libx264 -pix_fmt yuv420p $P/outrop.mp4 2>/dev/null
echo "  cards done"

echo "=== [$AIRLINE] 2/6 Speed-ramp + pad scenes ==="
# process_scene: compress typing/search head, keep answer/card tail readable
process_scene () {
  local src=$1 out=$2 headEnd=$3 tailEnd=$4 headTarget=$5 tailTarget=$6
  local headPts tailPts
  headPts=$(echo "scale=4; $headTarget/$headEnd" | bc)
  tailPts=$(echo "scale=4; $tailTarget/($tailEnd-$headEnd)" | bc)
  ffmpeg -y -i $RAW/$src \
    -filter_complex "
      [0:v]trim=0:$headEnd,setpts=${headPts}*(PTS-STARTPTS),fps=$FPS,scale=$W:$H[h];
      [0:v]trim=$headEnd:$tailEnd,setpts=${tailPts}*(PTS-STARTPTS),fps=$FPS,scale=$W:$H[t];
      [h][t]concat=n=2:v=1[v]
    " -map "[v]" -an -c:v libx264 -pix_fmt yuv420p -r $FPS $P/$out 2>/dev/null
  # pad to caption bar
  ffmpeg -y -i $P/$out -vf "pad=$W:$PADH:0:0:color=$BAR" -c:v libx264 -pix_fmt yuv420p -r $FPS $P/${out%.mp4}_pad.mp4 2>/dev/null
  echo "  ${out%.mp4}: $(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 $P/${out%.mp4}_pad.mp4)s"
}
# timings tuned to scene content: scene1 info(~12s), scene2 payment/escalation(~14s), scene3 escalation(~13s)
process_scene scene1.webm scene1p.mp4 13 24.0 5 7
process_scene scene2.webm scene2p.mp4 16 23.5 7 7
process_scene scene3.webm scene3p.mp4 19 28.5 7 6

echo "=== [$AIRLINE] 3/6 Concat video (silent) ==="
cat > /tmp/concat_$AIRLINE.txt << EOF
file '$(pwd)/$P/introp.mp4'
file '$(pwd)/$P/scene1p_pad.mp4'
file '$(pwd)/$P/scene2p_pad.mp4'
file '$(pwd)/$P/scene3p_pad.mp4'
file '$(pwd)/$P/benefitsp.mp4'
file '$(pwd)/$P/outrop.mp4'
EOF
ffmpeg -y -f concat -safe 0 -i /tmp/concat_$AIRLINE.txt -c:v libx264 -pix_fmt yuv420p -r $FPS $P/video_silent.mp4 2>/dev/null
TOTAL=$(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 $P/video_silent.mp4)
echo "  total video: ${TOTAL}s"

echo "=== [$AIRLINE] 4/6 PCM -> WAV ==="
for v in vo0 vo1 vo3 vo4 vo5 vo6; do
  ffmpeg -y -f s16le -ar 24000 -ac 1 -i $AUD/$v.pcm $AUD/$v.wav 2>/dev/null
done

echo "=== [$AIRLINE] 5/6 Build VO track + music mix ==="
# VO timing (ms): vo0@intro, vo1@scene1, vo3@scene2, vo4@scene3, vo5@benefits, vo6@outro
ffmpeg -y \
  -i $AUD/vo0.wav -i $AUD/vo1.wav -i $AUD/vo3.wav -i $AUD/vo4.wav -i $AUD/vo5.wav -i $AUD/vo6.wav \
  -filter_complex "
    [0:a]adelay=200|200,volume=1.6[a0];
    [1:a]adelay=8500|8500,volume=1.6[a1];
    [2:a]adelay=18000|18000,volume=1.6[a2];
    [3:a]adelay=32000|32000,volume=1.6[a3];
    [4:a]adelay=43500|43500,volume=1.6[a4];
    [5:a]adelay=53000|53000,volume=1.6[a5];
    [a0][a1][a2][a3][a4][a5]amix=inputs=6:duration=longest:normalize=0,apad=whole_dur=58[vo]
  " -map "[vo]" -ar 44100 -ac 2 $AUD/vo_track.wav 2>/dev/null
ffmpeg -y -stream_loop 2 -i audio/music.mp3 -i $AUD/vo_track.wav \
  -filter_complex "
    [0:a]atrim=0:58,volume=0.15,afade=t=in:st=0:d=1.5,afade=t=out:st=55:d=3,aresample=44100[m];
    [1:a]aresample=44100[v];
    [m][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]
  " -map "[out]" -ar 44100 -ac 2 $AUD/final_mix.wav 2>/dev/null
echo "  audio mixed: $(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 $AUD/final_mix.wav)s"

echo "=== [$AIRLINE] 6/6 Burn subtitles + attach audio ==="
OUT="../${AIRLINE}_AI_Demo.mp4"
ffmpeg -y -i $P/video_silent.mp4 -i $AUD/final_mix.wav \
  -filter_complex "[0:v]ass=subs_$AIRLINE.ass[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 21 -movflags +faststart \
  -c:a aac -b:a 192k -shortest \
  "$OUT" 2>&1 | tail -1
echo "  DONE: $OUT  ($(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "$OUT")s)"
