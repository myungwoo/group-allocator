'use client';

import type { IncomeItem } from '@/lib/types';
import { fmt, parseMoneyInput } from '@/lib/utils';
import { DragHandle, useRowDnd } from '@/components/rows/dnd';

export function IncomeRow({
  item,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: IncomeItem;
  index: number;
  onChange: (next: IncomeItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`income-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input type="text" value={item.label ?? ''} aria-label="수입 라벨" onChange={(e) => onChange({ ...item, label: e.target.value })} />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.gross || 0)))}
        aria-label="전체금액"
        onChange={(e) => onChange({ ...item, gross: parseMoneyInput(e.target.value) })}
      />
      <input
        type="number"
        min={0}
        step={0.01}
        inputMode="decimal"
        value={Number(item.feeRate || 0)}
        aria-label="수수료율"
        onChange={(e) => onChange({ ...item, feeRate: Number(e.target.value || 0) })}
      />
      <button className="btn" aria-label="수입 항목 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

