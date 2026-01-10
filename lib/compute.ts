import type { AppState, Member, PenaltyMode } from '@/lib/types';
import { PENALTY_MODE_LABEL } from '@/lib/penalty';
import { clampInt, formatDate } from '@/lib/utils';

export type ComputeRow = {
  name: string;
  note: string;
  base: number;
  penalty: number; // 음수
  incentive: number;
  penaltyDist: number;
  final: number;
  exclude: boolean;
};

export type ComputeResult =
  | { error: string }
  | {
      members: Member[];
      meta: {
        gross: number;
        netIncome: number;
        incentiveTotal: number;
        distributableBase: number;
        memberCount: number;
        includedCount: number;
        basePerFloor: number;
        baseRemainder: number;
      };
      rows: ComputeRow[];
      totals: {
        base: number;
        penalty: number; // 음수 합
        incentive: number;
        penaltyDist: number;
        final: number;
      };
    };

export function headerTitle(state: AppState): string {
  const ds = formatDate(state.date);
  const t = (state.title || '').trim();
  return `${ds}${ds && t ? ' ' : ''}${t}`;
}

/**
 * 분배 계산 (순수 함수)
 * - 입력(AppState)을 받아 결과 테이블/합계를 반환합니다.
 * - UI/스토리지와 분리되어 테스트/유지보수가 쉽습니다.
 */
export function compute(state: AppState): ComputeResult {
  const membersRaw = Array.isArray(state?.members) ? state.members : [];
  const members = membersRaw.map((m) => ({
    id: m.id,
    name: (m.name || '').trim(),
    exclude: !!m.exclude,
    note: m.note || ''
  }));

  const memberCount = members.length;
  if (memberCount === 0) {
    return { error: '공대원 수가 0명입니다. 최소 1명 이상 입력하세요.' };
  }

  // 수입(수수료 포함) 합산
  let gross = 0;
  let netIncome = 0;
  const incomeItems = Array.isArray(state?.incomeItems) ? state.incomeItems : [];
  if (incomeItems.length > 0) {
    incomeItems.forEach((item) => {
      const g = clampInt(item.gross);
      const fr = Number(item.feeRate || 0);
      const feeByRate = Math.floor(g * (fr / 100));
      const net = Math.max(0, g - feeByRate);
      gross += g;
      netIncome += net;
    });
  }

  // 인센티브
  const incentivesRaw = Array.isArray(state?.incentives) ? state.incentives : [];
  const incentives = incentivesRaw.map((i) => ({
    amount: Math.max(0, clampInt(i.amount)),
    recipientId: i.recipientId || null
  }));
  const incentiveTotal = incentives.reduce((s, i) => s + i.amount, 0);
  const distributableBase = Math.max(0, netIncome - incentiveTotal);

  // 분배 대상(분배 제외 제외)
  const includedIdx: number[] = [];
  members.forEach((m, i) => {
    if (!m.exclude) includedIdx.push(i);
  });
  const includedCount = includedIdx.length;
  if (includedCount === 0) {
    return { error: '분배 대상자가 0명입니다. (분배 제외 해제 필요)' };
  }

  // 기본 분배금: 나머지를 앞 순서에 +1씩 배분
  const basePerFloor = Math.floor(distributableBase / includedCount);
  const baseRemainder = distributableBase - basePerFloor * includedCount;
  const basePerEach = new Array(memberCount).fill(0);
  includedIdx.forEach((idx, order) => {
    basePerEach[idx] = basePerFloor + (order < baseRemainder ? 1 : 0);
  });

  // 패널티(부과) & 패널티 분배
  const penaltyChargeEach = new Array(memberCount).fill(0);
  const penaltyDistEach = new Array(memberCount).fill(0);

  const penaltyItemsRaw = Array.isArray(state?.penaltyItems) ? state.penaltyItems : [];
  const penaltyItems = penaltyItemsRaw.map((p) => ({
    label: (p.label || '').trim(),
    amount: Math.max(0, clampInt(p.amount)),
    payerId: p.payerId || null,
    mode: (p.mode || 'exclude-penalized') as PenaltyMode
  }));

  const idToIndex = new Map<string, number>();
  members.forEach((m, idx) => {
    if (m.id) idToIndex.set(m.id, idx);
  });
  const payerIndexOf = (it: (typeof penaltyItems)[number]): number | null => {
    if (it.payerId && idToIndex.has(it.payerId)) return idToIndex.get(it.payerId)!;
    return null;
  };

  // "부과 인원 제외"는 여러 항목이 얽힐 수 있어, 먼저 제외 집합을 만듭니다.
  const penalizedSet = new Set<number>();
  penaltyItems.forEach((it) => {
    if (it.mode === 'exclude-penalized') {
      const pidx = payerIndexOf(it);
      if (pidx !== null) penalizedSet.add(pidx);
    }
  });

  for (const it of penaltyItems) {
    const amt = it.amount;
    if (!(Number.isFinite(amt) && amt > 0)) continue;
    const pidx = payerIndexOf(it);
    if (pidx === null) continue;

    penaltyChargeEach[pidx] += amt;

    // 분배 대상 집합(항목별로 다름)
    let recipients: number[] = [];
    if (it.mode === 'include-self') {
      recipients = includedIdx.slice();
    } else if (it.mode === 'exclude-self') {
      recipients = includedIdx.filter((i) => i !== pidx);
    } else {
      // exclude-penalized (기본)
      recipients = includedIdx.filter((i) => !penalizedSet.has(i));
    }

    const R = recipients.length;
    if (R === 0) {
      const label = it.label || '무명';
      const modeLabel = PENALTY_MODE_LABEL[it.mode] ?? PENALTY_MODE_LABEL['exclude-penalized'];
      return { error: `패널티 항목 "${label}"(${modeLabel})의 분배 대상자가 0명입니다. (분배 제외/모드 확인)` };
    }

    const per = Math.floor(amt / R);
    const rem = amt - per * R;
    recipients.forEach((idx, k) => {
      penaltyDistEach[idx] += per + (k < rem ? 1 : 0);
    });
  }

  // 인센티브: 수령자에게 가산
  const perMemberIncent = new Array(memberCount).fill(0);
  incentives.forEach((it) => {
    let idx: number | null = null;
    if (it.recipientId && idToIndex.has(it.recipientId)) idx = idToIndex.get(it.recipientId)!;
    if (idx !== null) perMemberIncent[idx] += it.amount;
  });

  const finalEach = members.map(
    (_m, i) => basePerEach[i] - penaltyChargeEach[i] + penaltyDistEach[i] + perMemberIncent[i]
  );

  const sumBase = basePerEach.reduce((a, b) => a + b, 0);
  const sumPenaltyDist = penaltyDistEach.reduce((a, b) => a + b, 0);
  const sumPenalty = -penaltyChargeEach.reduce((a, b) => a + b, 0);
  const sumFinal = finalEach.reduce((a, b) => a + b, 0);

  return {
    members,
    meta: { gross, netIncome, incentiveTotal, distributableBase, memberCount, includedCount, basePerFloor, baseRemainder },
    rows: members.map((m, i) => ({
      name: m.name || `공대원${i + 1}`,
      note: m.note,
      base: basePerEach[i],
      penalty: -penaltyChargeEach[i],
      incentive: perMemberIncent[i],
      penaltyDist: penaltyDistEach[i],
      final: finalEach[i],
      exclude: !!m.exclude
    })),
    totals: {
      base: sumBase,
      penalty: sumPenalty,
      incentive: incentiveTotal,
      penaltyDist: sumPenaltyDist,
      final: sumFinal
    }
  };
}

