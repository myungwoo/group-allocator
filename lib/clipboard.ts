import type { AppState } from '@/lib/types';
import { compute } from '@/lib/compute';
import { fmt } from '@/lib/utils';

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

// 금액을 표현할 때, 5,000,000 미만의 가장 큰 가격을 좌항에 두고
// 우항은 내림한 곱(product)으로 표시
function choosePreferredPrice(amount: number, threshold: number) {
  const maxAllowed = Math.floor(threshold) - 1; // 4,999,999
  const ensureInt = (x: number) => Math.max(1, Math.floor(x));

  if (amount <= maxAllowed) {
    const price = ensureInt(amount);
    return { price, count: 1, product: price };
  }
  const k = Math.max(2, Math.ceil(amount / maxAllowed));
  const price = ensureInt(amount / k);
  const count = k;
  return { price, count, product: price * count };
}

export function createDistributionClipboardText(state: AppState): string {
  const result = compute(state);
  if ('error' in result) return `**${formatDateClipboard(state.date)}**`;

  const rows = result.rows || [];
  const effective = rows
    .map((r, idx) => ({
      name: r.name,
      note: r.note,
      amount: Math.floor(Number(r.final) || 0),
      order: idx
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.amount - b.amount);

  // 거의 같은 금액(±100)끼리 클러스터링하여 대표 금액으로 묶기
  const TOL = 100;
  const clusters: Array<[number, string[]]> = [];
  for (let i = 0; i < effective.length; ) {
    const start = i;
    const anchor = effective[i]!.amount;
    let j = i + 1;
    while (j < effective.length && Math.abs(effective[j]!.amount - anchor) <= TOL) j++;
    const slice = effective.slice(start, j);
    const medianIdx = Math.floor(slice.length / 2);
    const representative = slice[medianIdx]!.amount;
    const names = slice
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((x) => {
        const nm = x.name || '';
        const note = (x.note || '').trim();
        return note ? `${nm}(${note})` : nm;
      });
    clusters.push([representative, names]);
    i = j;
  }

  // 대표 금액 내림차순 정렬
  const groups = clusters.sort((a, b) => b[0] - a[0]);
  const lines: string[] = [];
  lines.push(`**${formatDateClipboard(state.date)}**`);

  for (const [amount, names] of groups) {
    const { price, count, product } = choosePreferredPrice(amount, 5_000_000);
    lines.push(`${fmt(price)} * ${count} = ${fmt(product)}`);
    for (let i = 0; i < names.length; i += 4) {
      lines.push(names.slice(i, i + 4).join(' '));
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

