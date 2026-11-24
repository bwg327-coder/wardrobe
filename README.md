# WARDROBE 1.0 (PWA)

빌드 도구 없는 정적 웹앱입니다. 폴더 그대로 아무 정적 호스팅(HTTPS)에 올리면 설치형 PWA로 동작합니다.

## 실행
- 로컬: `python3 -m http.server 8080` 후 `http://localhost:8080`
- 배포: GitHub Pages / Cloudflare Pages / Netlify 등 무료 정적 호스팅. 서비스 워커는 HTTPS(또는 localhost)에서만 등록됩니다.
- 업데이트 배포 시 `sw.js`의 `VERSION`을 올리면 캐시가 교체됩니다.

## 구조
- `js/db.js` IndexedDB (items · records · photos · meta)
- `js/store.js` 상태·저장·집계. 착장 횟수는 기록에서 파생 계산(중복 집계 없음)
- `js/garments.js` 도식화 렌더러, 사진 레이어 합성
- `js/recommend.js` 규칙 기반 추천 · `js/backup.js` JSON 백업/복원(사진 포함)
- `js/ui/*` 화면(옷장 · 코디 · 기록 · 시트)
- `assets/fonts` Pretendard(KS X 1001 한글 2,350자 서브셋) · Archivo(로고 글자만), OFL

## Capacitor 전환
`npm i @capacitor/core @capacitor/cli @capacitor/android` → `npx cap init WARDROBE com.example.wardrobe --web-dir .` → `npx cap add android`.
백업 파일 저장은 `js/backup.js`의 `saveFile()`만 Filesystem/Share 플러그인으로 바꾸면 됩니다.
