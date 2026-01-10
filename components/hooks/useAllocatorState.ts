'use client';

import { useEffect, useRef, useState } from 'react';

import type { AppState, TabsState } from '@/lib/types';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { deepClone, genId, newBlankState, todayYmd } from '@/lib/utils';

/**
 * 앱 전체 상태(탭 + 현재 state) 관리 훅
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

    // 탭 저장소가 비어있다면 최소 1개 보장
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

  // 저장 (state 변경 시 자동)
  useEffect(() => {
    if (!didInitRef.current) return;
    if (!tabs.activeId) return;
    if (!hydrated) return;
    try {
      saveToStorage(tabs, state);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tabs.activeId, hydrated]);

  // date/title 변경 시 탭 라벨 갱신
  useEffect(() => {
    if (!hydrated) return;
    if (!tabs.activeId) return;
    setTabs((prev) => ({
      ...prev,
      items: prev.items.map((t) => (t.id === prev.activeId ? { ...t, date: state.date, title: state.title } : t))
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.date, state.title, hydrated]);

  const switchTab = (id: string) => {
    if (id === tabs.activeId) return;
    const target = tabs.items.find((t) => t.id === id);
    if (!target) return;
    setTabs((prev) => ({ ...prev, activeId: id }));
    setState(deepClone(target.data));
  };

  const addNewTab = () => {
    const id = genId('tab');
    const data = deepClone(state);
    setTabs((prev) => ({ activeId: id, items: [...prev.items, { id, date: data.date, title: data.title, data }] }));
  };

  const addTabFromState = (data: AppState, opts?: { activate?: boolean }) => {
    const id = genId('tab');
    const cloned = deepClone(data);
    const activate = opts?.activate ?? true;
    setTabs((prev) => ({ activeId: activate ? id : prev.activeId, items: [...prev.items, { id, date: cloned.date, title: cloned.title, data: cloned }] }));
    if (activate) setState(cloned);
  };

  const removeActiveTab = () => {
    if (!confirm('현재 기록을 삭제할까요?')) return;
    setTabs((prev) => {
      const idx = prev.items.findIndex((t) => t.id === prev.activeId);
      if (idx < 0) return prev;
      const nextItems = prev.items.slice();
      nextItems.splice(idx, 1);
      if (nextItems.length === 0) {
        const s = newBlankState();
        const id = genId('tab');
        setState(s);
        return { activeId: id, items: [{ id, date: s.date, title: s.title, data: deepClone(s) }] };
      }
      const nextActive = nextItems[0]!;
      setState(deepClone(nextActive.data));
      return { activeId: nextActive.id, items: nextItems };
    });
  };

  const resetCurrent = () => {
    if (!confirm('모든 입력을 초기화할까요?')) return;
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
    addTabFromState,
    removeActiveTab,
    resetCurrent
  };
}

