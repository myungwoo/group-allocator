'use client';

import { useMemo } from 'react';

import type { AppState } from '@/lib/types';
import { reorder } from '@/lib/utils';

type ListKey = 'incomeItems' | 'incentives' | 'penaltyItems' | 'members';
type ItemOf<K extends ListKey> = AppState[K][number];

export type ListOps<K extends ListKey> = {
  update: (next: ItemOf<K>) => void;
  remove: (id: string) => void;
  move: (from: number, to: number) => void;
  append: (item: ItemOf<K>) => void;
};

/**
 * AppState 안의 리스트 하나를 다루는 조작 묶음.
 *
 * 네 리스트(수입/인센티브/패널티/공대원)가 똑같은 update/remove/move/append 를 각자
 * 인라인으로 갖고 있어서 한곳으로 모았습니다. 순서 이동은 범위를 검사하는
 * `reorder` 를 씁니다.
 */
export function useListOps<K extends ListKey>(
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  key: K
): ListOps<K> {
  return useMemo(() => {
    const put = (mutate: (items: ItemOf<K>[]) => ItemOf<K>[]) =>
      setState((s) => ({ ...s, [key]: mutate(s[key] as ItemOf<K>[]) }) as AppState);

    return {
      update: (next) => put((items) => items.map((x) => (x.id === next.id ? next : x))),
      remove: (id) => put((items) => items.filter((x) => x.id !== id)),
      move: (from, to) => put((items) => reorder(items, from, to)),
      append: (item) => put((items) => [...items, item])
    };
  }, [setState, key]);
}
