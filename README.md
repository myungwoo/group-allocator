# 분배 유틸리티 🚀

[![Website - Live](https://img.shields.io/badge/Website-Live-2ea44f?style=flat&logo=githubpages)](https://myungwoo.github.io/group-allocator/)
![Made with - Next.js](https://img.shields.io/badge/Made%20with-Next.js-000000?style=flat&logo=nextdotjs&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=ffffff)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

공대(파티) 분배 계산을 도와주는 **Next.js + TypeScript** 웹 유틸리티입니다.

- **사이트:** [myungwoo.github.io/group-allocator](https://myungwoo.github.io/group-allocator/)

## 이 유틸리티는 무엇을 하나요 ✨

- **입력 관리 🧾**
  - 날짜/제목, MEMO를 기록합니다.
  - 수입 항목/인센티브 항목을 추가할 수 있으며, 금액은 0 이상의 정수만 허용됩니다.
  - 공대원 목록을 관리하고, 특정 인원을 분배에서 제외할 수 있습니다.
  - 패널티 항목을 추가하고, **지불자** 및 **분배 방식**을 선택할 수 있습니다.
  - 키보드로도 추가(Enter)/삭제(Del)가 가능합니다.
- **자동 계산 🧮**
  - 수입 항목이 하나라도 있으면 단일 입력 대신 합산값을 사용합니다.
  - 수입 총액, 분배 총액, 분배 인원, 인당 기본 분배금(기본), 패널티 분배금, 최종 분배금을 계산합니다.
  - 결과는 표 형태로 표시됩니다.
- **출력/공유 📤**
  - 결과를 PNG로 저장(다운로드)하거나 PNG로 클립보드에 복사할 수 있습니다.
  - 별도로 PDF/인쇄도 지원합니다. 인쇄 시 브라우저 설정에서 “배경 그래픽 인쇄”를 켜면 보기 좋게 출력됩니다.
  - PNG 복사는 브라우저의 Async Clipboard API 지원 및 보안 컨텍스트(HTTPS/localhost)에서 동작합니다.
- **사용성 🧩**
  - 입력 패널 접기/펼치기 지원으로 화면을 깔끔하게 유지합니다.
  - 한 번에 초기화할 수 있는 기능을 제공합니다.
  - 하단 MEMO 박스는 내용 길이에 따라 자동으로 높이가 조절됩니다.

## 개발 🛠️

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속하세요.

## 저장 방식 💾

- 브라우저 `localStorage`에 탭(기록) 단위로 저장합니다.
