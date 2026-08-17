# 오늘의 식판

우리 학교 급식표를 한눈에 보는 웹앱. 교육부 나이스(NEIS) 오픈API에서 실제 급식 식단을 가져옵니다.

**라이브**: https://thunderous-crisp-a13792.netlify.app

## 폴더

| 경로 | 설명 |
|---|---|
| `web/` | **배포되는 폴더.** Netlify의 publish directory를 `web`으로 지정 |
| `web/index.html` | 앱 전체 (화면·스타일·기능이 이 한 파일에) |
| `web/manifest.webmanifest` | 홈 화면 앱 정보 (이름, 아이콘, 색) |
| `web/sw.js` | 오프라인에서도 열리게 하는 서비스워커 |
| `web/_headers` | Netlify 응답 헤더 설정 |
| `급식표 열기.command` | 맥에서 로컬로 열어보는 실행 파일 (더블클릭) |

## 고치는 법

`web/index.html`만 고치면 됩니다. GitHub 웹에서 연필 아이콘을 눌러 바로 수정하고 저장(Commit)하면, Netlify가 1~2분 안에 자동으로 새로 배포합니다.

## 알아둘 것

나이스 오픈API는 인증키 없이도 호출되지만 **한 번에 5건까지만** 응답합니다. 그래서 조회 구간을 재귀로 쪼개 가져옵니다 (한 주 약 7회, 한 달 약 13회 요청). 받아온 식단은 브라우저 localStorage에 저장돼 다시 볼 때는 요청하지 않습니다.

앱 설정에서 무료 인증키를 넣으면 한 번에 받아옵니다. 발급: https://open.neis.go.kr
