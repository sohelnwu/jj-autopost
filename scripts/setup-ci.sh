#!/usr/bin/env bash
# GitHub সার্ভারে দ্রুত প্রস্তুতি: ধীর apt মিরর এড়িয়ে চলা।
#  • Chromium: শুধু headless shell (ক্যাশ থাকে); দরকারি লাইব্রেরি না থাকলেই কেবল apt
#  • ffmpeg: GitHub থেকে তৈরি-করা স্ট্যাটিক ফাইল (apt লাগে না)
#  • edge-tts: pip (বিকল্প কণ্ঠ)
set -u
t0=$(date +%s)

npx playwright install --only-shell chromium
B=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | tail -1)
if [ -n "$B" ] && ldd "$B" | grep -q "not found"; then
  echo "Chromium-এর কিছু লাইব্রেরি নেই — শুধু সেগুলো ইনস্টল হচ্ছে"
  ldd "$B" | grep "not found"
  timeout 900 npx playwright install-deps --only-shell chromium || timeout 900 npx playwright install-deps chromium
fi
echo "Chromium প্রস্তুত: $(( $(date +%s) - t0 )) সেকেন্ড"

if ! command -v ffmpeg >/dev/null || ! ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
  mkdir -p "$HOME/ffmpeg"
  if curl -fsSL --retry 3 --max-time 240 https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz \
    | tar -xJ -C "$HOME/ffmpeg" --strip-components=2 --wildcards '*/bin/ffmpeg' '*/bin/ffprobe'; then
    sudo install -m 755 "$HOME/ffmpeg/ffmpeg" "$HOME/ffmpeg/ffprobe" /usr/local/bin/
  else
    echo "স্ট্যাটিক ffmpeg নামানো যায়নি — apt থেকে"
    sudo apt-get update -qq && sudo apt-get install -y -qq --no-install-recommends ffmpeg
  fi
fi
ffmpeg -hide_banner -version | head -1
echo "ffmpeg প্রস্তুত: $(( $(date +%s) - t0 )) সেকেন্ড"

pip install --quiet --user --break-system-packages edge-tts 2>/dev/null || pipx install edge-tts || echo "edge-tts ইনস্টল হয়নি"
echo "$HOME/.local/bin" >> "$GITHUB_PATH"
echo "মোট প্রস্তুতি: $(( $(date +%s) - t0 )) সেকেন্ড"
