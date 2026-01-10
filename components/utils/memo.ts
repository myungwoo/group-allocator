'use client';

import type { AppState, Member } from '@/lib/types';
import { PENALTY_MODE_LABEL_WITH_DIST } from '@/lib/penalty';
import { fmt } from '@/lib/utils';

export function buildMemoForPrint(state: AppState, members: Member[]): string {
  let memoText = state.memo || '';
  if (!state.penaltyItems?.length) return memoText;

  // 멤버 id -> 이름 매핑
  const idToName = new Map<string, string>();
  members.forEach((m, idx) => {
    const name = m.name || `공대원${idx + 1}`;
    if (m.id) idToName.set(m.id, name);
  });

  const lines = state.penaltyItems.map((it, i) => {
    const payerName = it.payerId ? idToName.get(it.payerId) || '' : '';
    const nameWithPayer = (it.label || `패널티 ${i + 1}`) + (payerName ? ` (${payerName})` : '');
    const modeLabel = PENALTY_MODE_LABEL_WITH_DIST[it.mode] || PENALTY_MODE_LABEL_WITH_DIST['exclude-penalized'];
    return `- ${nameWithPayer} [${modeLabel} 방식] ${fmt(Math.max(0, Math.floor(it.amount || 0)))}`;
  });

  memoText += (memoText ? '\n\n' : '') + '[패널티]\n' + lines.join('\n');
  return memoText;
}

