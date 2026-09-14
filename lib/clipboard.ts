import type { AppState } from '@/lib/types';
import { compute, mailSendAmount } from '@/lib/compute';
import { fmt } from '@/lib/utils';

/** 한 줄에 넣을 이름 수. 5명을 넘기면 디스코드에서 줄이 접혀 읽기 나빠집니다. */
const NAMES_PER_LINE = 5;

/** 같은 금액으로 묶는 허용 오차(원). 나머지 1원 배분 때문에 딱 떨어지지 않습니다. */
const CLUSTER_TOLERANCE = 100;

function formatDateClipboard(dateStr: string): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return '';
  const y = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  const d = Number(parts[2]) || 0;
  const yy = String(y).slice(2);

  // 요일(일/월/화/수/목/금/토) - UTC 기준으로 계산해 타임존 영향 제거
  let dow = '';
  try {
    const dtUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    const map = ['일', '월', '화', '수', '목', '금', '토'] as const;
    dow = map[dtUtc.getUTCDay()] || '';
  } catch {
    // ignore
  }
  return `${yy}. ${m}. ${d}${dow ? ` (${dow})` : ''}`;
}

/**
 * 디스코드 마크다운으로 해석되는 글자를 이스케이프합니다.
 *
 * 이름은 대개 한글·영숫자뿐이지만 메모는 자유 입력이라, `*강제퇴장*` 같은 메모가
 * 기울임으로 먹혀 별표가 사라집니다.
 */
function escapeDiscord(text: string): string {
  return String(text ?? '').replace(/([\\*_~`|>])/g, '\\$1');
}

function memberLabel(name: string, note: string): string {
  const nm = escapeDiscord(name || '');
  const nt = escapeDiscord((note || '').trim());
  return nt ? `${nm} *(${nt})*` : nm;
}

/**
 * 디스코드에 그대로 붙이는 분배 텍스트.
 *
 * 예전에는 500만 미만 거래의 수수료율이 낮아 "수수료작"(4,999,999 * 3 처럼 여러 번
 * 나눠 거래)을 했고, 그 곱셈식을 만들어 주는 게 이 함수의 일이었습니다. 메이플랜드
 * 2.0 부터 수수료가 금액과 무관하게 5% 로 고정되어 나눠 거래할 이유가 없어졌으므로,
 * 지금은 금액이 비슷한 사람끼리 묶어 보여 주기만 합니다.
 *
 * 금액 옆에는 택배로 줄 때 우편에 실을 금액을 같이 적습니다(`mailSendAmount`). 분배는
 * 만나서 거래하거나 택배로 보내는데, 택배는 보내는 쪽이 송금 수수료와 고정 수수료를
 * 내므로 수수료까지 분배금 안에서 떼야 합니다. 두 금액을 같이 두면 어느 쪽으로 주든
 * 그대로 보고 칠 수 있습니다.
 */
export function createDistributionClipboardText(state: AppState): string {
  // 날짜도 제목도 없으면 제목 줄을 아예 뺍니다. `##` 만 남으면 디스코드가 소제목으로
  // 보지 않고 글자 그대로 찍습니다.
  const header = [formatDateClipboard(state.date), (state.title || '').trim()].filter(Boolean).join(' ');
  const lines: string[] = header ? [`## ${escapeDiscord(header)}`] : [];

  const result = compute(state);
  if ('error' in result) return lines.join('\n');

  const effective = (result.rows || [])
    .map((r, idx) => ({
      name: r.name,
      note: r.note,
      amount: Math.floor(Number(r.final) || 0),
      order: idx
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.amount - b.amount);

  // 거의 같은 금액끼리 묶고, 그룹의 중앙값을 대표 금액으로 씁니다.
  const clusters: Array<{ amount: number; names: string[] }> = [];
  for (let i = 0; i < effective.length; ) {
    const anchor = effective[i]!.amount;
    let j = i + 1;
    while (j < effective.length && Math.abs(effective[j]!.amount - anchor) <= CLUSTER_TOLERANCE) j++;
    const slice = effective.slice(i, j);
    clusters.push({
      amount: slice[Math.floor(slice.length / 2)]!.amount,
      // 그룹 안에서는 공대원 입력 순서를 지킵니다.
      names: slice
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((x) => memberLabel(x.name, x.note))
    });
    i = j;
  }

  for (const { amount, names } of clusters.sort((a, b) => b.amount - a.amount)) {
    if (lines.length) lines.push('');
    // 택배 금액은 *(...)* 로 흐리게 둡니다 — 기준은 어디까지나 굵게 찍은 분배금입니다.
    lines.push(`**${fmt(amount)} 메소** *(택배 ${fmt(mailSendAmount(amount))})* · ${names.length}명`);
    for (let i = 0; i < names.length; i += NAMES_PER_LINE) {
      lines.push(names.slice(i, i + NAMES_PER_LINE).join(' · '));
    }
  }
  return lines.join('\n').trimEnd();
}
