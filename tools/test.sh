#!/bin/bash
# 앱을 가짜 DOM에 올려 화면과 동작을 통째로 검사한다.
# 브라우저 없이 돌아가고, 나이스 API와 게시판 API는 실제 데이터로 흉내낸다.
#
#   ./tools/test.sh
#
set -e
cd "$(dirname "$0")"

JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
[ -x "$JSC" ] || { echo "JavaScriptCore를 찾지 못했습니다: $JSC"; exit 1; }

# index.html 안의 <script>를 꺼내 harness.js가 읽을 app.js로 만든다
python3 - <<'PY'
import re
src = open('../web/index.html', encoding='utf-8').read()
open('app.js', 'w', encoding='utf-8').write(re.search(r'<script>(.*)</script>', src, re.S).group(1))
PY

# 문법 먼저 확인 (오류가 있으면 아래 실행이 통째로 죽는다)
"$JSC" -e "
var src = readFile('app.js');
try { new Function(src); } catch (e) { print('문법 오류: ' + e); quit(1); }
"

"$JSC" harness.js
