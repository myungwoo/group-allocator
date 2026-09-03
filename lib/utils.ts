import type { AppState } from '@/lib/types';

/**
 * 금액 표시. `-0` 은 `0` 으로 씁니다.
 *
 * `(-0).toLocaleString()` 은 "-0" 을 냅니다. 패널티 합계가 `-패널티총액` 이라
 * 패널티가 없는 분배표의 TOTAL 줄에 "-0" 이 찍혔습니다.
 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return (n === 0 ? 0 : n).toLocaleString('ko-KR');
}

export function fmtOrBlank(n: number): string {
  return Number(n) === 0 ? '' : fmt(n);
}

export function clampInt(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0;
  const num = Math.floor(Number(v));
  return Number.isFinite(num) ? num : 0;
}

/**
 * 금액 입력 문자열 → 정수.
 *
 * `allowNegative` 는 수입 항목에만 씁니다. 공대 공동 비용을 음수 수입으로 넣기
 * 때문입니다.
 *
 * 부호는 **문자열 어디에 있든** 하나만 있으면 음수로 봅니다. 맨 앞만 보면
 * "-5,000,000" 에서 Home 을 누르고 숫자를 치는 순간(캐럿이 `-` 앞에 섭니다)
 * "1-5,000,000" 이 되어 부호가 조용히 날아갑니다 — 실제로 그렇게 +15,000,000 이
 * 되는 것을 확인했습니다. 금액 칸에 `-` 가 들어오는 경로는 사용자가 직접 치는
 * 것뿐이니, 위치를 따지지 않는 편이 잃어버리지 않아 안전합니다.
 */
export function parseMoneyInput(value: string, allowNegative = false): number {
  const text = String(value ?? '');
  const negative = allowNegative && text.includes('-');
  const raw = text.replace(/[^\d]/g, '');
  if (!raw) return 0;
  const num = clampInt(raw);
  return negative ? -num : num;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return '';
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}. ${mm}. ${dd}`;
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 파일명 세그먼트(확장자/경로 제외)를 안전하게 만드는 escape
 * - 공백류는 '-'로 변환
 * - Windows에서 금지되는 문자 제거: \ / : * ? " < > |
 * - 제어문자 제거
 * - 끝의 '.'/공백 제거(Windows 호환)
 */
export function escapeFilenameSegment(input: string): string {
  let s = String(input ?? '').trim();
  if (!s) return '';
  try {
    s = s.normalize('NFKC');
  } catch {
    // ignore (old environments)
  }
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[\\/:*?"<>|]/g, '');
  s = s.replace(/[\u0000-\u001f\u007f]/g, '');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^[.\s-]+/, '');
  s = s.replace(/[.\s-]+$/, '');
  if (!s || s === '.' || s === '..') return '';
  return s.slice(0, 80);
}

export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function newBlankState(): AppState {
  return {
    date: todayYmd(),
    title: '',
    incentives: [],
    penaltyItems: [],
    incomeItems: [],
    members: [],
    memo: ''
  };
}

export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return items;
  if (from < 0 || from >= items.length) return items;
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

