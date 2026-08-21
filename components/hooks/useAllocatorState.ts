'use client';

import { useEffect, useRef, useState } from 'react';

import type { AppState, TabsState } from '@/lib/types';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { deepClone, formatDate, genId, newBlankState, todayYmd } from '@/lib/utils';

function labelOf(t: { date: string; title: string }): string {
  return `${formatDate(t.date) || '날짜 없음'} ${t.title || ''}`.trim() || '새 기록';
}

/**
 * 앱 전체 상태(기록 목록 + 현재 기록) 관리 훅
 * - localStorage I/O가 있어 **클라이언트에서만** 사용해야 합니다.
 */
export function useAllocatorState() {
  const [hydrated, setHydrated] = useState(false);
  const [tabs, setTabs] = useState<TabsState>({ activeId: '', items: [] });
  const [state, setState] = useState<AppState>(() => newBlankState());
  const didInitRef = useRef(false);

  // 초기 로드 (클라이언트에서만)
  useEffect(() => {
    const { tabs: loadedTabs, state: loadedState } = loadFromStorage();

    // 기록 저장소가 비어있다면 최소 1개 보장
    if (!loadedTabs.items.length) {
      const id = genId('tab');
      const s = loadedState.date ? loadedState : { ...loadedState, date: todayYmd() };
      setTabs({ activeId: id, items: [{ id, date: s.date, title: s.title, data: deepClone(s) }] });
      setState(s);
    } else {
      setTabs(loadedTabs);
      setState(loadedState.date ? loadedState : { ...loadedState, date: todayYmd() });
    }

    setHydrated(true);
    didInitRef.current = true;
  }, []);

  // 저장 (기록 목록/현재 기록이 바뀔 때마다)
  //
  // tabs 전체를 의존성에 넣습니다. activeId 만 보면 "지금 보고 있지 않은 기록을
  // 삭제"했을 때 저장이 안 되어, 새로고침하면 지운 기록이 되살아납니다.
  useEffect(() => {
    if (!didInitRef.current) return;
    if (!tabs.activeId) return;
    if (!hydrated) return;
    try {
      saveToStorage(tabs, state);
    } catch {
      // ignore
    }
  }, [state, tabs, hydrated]);

  // date/title 변경 시 기록 라벨 갱신.
  // 이미 같은 값이면 prev 를 그대로 돌려줍니다 — 안 그러면 기록을 옮길 때마다 쓸데없이
  // 다시 그려지고 저장까지 한 번 더 돕니다.
  useEffect(() => {
    if (!hydrated) return;
    if (!tabs.activeId) return;
    setTabs((prev) => {
      const active = prev.items.find((t) => t.id === prev.activeId);
      if (!active || (active.date === state.date && active.title === state.title)) return prev;
      return {
        ...prev,
        items: prev.items.map((t) => (t.id === prev.activeId ? { ...t, date: state.date, title: state.title } : t))
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.date, state.title, hydrated]);

  const switchTab = (id: string) => {
    if (id === tabs.activeId) return;
    const target = tabs.items.find((t) => t.id === id);
    if (!target) return;
    setTabs((prev) => ({ ...prev, activeId: id }));
    setState(deepClone(target.data));
  };

  /** 오늘 날짜의 빈 기록. 공대원 명단만 지금 기록에서 물려받습니다. */
  const addNewTab = () => {
    const id = genId('tab');
    const data: AppState = { ...newBlankState(), date: todayYmd(), members: deepClone(state.members) };
    setTabs((prev) => ({ activeId: id, items: [...prev.items, { id, date: data.date, title: data.title, data }] }));
    setState(data);
  };

  /** 지금 기록을 그대로 복사합니다. */
  const duplicateTab = () => {
    const id = genId('tab');
    const data = deepClone(state);
    setTabs((prev) => ({ activeId: id, items: [...prev.items, { id, date: data.date, title: data.title, data }] }));
    setState(data);
  };

  const addTabFromState = (data: AppState, opts?: { activate?: boolean }) => {
    const id = genId('tab');
    const cloned = deepClone(data);
    const activate = opts?.activate ?? true;
    setTabs((prev) => ({
      activeId: activate ? id : prev.activeId,
      items: [...prev.items, { id, date: cloned.date, title: cloned.title, data: cloned }]
    }));
    if (activate) setState(cloned);
  };

  /** 기록 삭제. 보고 있지 않은 기록도 지울 수 있습니다. */
  const removeTab = (id: string) => {
    const idx = tabs.items.findIndex((t) => t.id === id);
    if (idx < 0) return;
    if (!confirm(`'${labelOf(tabs.items[idx]!)}' 기록을 삭제할까요?`)) return;

    const nextItems = tabs.items.slice();
    nextItems.splice(idx, 1);

    if (!nextItems.length) {
      const blank = newBlankState();
      const newId = genId('tab');
      setTabs({ activeId: newId, items: [{ id: newId, date: blank.date, title: blank.title, data: deepClone(blank) }] });
      setState(blank);
      return;
    }

    if (id !== tabs.activeId) {
      setTabs({ activeId: tabs.activeId, items: nextItems });
      return;
    }

    // 지운 자리에 있던 기록으로 옮겨 갑니다(마지막이었으면 그 앞).
    const nextActive = nextItems[Math.min(idx, nextItems.length - 1)]!;
    setTabs({ activeId: nextActive.id, items: nextItems });
    setState(deepClone(nextActive.data));
  };

  const resetCurrent = () => {
    if (!confirm('지금 기록의 모든 입력을 비울까요?')) return;
    setState(newBlankState());
  };

  return {
    hydrated,
    tabs,
    setTabs,
    state,
    setState,
    switchTab,
    addNewTab,
    duplicateTab,
    addTabFromState,
    removeTab,
    resetCurrent
  };
}
