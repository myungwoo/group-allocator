# 공대 분배 계산기

공대 수입·인센티브·패널티를 넣으면 인당 분배금을 계산하는 정적 웹앱입니다. 서버가 없고
데이터는 전부 브라우저에 남습니다.

```bash
npm run dev     # 개발 서버
npm run lint
npm run build   # 정적 내보내기 → out/
```

## 깨뜨리면 안 되는 것

### 1. localStorage 키는 오리진을 공유합니다

이 앱은 **다른 유틸들과 브라우저 저장소를 공유합니다.**

- `https://myungwoo.github.io/group-allocator/` — 다른 프로젝트 페이지들과 오리진
  (`myungwoo.github.io`)이 같습니다.
- `https://mapleland.myungwoo.kr/split/` —
  [메이플랜드 유틸 모음](https://github.com/myungwoo/mapleland-utils)이 유틸 다섯 개를
  한 도메인의 하위 경로로 함께 배포합니다.

**localStorage 는 오리진 단위입니다. 경로로 갈라지지 않습니다.** `/split` 과 `/damage` 는
같은 저장소를 봅니다. 접두어 없는 키는 다른 유틸의 값을 조용히 덮어씁니다.

- **앱 전용 값은 `ml:split:` 로 시작합니다.** 키는 `lib/constants.ts` 에만 적습니다
  (현재 탭 저장 키 `ml:split:tabs:v1` 하나).
- **키를 바꿀 때 예전 키를 지우지 않습니다.** 새 키가 비어 있을 때만 한 번 복사합니다
  (`lib/storage.ts` 의 `readTabsRaw`). 배포를 되돌려도 저장이 남아 있어야 하고, 그래야
  여러 번 돌아도 결과가 같습니다.
- 테마처럼 유틸들이 **일부러 공유하는** 값은 예외이고, 그때는 `ml:theme`
  (`'light' | 'dark' | 'system'`)을 씁니다. 이 앱에는 아직 없습니다.

### 2. 저장은 클라이언트에서만 합니다

`lib/storage.ts` 는 `localStorage` 를 직접 만지므로 SSR 단계에서 부르면 터집니다.
`useEffect` 안이나 이벤트 핸들러에서만 호출하세요.

### 3. 서버가 없습니다

`output: "export"` 정적 빌드입니다. 라우트 핸들러·서버 액션·미들웨어를 넣으면 빌드가
깨집니다. `basePath` 는 배포하는 쪽이 `NEXT_PUBLIC_BASE_PATH` 로 주입하고, 없으면
`GITHUB_PAGES` + `GITHUB_REPOSITORY` 로 `/<repo>` 를 만듭니다(`next.config.ts`).
