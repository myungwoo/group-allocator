import type { AppState } from '@/lib/types';

export function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '0';
}

export function fmtOrBlank(n: number): string {
  return Number(n) === 0 ? '' : fmt(n);
}

export function clampInt(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0;
  const num = Math.floor(Number(v));
  return Number.isFinite(num) ? num : 0;
}

export function parseMoneyInput(value: string): number {
  const raw = String(value ?? '').replace(/[^\d]/g, '');
  if (!raw) return 0;
  return clampInt(raw);
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

