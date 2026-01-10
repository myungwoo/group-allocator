import { TABS_KEY } from '@/lib/constants';
import type { AppState, PenaltyMode, TabsState } from '@/lib/types';
import { deepClone, genId, newBlankState } from '@/lib/utils';

function normalizePenaltyMode(v: unknown): PenaltyMode {
  return v === 'exclude-self' || v === 'include-self' || v === 'exclude-penalized' ? v : 'exclude-penalized';
}

function normalizeState(raw: unknown): AppState {
  const base = newBlankState();
  const obj = (raw ?? {}) as Record<string, unknown>;

  const membersRaw = Array.isArray(obj.members) ? (obj.members as unknown[]) : [];
  const members: AppState['members'] = membersRaw.map((m, idx) => {
    const mm = (m ?? {}) as Record<string, unknown>;
    return {
      id: typeof mm.id === 'string' && mm.id ? mm.id : genId('m'),
      name: typeof mm.name === 'string' ? mm.name : `공대원${idx + 1}`,
      exclude: !!mm.exclude,
      note: typeof mm.note === 'string' ? mm.note : ''
    };
  });

  const incomeRaw = Array.isArray(obj.incomeItems) ? (obj.incomeItems as unknown[]) : [];
  const incomeItems: AppState['incomeItems'] = incomeRaw.map((it, idx) => {
    const ii = (it ?? {}) as Record<string, unknown>;
    return {
      id: typeof ii.id === 'string' && ii.id ? ii.id : genId('income'),
      label: typeof ii.label === 'string' ? ii.label : `수입 ${idx + 1}`,
      gross: Number(ii.gross || 0),
      feeRate: Number(ii.feeRate || 0)
    };
  });

  const incentivesRaw = Array.isArray(obj.incentives) ? (obj.incentives as unknown[]) : [];
  const incentives: AppState['incentives'] = incentivesRaw.map((it, idx) => {
    const ii = (it ?? {}) as Record<string, unknown>;
    return {
      id: typeof ii.id === 'string' && ii.id ? ii.id : genId('inc'),
      label: typeof ii.label === 'string' ? ii.label : `인센 ${idx + 1}`,
      amount: Math.max(0, Math.floor(Number(ii.amount || 0))),
      recipientId: typeof ii.recipientId === 'string' && ii.recipientId ? ii.recipientId : undefined
    };
  });

  const penaltyRaw = Array.isArray(obj.penaltyItems) ? (obj.penaltyItems as unknown[]) : [];
  const penaltyItems: AppState['penaltyItems'] = penaltyRaw.map((it, idx) => {
    const pp = (it ?? {}) as Record<string, unknown>;
    return {
      id: typeof pp.id === 'string' && pp.id ? pp.id : genId('pen'),
      label: typeof pp.label === 'string' ? pp.label : `패널티 ${idx + 1}`,
      amount: Math.max(0, Math.floor(Number(pp.amount || 0))),
      payerId: typeof pp.payerId === 'string' && pp.payerId ? pp.payerId : undefined,
      mode: normalizePenaltyMode(pp.mode)
    };
  });

  return {
    date: typeof obj.date === 'string' ? obj.date : base.date,
    title: typeof obj.title === 'string' ? obj.title : '',
    memo: typeof obj.memo === 'string' ? obj.memo : '',
    members,
    incomeItems,
    incentives,
    penaltyItems
  };
}

export function loadFromStorage(): { tabs: TabsState; state: AppState } {
  // Next.js SSR에서는 localStorage가 없으니, 이 함수는 클라이언트에서만 호출해야 합니다.
  const rawTabs = localStorage.getItem(TABS_KEY);
  if (rawTabs) {
    try {
      const obj = JSON.parse(rawTabs) as TabsState;
      const tabs: TabsState =
        obj && Array.isArray(obj.items) ? { activeId: obj.activeId || '', items: obj.items } : { activeId: '', items: [] };
      const active = tabs.items.find((t) => t.id === tabs.activeId) ?? tabs.items[0];
      if (active) {
        tabs.activeId = active.id;
        return { tabs, state: normalizeState(active.data) };
      }
    } catch {
      // fallthrough
    }
  }

  // 레거시 데이터 승격/호환은 제거: 저장소가 없으면 그냥 빈 탭 1개로 시작합니다.
  const initState = newBlankState();
  const id = genId('tab');
  return {
    tabs: { activeId: id, items: [{ id, date: initState.date, title: initState.title, data: deepClone(initState) }] },
    state: initState
  };
}

export function saveToStorage(tabs: TabsState, state: AppState): void {
  // active tab의 data/date/title을 최신으로 반영한 뒤 저장합니다.
  const nextTabs: TabsState = {
    activeId: tabs.activeId,
    items: tabs.items.map((t) => {
      if (t.id !== tabs.activeId) return t;
      return { ...t, date: state.date, title: state.title, data: deepClone(state) };
    })
  };
  localStorage.setItem(TABS_KEY, JSON.stringify(nextTabs));
}

