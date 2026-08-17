#!/bin/bash
# 급식표를 브라우저에서 엽니다. 이 파일을 더블클릭하세요.
cd "$(dirname "$0")" || exit 1

PORT=8765
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory web >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT

sleep 1
open "http://127.0.0.1:$PORT/index.html"

echo ""
echo "  급식표가 브라우저에 열렸습니다."
echo "  주소: http://127.0.0.1:$PORT/index.html"
echo ""
echo "  ※ 이 창은 그대로 열어 두세요. 닫으면 급식표도 함께 멈춥니다."
echo ""
wait $SERVER
