'use client';

import type { TabsState } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function tabLabel(t: { date: string; title: string }) {
  const lbl = `${formatDate(t.date) || '무제'} ${t.title || ''}`.trim();
  return lbl || '새 기록';
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
  return (
    <div className="tabbar" id="tabbar">
      <div className="tabs-scroll" id="tabs-scroll">
        <div className="tabs" id="tabs">
          {tabs.items.map((t) => (
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
        </div>
      </div>
      <button className="btn" id="btn-add-tab" aria-label="새 기록 추가" onClick={onAdd} type="button">
        + 새 기록
      </button>
      <button className="btn danger" id="btn-remove-tab" aria-label="현재 기록 삭제" onClick={onRemove} type="button">
        🗑️
      </button>
    </div>
  );
}

