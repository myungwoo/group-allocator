'use client';

import type { IncentiveItem, Member } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { MoneyInput } from '@/components/ui/NumberInputs';
import { DragHandle, useRowAutoFocus, useRowDnd } from '@/components/rows/dnd';

export function IncentiveRow({
  item,
  members,
  index,
  focused,
  onChange,
  onDelete,
  onMove,
  onEnter
}: {
  item: IncentiveItem;
  members: Member[];
  index: number;
  focused: boolean;
  onChange: (next: IncentiveItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
  onEnter?: () => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove, onDelete);
  const firstRef = useRowAutoFocus(focused);
  const unassigned = !item.recipientId;

  return (
    <div className={`row row--incentive${over ? ' is-drag-over' : ''}`} {...rowProps}>
      <DragHandle index={index} />
      <input
        ref={firstRef}
        className="inp inp--label"
        type="text"
        value={item.label ?? ''}
        placeholder="라벨"
        aria-label="인센티브 라벨"
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <MoneyInput
        value={item.amount}
        placeholder="금액"
        ariaLabel="인센티브 금액"
        onChange={(amount) => onChange({ ...item, amount })}
        onEnter={onEnter}
      />
      <select
        className={`inp${unassigned ? ' is-warn' : ''}`}
        aria-label="인센티브 대상자"
        value={item.recipientId ?? ''}
        onChange={(e) => onChange({ ...item, recipientId: e.target.value || undefined })}
      >
        <option value="">대상자 미지정</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <button className="icon-btn icon-btn--danger" aria-label="인센티브 삭제" title="삭제" onClick={onDelete} type="button">
        <Icon name="trash" />
      </button>
    </div>
  );
}
