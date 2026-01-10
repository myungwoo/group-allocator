import type { PenaltyMode } from '@/lib/types';

/**
 * 패널티 분배 방식 라벨 모음
 * - 계산 로직/화면 표시에서 공통으로 사용합니다.
 */
export const PENALTY_MODE_LABEL: Record<PenaltyMode, string> = {
  'exclude-penalized': '부과 인원 제외',
  'exclude-self': '본인 제외',
  'include-self': '본인 포함'
};

export const PENALTY_MODE_LABEL_WITH_DIST: Record<PenaltyMode, string> = {
  'exclude-penalized': '부과 인원 제외 분배',
  'exclude-self': '본인 제외 분배',
  'include-self': '본인 포함 분배'
};

