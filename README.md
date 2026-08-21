# 분배 유틸리티 🚀

[![Website - Live](https://img.shields.io/badge/Website-Live-2ea44f?style=flat&logo=githubpages)](https://myungwoo.github.io/group-allocator/)
![Made with - Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?style=flat&logo=nextdotjs&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=ffffff)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

공대(파티) 분배 계산을 도와주는 **Next.js + TypeScript** 웹 유틸리티입니다.

- **사이트:** [myungwoo.github.io/group-allocator](https://myungwoo.github.io/group-allocator/)

## 이 유틸리티는 무엇을 하나요 ✨

- **기록 관리 🗂️**
  - 분배 한 건이 "기록" 하나입니다. 최근 기록은 상단 바에 붙어 있고, `⌘K`(윈도는
    `Ctrl+K`)로 전체 기록을 날짜·제목으로 찾을 수 있습니다.
  - **새 기록**은 오늘 날짜의 빈 기록을 만들고 공대원 명단만 이어서 씁니다.
    **복제**는 지금 기록을 그대로 복사합니다.
- **입력 관리 🧾**
  - 날짜/제목, MEMO를 기록합니다.
  - 수입 항목에 전체금액과 수수료율(%)을 넣으면 수수료를 뺀 금액이 분배 대상이 됩니다.
  - 공대원 목록을 관리하고, 특정 인원을 분배에서 제외할 수 있습니다.
  - 패널티 항목을 추가하고, **지불자** 및 **분배 방식**을 선택할 수 있습니다.
  - 마지막 행에서 Enter 를 누르면 다음 행이 생기고, `Alt+↑/↓` 로 순서를 옮깁니다.
    드래그 핸들로도 옮길 수 있습니다.
  - 대상자·지불자를 비워 둔 항목은 노란 칩으로 알려 줍니다(계산에서 빠지거나 아무에게도
    가지 않는 금액입니다).
- **자동 계산 🧮**
  - 수입 총액, 분배 총액, 분배 인원, 인당 기본 분배금, 패널티 분배금, 최종 분배금을
    계산합니다. 나머지 1원은 명단 앞에서부터 배분합니다.
  - 합계 검산이 어긋나면 TOTAL 줄에 빨갛게 표시됩니다.
- **출력/공유 📤**
  - 결과를 PNG로 저장하거나 클립보드로 복사할 수 있습니다.
  - 디스코드에 붙일 분배 텍스트를 복사할 수 있습니다(비슷한 금액끼리 묶어 줍니다).
  - PDF/인쇄도 지원합니다. 인쇄물에는 분배표만 나오고 조작 UI 는 들어가지 않습니다.
    브라우저 설정에서 "배경 그래픽 인쇄"를 켜면 표 색이 그대로 나옵니다.
  - PNG 복사는 브라우저의 Async Clipboard API 지원 및 보안 컨텍스트(HTTPS/localhost)에서
    동작합니다.
- **사용성 🧩**
  - 입력 패널을 접으면 날짜·제목만 남습니다.
  - 금액 칸은 세 자리 콤마를 붙여 보여 주고, 숫자 중간을 고쳐도 커서가 튀지 않습니다.
  - 기록별 JSON 내보내기/가져오기를 지원합니다.

## 개발 🛠️

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속하세요.

## 저장 방식 💾

- 브라우저 `localStorage`에 기록 단위로 저장합니다. 서버로 아무것도 보내지 않습니다.
- 키는 `ml:split:` 접두어를 씁니다. 같은 도메인에 함께 배포되는 다른 유틸과 저장소를
  공유하기 때문입니다(자세한 내용은 `CLAUDE.md`).
