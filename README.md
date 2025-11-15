# 알목 분배 유틸리티 🚀

[![Website - Live](https://img.shields.io/badge/Website-Live-2ea44f?style=flat&logo=githubpages)](https://myungwoo.github.io/group-allocator/)
![Made with - Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e?logo=javascript&logoColor=000)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

바닐라 JavaScript, HTML, CSS만으로 동작하는 간단한 브라우저 전용 유틸리티 앱입니다.

- **사이트:** [myungwoo.github.io/group-allocator](https://myungwoo.github.io/group-allocator/)

## 이 유틸리티는 무엇을 하나요 ✨

- **입력 관리 🧾**
  - 날짜/제목, MEMO를 기록합니다.
  - 수입 항목/인센티브 항목을 추가할 수 있으며, 금액은 0 이상의 정수만 허용됩니다.
  - 공대원 목록을 관리하고, 특정 인원을 분배에서 제외할 수 있습니다.
  - 사망 패널티(음수 불가)를 인원별로 설정할 수 있습니다.
  - 키보드로도 추가(Enter)/삭제(Del)가 가능합니다.
- **자동 계산 🧮**
  - 수입 항목이 하나라도 있으면 단일 입력 대신 합산값을 사용합니다.
  - 수입 총액, 분배 총액, 분배 인원, 인당 기본 분배금(기본), 패널티 분배금, 최종 알목 분배금을 계산합니다.
  - 결과는 표 형태로 표시됩니다.
- **출력/공유 📤**
  - 결과를 PNG로 저장하거나 PDF/인쇄할 수 있습니다.
  - 인쇄 시 브라우저 설정에서 “배경 그래픽 인쇄”를 켜면 보기 좋게 출력됩니다.
- **사용성 🧩**
  - 입력 패널 접기/펼치기 지원으로 화면을 깔끔하게 유지합니다.
  - 한 번에 초기화할 수 있는 기능을 제공합니다.

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
