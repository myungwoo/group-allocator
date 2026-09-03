/**
 * 앱 전역 상수.
 *
 * ── localStorage 키 ──
 *
 * 왜 접두어가 붙었나: mapleland.myungwoo.kr 은 유틸 여러 개가 한 오리진을 공유합니다
 * (myungwoo.github.io 의 프로젝트 페이지들도 마찬가지입니다). 접두어가 없으면 다른
 * 유틸의 키와 부딪힙니다.
 */
export const TABS_KEY = 'ml:split:tabs:v1';

/** 접두어를 붙이기 전에 쓰던 키. 새 키가 비어 있을 때 한 번 옮겨 옵니다. */
export const LEGACY_TABS_KEY = 'almok_tabs_v1';


/**
 * 수입 항목을 새로 추가할 때 넣어 주는 수수료율(%).
 *
 * 경매장 수수료가 보통 정해져 있어서, 매번 같은 값을 다시 치게 두지 않습니다.
 * 같은 기록에 이미 수입 항목이 있으면 그 마지막 값을 물려받고, 첫 항목일 때만 이 값을
 * 씁니다(`InputPanel` 의 `addIncome`).
 */
export const DEFAULT_INCOME_FEE_RATE = 5;


/**
 * 택배(우편) 수수료율(%).
 *
 * 분배금을 택배로 보내면 받는 사람에게는 이만큼 뺀 금액이 도착합니다. 메이플랜드 2.0
 * 부터 금액과 무관하게 5% 로 고정이라 상수로 둡니다. 경매장 수수료
 * (`DEFAULT_INCOME_FEE_RATE`)와 값은 같지만 뜻이 다른 수수료이니 합치지 마세요 —
 * 경매장 쪽은 항목마다 사용자가 고쳐 쓰는 기본값이고, 이쪽은 게임이 정한 값입니다.
 */
export const MAIL_FEE_RATE = 5;
