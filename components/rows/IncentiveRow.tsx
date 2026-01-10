'use client';

import type { IncentiveItem, Member } from '@/lib/types';
import { fmt, parseMoneyInput } from '@/lib/utils';
import { DragHandle, useRowDnd } from '@/components/rows/dnd';

export function IncentiveRow({
  item,
  members,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: IncentiveItem;
  members: Member[];
  index: number;
  onChange: (next: IncentiveItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`incentive-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input type="text" value={item.label ?? ''} aria-label="인센티브 라벨" onChange={(e) => onChange({ ...item, label: e.target.value })} />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.amount || 0)))}
        aria-label="인센티브 금액"
        onChange={(e) => onChange({ ...item, amount: Math.max(0, parseMoneyInput(e.target.value)) })}
      />
      <select
        aria-label="인센티브 대상자"
        value={item.recipientId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange({ ...item, recipientId: undefined });
          else onChange({ ...item, recipientId: v });
        }}
      >
        <option value="">선택 안함</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <button className="btn" aria-label="인센티브 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

