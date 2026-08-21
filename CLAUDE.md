# 공대 분배 계산기

공대 수입·인센티브·패널티를 넣으면 인당 분배금을 계산하는 정적 웹앱입니다. 서버가 없고
데이터는 전부 브라우저에 남습니다.

```bash
npm run dev         # 개발 서버 (http://localhost:3000)
npm run lint        # ESLint (저장소 전체)
npm run typecheck   # tsc --noEmit
npm run build       # 정적 내보내기 → out/ (타입 검사도 같이 돕니다)
```

`npm run dev` 를 띄운 채로 `npm run build` 를 돌리면 `.next` 를 서로 덮어써서 개발
서버가 청크 404 를 냅니다. 빌드했으면 개발 서버를 다시 띄우세요.

ESLint 는 flat config(`eslint.config.mjs`)를 씁니다. 규칙 세트는 다른 메이플랜드
유틸들과 같은 `next/core-web-vitals` + `next/typescript` 입니다. `next lint` 를 쓰지 않는
이유는 Next.js 16 에서 제거될 예정이고, 정해진 디렉터리만 검사해서 사각지대가 생기기
때문입니다 — 파일에 적어 뒀습니다.

## 화면은 두 부분입니다

용어를 섞으면 대화가 안 되니 이렇게 부릅니다.

- **크롬(chrome)** — 앱 헤더, 기록 바, 입력 패널, 액션 툴바. 조작하는 UI 입니다.
  `AllocatorApp` 의 `<div className="chrome">` 안에 전부 들어 있습니다.
- **출력 시트(sheet)** — `#printArea`. 제목 + 분배표 + 하단 요약/MEMO. **PNG 저장·복사와
  인쇄가 그대로 이 픽셀을 내보냅니다.**
- **기록(record)** — 날짜 하나의 분배 한 건. 코드에는 아직 `tabs`/`TabItem` 이라는
  옛 이름으로 남아 있지만, UI 문구는 전부 "기록" 입니다. 새로 쓰는 문구도 "탭" 말고
  "기록" 으로 맞춰 주세요.

## 깨뜨리면 안 되는 것

### 1. 출력 시트는 결과물입니다

`components/OutputSheet.tsx` 와 `app/globals.css` 의 `[2] 출력 시트` 구역은 사람들이 받아서
공대 채팅에 올리는 이미지입니다. 여백 하나를 바꾸면 지난주 분배표와 이번 주 분배표가 달라
보입니다. **요청받지 않았다면 건드리지 마세요.**

아래 것들은 시트와 한 몸이라 무심코 바뀝니다.

- `html, body` 의 `font-family` / `font-size` — 시트도 이걸 물려받습니다.
- 접두어 없는 색 토큰(`--line`, `--total-bg`, `--pink` …) — 시트 전용입니다.
  크롬 색은 `--ui-*` 를 쓰고, 필요하면 `--ui-*` 를 새로 만드세요.
- `table` / `th` / `td` 같은 요소 선택자 — 시트의 표에 그대로 걸립니다. 크롬에 표를
  넣을 일이 생기면 클래스로 범위를 좁히세요.

화면에서 시트를 종이처럼 받쳐 주는 `.sheet-card` 는 예외입니다. 캡처 대상은 그 안쪽
`#printArea` 이고, 인쇄에서는 `.sheet-card` 의 테두리·여백을 0 으로 되돌립니다.

### 2. 인쇄에 조작 UI 가 새면 안 됩니다

예전에는 `@media print` 가 숨길 것을 하나하나 나열해서(`.actions`, `details.input-panel`),
새로 만든 기록 바가 목록에 없어 인쇄물 맨 위에 탭이 찍혔습니다.

지금은 반대로 합니다. **조작 UI 는 전부 `.chrome` 안에 두고, 인쇄에서 `.chrome` 통째로
숨깁니다.** `.chrome` 밖에 둬야 하는 것(토스트처럼 `position: fixed` 인 것)은 `.no-print`
를 붙이세요. 새 UI 를 넣은 뒤에는 인쇄 미리보기로 한 번 확인하세요.

### 3. localStorage 키는 오리진을 공유합니다

이 앱은 **다른 유틸들과 브라우저 저장소를 공유합니다.**

- `https://myungwoo.github.io/group-allocator/` — 다른 프로젝트 페이지들과 오리진
  (`myungwoo.github.io`)이 같습니다.
- `https://mapleland.myungwoo.kr/split/` —
  [메이플랜드 유틸 모음](https://github.com/myungwoo/mapleland-utils)이 유틸 다섯 개를
  한 도메인의 하위 경로로 함께 배포합니다.

**localStorage 는 오리진 단위입니다. 경로로 갈라지지 않습니다.** `/split` 과 `/damage` 는
같은 저장소를 봅니다. 접두어 없는 키는 다른 유틸의 값을 조용히 덮어씁니다.

- **앱 전용 값은 `ml:split:` 로 시작합니다.** 키는 `lib/constants.ts` 에만 적습니다
  (현재 기록 저장 키 `ml:split:tabs:v1` 하나).
- **키를 바꿀 때 예전 키를 지우지 않습니다.** 새 키가 비어 있을 때만 한 번 복사합니다
  (`lib/storage.ts` 의 `readTabsRaw`). 배포를 되돌려도 저장이 남아 있어야 하고, 그래야
  여러 번 돌아도 결과가 같습니다.
- 테마처럼 유틸들이 **일부러 공유하는** 값은 예외이고, 그때는 `ml:theme`
  (`'light' | 'dark' | 'system'`)을 씁니다. 이 앱에는 아직 없습니다.

### 4. 저장은 클라이언트에서만 합니다

`lib/storage.ts` 는 `localStorage` 를 직접 만지므로 SSR 단계에서 부르면 터집니다.
`useEffect` 안이나 이벤트 핸들러에서만 호출하세요. `AllocatorApp` 은 `hydrated` 가 될
때까지 최소 UI 만 그립니다 — SSR/CSR 불일치를 막는 장치이니 지우지 마세요.

### 5. 서버가 없습니다

`output: "export"` 정적 빌드입니다. 라우트 핸들러·서버 액션·미들웨어를 넣으면 빌드가
깨집니다. `basePath` 는 배포하는 쪽이 `NEXT_PUBLIC_BASE_PATH` 로 주입하고, 없으면
`GITHUB_PAGES` + `GITHUB_REPOSITORY` 로 `/<repo>` 를 만듭니다(`next.config.ts`).

### 6. 계산은 한 곳에서만 합니다

`lib/compute.ts` 가 유일한 계산기입니다. 수수료를 빼는 식, 나머지 1원을 앞에서부터
배분하는 규칙, 패널티 분배 대상을 고르는 규칙이 전부 여기 있습니다.

같은 계산을 화면에서 또 쓰고 싶으면 **함수를 꺼내 쓰세요.** 기록 목록이 수수료 계산을
따로 갖고 있다가 어긋난 적이 있어서, 공통으로 쓰는 조각은 `compute.ts` 에서 내보냅니다
(`sumIncome`). 입력 패널의 요약 칩도 `compute()` 결과를 그대로 받습니다.

## 코드 지도

```
app/
  globals.css          [1] 크롬 / [2] 출력 시트 / 인쇄 — 구역 주석을 지우지 마세요
  layout.tsx           메타데이터, Pretendard CDN
components/
  AllocatorApp.tsx     상태 연결 + PNG·JSON·인쇄 동작 + 토스트
  TabsBar.tsx          기록 바 + 기록 찾기 모달(⌘K)
  InputPanel.tsx       날짜/제목 + 다섯 개 섹션
  ActionsBar.tsx       출력용 / 데이터용 버튼 묶음
  OutputSheet.tsx      #printArea — 결과물. 요청 없이 손대지 않습니다
  rows/                행 하나짜리 컴포넌트 4개 + dnd.tsx(드래그·키보드 공통)
  ui/                  Icon, NumberInputs, Section, RowList, Toast
  hooks/
    useAllocatorState  기록 목록 + 현재 기록, localStorage 저장
    useListOps         AppState 안의 리스트 하나에 대한 update/remove/move/append
  utils/               memo(출력용 MEMO 조립), png(html2canvas + 흰 여백)
lib/
  compute.ts           계산기. 여기 말고 어디에도 계산을 두지 않습니다
  clipboard.ts         디스코드용 분배 텍스트(비슷한 금액 묶기)
  storage.ts           정규화 + localStorage 읽기/쓰기
  penalty.ts           패널티 방식 라벨(계산·화면 공용)
  types.ts / utils.ts / constants.ts
```

## UI 를 더 만들 때

- **입력칸은 `.inp`, 버튼은 `.btn`(+`--primary`/`--ghost`/`--danger`), 아이콘 버튼은
  `.icon-btn`** 을 씁니다. 인라인 `style` 로 폭을 잡던 코드를 정리한 뒤라, 새로 인라인
  스타일을 넣으면 다시 어긋납니다.
- **금액 입력은 `MoneyInput`** 을 씁니다. 0 을 빈 칸으로 보여 주고, 콤마가 다시 붙어도
  캐럿을 제자리에 돌려놓습니다(`useLayoutEffect` 로 합니다 — `requestAnimationFrame` 은
  React 가 값을 다시 쓰기 전에 돌아서 캐럿이 맨 뒤로 밀립니다).
- **기록 띠는 `STRIP_SIZE`(4)개까지만 보여 주고, 남은 개수를 `+N` 칩으로 같은 줄에
  붙입니다.** 총 개수를 오른쪽 `전체 N` 버튼에만 두면 액션 버튼들 사이에 묻혀서, 기록이
  4개까지만 저장되는 것처럼 보입니다.
- **공대원 목록은 1100px 부터 두 열로 나눕니다**(`RowList` 의 `split`). 이름·메모만 있는
  행이라 한 열로 두면 칸이 200px 씩 늘어나고 세로로만 길어집니다. 두 가지를 지켜야
  합니다 — 머리글은 **열마다 하나씩** 두어야 각 열의 5칸과 맞고(하나를 두 열에 걸치면
  어긋납니다), 행은 그리드 **기본 흐름(행 우선)** 이어야 읽는 순서가 실제 순서와 같습니다.
  공대원 순서는 나머지 1원을 배분할 때 쓰이니 열 우선으로 바꾸지 마세요.
- **카드는 둘씩 짝지어 놓습니다**(`.panel-row--income`, `.panel-row--penalty`). 카드 하나가
  패널 폭을 혼자 쓰면 금액·수수료율처럼 폭이 고정된 칸은 그대로인데 라벨 칸만 커져서
  오른쪽이 비어 보입니다. 공대원 목록만 예외로 전체 폭을 쓰는데, 이름과 메모 둘 다
  유동 폭이라 표처럼 채워집니다.
- **행 리스트는 `RowList` + `.row--{variant}`** 로 만듭니다. 컬럼 머리글과 행이 **같은
  그리드 클래스**를 쓰기 때문에 열이 저절로 맞습니다. 머리글 없이 입력칸만 늘어놓으면
  어느 칸이 금액인지 알 수 없습니다 — 그게 예전 화면의 가장 큰 불편이었습니다.
- **항목 추가는 빈 행을 붙이고 첫 칸에 포커스**를 줍니다(`focusId` + `useRowAutoFocus`).
  따로 입력 폼을 두면 위 행들과 열이 어긋납니다. 마지막 행에서 Enter 를 누르면 다음 행이
  생깁니다.
- **한글 입력 중 Enter 는 무시**합니다. IME 조합을 확정하는 Enter 까지 받으면 행이
  두 번 생깁니다. `nativeEvent.isComposing` 을 보세요.
- **Delete 키로 행을 지우는 것은 입력칸 밖에서만** 동작합니다(`dnd.tsx` 의 `isFormField`).
  예전에는 이름을 고치다 Delete 를 누르면 행이 통째로 사라졌습니다.
- 되돌릴 수 없는 동작(기록 삭제, 초기화)은 `confirm` 으로 한 번 묻습니다. 성공/실패
  알림은 `useToast` 로 하세요 — `alert` 은 흐름을 끊습니다.
- **높이가 정해진 flex 칸에 `align-items: baseline` 을 쓰지 마세요.** 한 줄 flex 에서는
  줄 자체가 위쪽에 붙어서 글자가 상단에 몰립니다(기록 칩에서 겪었습니다). 세로 가운데가
  필요하면 `center` 입니다.
