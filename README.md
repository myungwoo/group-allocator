# 알목 분배 유틸리티 🚀

바닐라 JavaScript, HTML, CSS만으로 동작하는 간단한 브라우저 전용 유틸리티 앱입니다.

## 폴더 구조 📁

- `index.html` — 앱 엔트리
- `styles.css` — 전역 스타일
- `app.js` — 부트스트랩 및 이벤트 바인딩
- `render.js` — DOM 렌더링 유틸리티
- `state.js` — 간단 상태 관리 헬퍼
- `utils.js` — 공용 헬퍼 함수

## 시작하기 🏁

방법 1) 파일 직접 열기
`index.html`을 브라우저로 바로 여세요.

방법 2) 간단 서버로 제공(권장, file:// CORS 이슈 회피)

Using Python:

```bash
python3 -m http.server 5173
```

그다음 브라우저에서 `http://localhost:5173` 로 접속하세요.

## 개발 워크플로우 🛠️

- JS/CSS/HTML 파일을 바로 수정하고 새로고침하면 반영됩니다.
- 별도의 빌드 단계는 필요하지 않습니다.
