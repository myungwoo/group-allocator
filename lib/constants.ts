/**
 * localStorage 키.
 *
 * 왜 접두어가 붙었나: mapleland.myungwoo.kr 은 유틸 여러 개가 한 오리진을 공유합니다
 * (myungwoo.github.io 의 프로젝트 페이지들도 마찬가지입니다). 접두어가 없으면 다른
 * 유틸의 키와 부딪힙니다.
 */
export const TABS_KEY = 'ml:split:tabs:v1';

/** 접두어를 붙이기 전에 쓰던 키. 새 키가 비어 있을 때 한 번 옮겨 옵니다. */
export const LEGACY_TABS_KEY = 'almok_tabs_v1';

