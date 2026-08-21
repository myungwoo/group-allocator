'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { compute } from '@/lib/compute';
import type { TabItem, TabsState } from '@/lib/types';
import { fmt, formatDate } from '@/lib/utils';

import { Icon } from '@/components/ui/Icon';

/** 기록 바에 한 번에 보여 주는 기록 수. 나머지는 전체 목록에서 고릅니다. */
const STRIP_SIZE = 4;

function recordLabel(t: { date: string; title: string }) {
  return `${formatDate(t.date) || '날짜 없음'} ${t.title || ''}`.trim() || '새 기록';
}

/** 기록 바에서는 연도를 생략합니다. 올해가 아닌 기록만 두 자리 연도를 붙입니다. */
function shortDate(date: string, thisYear: number) {
  const [y, m, d] = String(date || '').split('-');
  if (!y || !m || !d) return '날짜 없음';
  const md = `${m}. ${d}`;
  return Number(y) === thisYear ? md : `${y.slice(2)}. ${md}`;
}

function normalizeSearch(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDigits(s: string): string {
  return String(s ?? '').replace(/[^\d]/g, '');
}

/** 날짜 내림차순, 같으면 제목순. 기록 바 위치가 클릭할 때마다 흔들리지 않게 고정된 기준입니다. */
function byDateDesc(a: TabItem, b: TabItem) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (a.title || '').localeCompare(b.title || '', 'ko');
}

/** 전체 목록에 뿌릴 요약. 계산기와 같은 결과를 쓰려고 compute 를 그대로 부릅니다. */
function recordSummary(t: TabItem): string[] {
  const result = compute(t.data);
  if ('error' in result) return [];
  const { meta } = result;
  return [
    `분배 ${meta.includedCount}명`,
    `수입 ${fmt(meta.netIncome)}`,
    `인당 ${fmt(meta.basePerFloor)}`
  ];
}

export function TabsBar({
  tabs,
  onSwitch,
  onAdd,
  onDuplicate,
  onRemove
}: {
  tabs: TabsState;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: (id: string) => void;
}) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // 모달을 닫을 때 포커스를 돌려 줄 곳. 여는 경로가 여러 개라(+N 칩 / 전체 버튼 / ⌘K)
  // 특정 버튼을 기억하지 않고 열던 순간의 포커스를 씁니다.
  const triggerRef = useRef<HTMLElement | null>(null);
  const thisYear = new Date().getFullYear();

  const openPicker = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setCursor(0);
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    triggerRef.current?.focus();
  }, []);

  const strip = useMemo(() => {
    const sorted = tabs.items.slice().sort(byDateDesc);
    const picked = sorted.slice(0, STRIP_SIZE);
    // 활성 기록이 최근 목록에서 밀려났으면 마지막 자리를 내주고 다시 정렬합니다.
    if (tabs.activeId && !picked.some((t) => t.id === tabs.activeId)) {
      const active = tabs.items.find((t) => t.id === tabs.activeId);
      if (active) {
        picked[picked.length - 1] = active;
        picked.sort(byDateDesc);
      }
    }
    return picked;
  }, [tabs.activeId, tabs.items]);

  // 띠에 못 들어간 기록 수. 0 이면 지금 보이는 게 전부입니다.
  const hiddenCount = tabs.items.length - strip.length;

  const filtered = useMemo(() => {
    const items = tabs.items.slice().sort(byDateDesc);
    const q = normalizeSearch(query);
    const qDigits = normalizeDigits(query);
    if (!q && !qDigits) return items;

    return items.filter((t) => {
      const dateRaw = String(t.date || '');
      const dateFmt = formatDate(t.date);
      if (q && normalizeSearch([t.title, dateRaw, dateFmt].join(' ')).includes(q)) return true;
      if (qDigits) {
        return normalizeDigits(dateRaw).includes(qDigits) || normalizeDigits(dateFmt).includes(qDigits);
      }
      return false;
    });
  }, [query, tabs.items]);

  const pick = useCallback(
    (id: string) => {
      onSwitch(id);
      setPickerOpen(false);
    },
    [onSwitch]
  );

  // 어디서나 Cmd/Ctrl+K 로 전체 목록을 엽니다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (!isPickerOpen) openPicker();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPickerOpen, openPicker]);

  useEffect(() => {
    if (!isPickerOpen) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    // 모달이 떠 있는 동안 뒤 페이지가 따라 스크롤되지 않게 합니다.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [isPickerOpen]);

  // 커서가 목록 밖으로 나가지 않게 하고, 보이는 곳으로 스크롤합니다.
  useEffect(() => {
    if (!isPickerOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, isPickerOpen, filtered.length]);

  const onPickerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!filtered.length) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setCursor((c) => (c + delta + filtered.length) % filtered.length);
      return;
    }
    if (e.key === 'Enter') {
      if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;
      const target = filtered[cursor];
      if (target) {
        e.preventDefault();
        pick(target.id);
      }
    }
  };

  return (
    <div className="recordbar">
      <div className="recordbar-strip" role="tablist" aria-label="최근 기록">
        {strip.map((t) => {
          const active = t.id === tabs.activeId;
          return (
            <div key={t.id} className={`rec${active ? ' is-active' : ''}`}>
              <button
                className="rec-main"
                role="tab"
                aria-selected={active}
                title={recordLabel(t)}
                onClick={() => onSwitch(t.id)}
                type="button"
              >
                <span className="rec-date">{shortDate(t.date, thisYear)}</span>
                <span className="rec-title">{t.title || '무제'}</span>
              </button>
              <button
                className="rec-close"
                aria-label={`${recordLabel(t)} 기록 삭제`}
                title="이 기록 삭제"
                onClick={() => onRemove(t.id)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
          );
        })}
        {hiddenCount > 0 ? (
          <button
            className="rec-more"
            type="button"
            onClick={openPicker}
            aria-label={`기록 ${hiddenCount}개 더 보기`}
            title={`기록 ${hiddenCount}개가 더 있습니다. 전체에서 찾기 (⌘K / Ctrl+K)`}
          >
            +{hiddenCount}
          </button>
        ) : null}
      </div>

      <div className="recordbar-actions">
        <button
          className="btn"
          aria-haspopup="dialog"
          aria-expanded={isPickerOpen}
          onClick={openPicker}
          type="button"
          title="전체 기록에서 찾기 (⌘K / Ctrl+K)"
        >
          <Icon name="search" />
          전체 {tabs.items.length}
        </button>
        <button className="btn" onClick={onDuplicate} type="button" title="지금 기록을 그대로 복사합니다.">
          <Icon name="copy" />
          복제
        </button>
        <button className="btn btn--primary" onClick={onAdd} type="button" title="오늘 날짜의 빈 기록. 공대원 명단은 이어서 씁니다.">
          <Icon name="plus" />
          새 기록
        </button>
      </div>

      {isPickerOpen ? (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePicker();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label="기록 찾기" onKeyDown={onPickerKeyDown}>
            <div className="modal-search">
              <Icon name="search" />
              <input
                ref={searchRef}
                className="inp"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                placeholder="날짜(2026-01-09 / 20260109) 또는 제목으로 찾기"
                aria-label="기록 검색"
              />
              <button className="icon-btn" onClick={closePicker} type="button" aria-label="닫기" title="닫기 (Esc)">
                <Icon name="close" />
              </button>
            </div>

            <div className="modal-list" ref={listRef}>
              {filtered.length ? (
                filtered.map((t, idx) => {
                  const summary = recordSummary(t);
                  return (
                    <div
                      key={t.id}
                      data-idx={idx}
                      className={`rec-item${t.id === tabs.activeId ? ' is-active' : ''}${idx === cursor ? ' is-cursor' : ''}`}
                    >
                      <button className="rec-item-main" type="button" onClick={() => pick(t.id)} onMouseEnter={() => setCursor(idx)}>
                        <span className="rec-item-title">{recordLabel(t)}</span>
                        <span className="rec-item-meta">
                          {summary.length ? (
                            summary.map((s) => (
                              <span key={s} className="chip chip--plain">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="chip chip--warn">계산 전</span>
                          )}
                        </span>
                      </button>
                      <button
                        className="icon-btn icon-btn--danger"
                        type="button"
                        aria-label={`${recordLabel(t)} 기록 삭제`}
                        title="이 기록 삭제"
                        onClick={() => onRemove(t.id)}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="modal-empty">찾는 기록이 없습니다.</p>
              )}
            </div>

            <div className="modal-foot">
              <span className="modal-hint">
                {query ? `${filtered.length} / ${tabs.items.length}개` : `${tabs.items.length}개`} · ↑↓ 이동 · Enter 열기
                · Esc 닫기
              </span>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  onAdd();
                  setPickerOpen(false);
                }}
              >
                <Icon name="plus" />
                새 기록
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
