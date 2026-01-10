'use client';

import type { Member, PenaltyItem, PenaltyMode } from '@/lib/types';
import { fmt, parseMoneyInput } from '@/lib/utils';
import { DragHandle, useRowDnd } from '@/components/rows/dnd';

export function PenaltyRow({
  item,
  members,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: PenaltyItem;
  members: Member[];
  index: number;
  onChange: (next: PenaltyItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`penalty-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input
        type="text"
        value={item.label ?? ''}
        aria-label="패널티 라벨"
        style={{ flex: '1 1 100px', minWidth: 100 }}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.amount || 0)))}
        aria-label="패널티 금액"
        onChange={(e) => onChange({ ...item, amount: Math.max(0, parseMoneyInput(e.target.value)) })}
      />
      <select
        aria-label="패널티 지불자"
        style={{ width: 100 }}
        value={item.payerId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange({ ...item, payerId: undefined });
          else onChange({ ...item, payerId: v });
        }}
      >
        <option value="">선택 안함</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <select aria-label="분배 방식" value={item.mode} onChange={(e) => onChange({ ...item, mode: e.target.value as PenaltyMode })}>
        <option value="exclude-penalized">부과 인원 제외</option>
        <option value="exclude-self">본인 제외</option>
        <option value="include-self">본인 포함</option>
      </select>
      <button className="btn" aria-label="패널티 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

