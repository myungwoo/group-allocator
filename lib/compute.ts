import type { AppState, IncomeItem, Member, PenaltyMode } from '@/lib/types';
import { PENALTY_MODE_LABEL } from '@/lib/penalty';
import { MAIL_BASE_FEE, MAIL_FEE_RATE } from '@/lib/constants';
import { clampInt, formatDate } from '@/lib/utils';

/**
 * 수입 항목 하나의 전체금액 / 수수료 제외 금액.
 *
 * 수수료는 항목별로 내림합니다. 이 계산이 계산기·입력 패널·출력 시트 요약표에서
 * 모두 필요해서 함수로 빼 두었습니다. 복사해 쓰면 반드시 어긋납니다.
 *
 * **음수(공대 공동 비용) 행은 수수료율을 무시합니다.** 음수에 수수료를 물리면
 * 수수료가 비용을 깎아 주는 방향이 되어(-500만의 3% = -15만 → 비용 485만) 뜻이
 * 반대가 됩니다. 저장된 feeRate 는 그대로 두고 계산에서만 빼므로, 부호를 되돌리면
 * 원래 수수료율이 살아납니다.
 *
 * `Math.max(0, ...)` 는 수수료율 100% 초과가 수입을 음수로 뒤집는 것을 막는
 * 안전장치입니다. 그래서 양수 행에만 걸어야 합니다 — 음수 행에 걸면 비용이 0 이
 * 되어 조용히 사라집니다.
 */
export function incomeItemAmounts(item: IncomeItem | undefined | null): { gross: number; net: number } {
  const gross = clampInt(item?.gross);
  if (gross < 0) return { gross, net: gross };
  const feeByRate = Math.floor(gross * (Number(item?.feeRate || 0) / 100));
  return { gross, net: Math.max(0, gross - feeByRate) };
}

/**
 * 택배 한 건에 보내는 쪽이 실제로 내는 돈. 보낼 금액 + 송금 수수료 + 택배 고정 수수료.
 *
 * 수수료를 내림하는 순서는 `incomeItemAmounts` 와 같게 맞췄습니다. `amount * 1.05` 로
 * 한 번에 곱하지 않는 이유는 1.05 가 2진수로 딱 떨어지지 않아 금액에 따라 1원이
 * 흔들리기 때문입니다.
 */
export function mailTotalCost(sendAmount: number): number {
  const value = clampInt(sendAmount);
  if (value <= 0) return 0;
  return value + Math.floor((value * MAIL_FEE_RATE) / 100) + MAIL_BASE_FEE;
}

/**
 * 분배금을 택배로 줄 때 **우편에 실어 보낼 금액**.
 *
 * 택배는 보내는 쪽이 수수료를 냅니다 — 보낼 금액의 `MAIL_FEE_RATE`% 인 송금 수수료와,
 * 금액과 무관한 고정 수수료 `MAIL_BASE_FEE` 입니다. 분배금은 그 수수료까지 포함한
 * 금액이어야 하므로(`보낼 금액 + 수수료 = 분배금`), 여기서 역으로 보낼 금액을 구합니다.
 *
 * 수수료가 내림이라 나눗셈만으로는 1원이 어긋납니다. `mailTotalCost` 로 되짚어 보면서
 * **총액이 분배금을 넘지 않는 가장 큰 금액**을 고릅니다 — 넘으면 보내는 사람이 자기
 * 돈을 보태게 됩니다.
 *
 * 분배금이 고정 수수료도 못 채우면(패널티로 다 깎인 공대원 포함) 0 입니다 — 택배로는
 * 보낼 것이 없습니다.
 */
export function mailSendAmount(allocation: number): number {
  const total = clampInt(allocation);
  const budget = total - MAIL_BASE_FEE;
  if (budget <= 0) return 0;

  // 내림 때문에 실제 수수료는 이보다 적을 수 있어, 한 칸씩 올려 보며 맞춥니다.
  let send = Math.floor((budget * 100) / (100 + MAIL_FEE_RATE));
  while (send > 0 && mailTotalCost(send) > total) send--;
  while (mailTotalCost(send + 1) <= total) send++;
  return send;
}

/** 수입 항목 합산 (전체금액 / 수수료 제외 금액). */
export function sumIncome(items: IncomeItem[] | undefined | null): { gross: number; net: number } {
  let gross = 0;
  let net = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const amounts = incomeItemAmounts(item);
    gross += amounts.gross;
    net += amounts.net;
  }
  return { gross, net };
}

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

  // 수입(수수료 포함) 합산. 음수 항목은 공대 공동 비용입니다.
  const { gross, net: netIncome } = sumIncome(state?.incomeItems);
  if (netIncome < 0) {
    return { error: '비용(음수 수입)이 수입보다 큽니다. 수입 항목을 확인하세요.' };
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

