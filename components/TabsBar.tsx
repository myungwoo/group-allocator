'use client';

import type { TabsState } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

function tabLabel(t: { date: string; title: string }) {
  const lbl = `${formatDate(t.date) || '무제'} ${t.title || ''}`.trim();
  return lbl || '새 기록';
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

export function TabsBar({
  tabs,
  onSwitch,
  onAdd,
  onRemove
}: {
  tabs: TabsState;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  const pinnedTabs = useMemo(() => {
    const items = tabs.items;
    if (!items.length) return [];
    const mru = items.slice().reverse(); // 최근 사용/추가가 뒤로 간다고 가정
    const pickedIds: string[] = [];
    if (tabs.activeId) pickedIds.push(tabs.activeId);
    for (const t of mru) {
      if (pickedIds.length >= 3) break;
      if (!pickedIds.includes(t.id)) pickedIds.push(t.id);
    }
    return pickedIds.map((id) => items.find((t) => t.id === id)).filter(Boolean) as typeof items;
  }, [tabs.activeId, tabs.items]);

  const { filteredItems, filteredCountLabel } = useMemo(() => {
    const q = normalizeSearch(query);
    const qDigits = normalizeDigits(query);
    const items = tabs.items.slice().reverse(); // 최근 사용이 위로 오게
    if (!q && !qDigits) return { filteredItems: items, filteredCountLabel: `${items.length}개` };

    const next = items.filter((t) => {
      const title = normalizeSearch(t.title);
      const dateRaw = String(t.date || '');
      const dateFmt = normalizeSearch(formatDate(t.date));
      const hay = normalizeSearch([title, dateRaw, dateFmt].join(' '));
      if (q && hay.includes(q)) return true;
      if (qDigits) {
        const d = normalizeDigits(dateRaw);
        const df = normalizeDigits(dateFmt);
        return d.includes(qDigits) || df.includes(qDigits);
      }
      return false;
    });
    return { filteredItems: next, filteredCountLabel: `${next.length}개` };
  }, [query, tabs.items]);

  useEffect(() => {
    if (!isMoreOpen) return;
    // 모달 열릴 때 검색창 포커스
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMoreOpen]);

  const hasOverflow = tabs.items.length > pinnedTabs.length;

  return (
    <div className="tabbar" id="tabbar">
      <div className="tabs-scroll" id="tabs-scroll">
        <div className="tabs" id="tabs">
          {pinnedTabs.map((t) => (
            <button
              key={t.id}
              className={`tab${t.id === tabs.activeId ? ' active' : ''}`}
              title={tabLabel(t)}
              onClick={() => onSwitch(t.id)}
              type="button"
            >
              {tabLabel(t)}
            </button>
          ))}
          {hasOverflow ? (
            <button
              className="tab"
              id="btn-more-tabs"
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen(true)}
              type="button"
              title="기록 더보기"
            >
              더보기…
            </button>
          ) : null}
        </div>
      </div>
      <button className="btn" id="btn-add-tab" aria-label="새 기록 추가" onClick={onAdd} type="button">
        + 새 기록
      </button>
      <button className="btn danger" id="btn-remove-tab" aria-label="현재 기록 삭제" onClick={onRemove} type="button">
        🗑️
      </button>

      {isMoreOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="기록 선택"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsMoreOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                기록 선택 <span className="modal-sub">{filteredCountLabel}</span>
              </div>
              <button className="btn" type="button" onClick={() => setIsMoreOpen(false)} aria-label="닫기">
                닫기
              </button>
            </div>

            <div className="modal-body">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="날짜(예: 2026-01-09 / 20260109) 또는 제목 검색"
                aria-label="기록 검색"
              />

              <div className="modal-list" role="list">
                {filteredItems.length ? (
                  filteredItems.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`modal-item${t.id === tabs.activeId ? ' active' : ''}`}
                      onClick={() => {
                        onSwitch(t.id);
                        setIsMoreOpen(false);
                      }}
                      title={tabLabel(t)}
                    >
                      <div className="modal-item-title">{tabLabel(t)}</div>
                      <div className="modal-item-meta">{t.date || ''}</div>
                    </button>
                  ))
                ) : (
                  <div className="modal-empty">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

