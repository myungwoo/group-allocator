'use client';

import type { Member, PenaltyItem, PenaltyMode } from '@/lib/types';
import { PENALTY_MODE_LABEL } from '@/lib/penalty';
import { Icon } from '@/components/ui/Icon';
import { MoneyInput } from '@/components/ui/NumberInputs';
import { DragHandle, useRowAutoFocus, useRowDnd } from '@/components/rows/dnd';

export function PenaltyRow({
  item,
  members,
  index,
  focused,
  onChange,
  onDelete,
  onMove,
  onEnter
}: {
  item: PenaltyItem;
  members: Member[];
  index: number;
  focused: boolean;
  onChange: (next: PenaltyItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
  onEnter?: () => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove, onDelete);
  const firstRef = useRowAutoFocus(focused);
  const unassigned = !item.payerId;

  return (
    <div className={`row row--penalty${over ? ' is-drag-over' : ''}`} {...rowProps}>
      <DragHandle index={index} />
      <input
        ref={firstRef}
        className="inp inp--label"
        type="text"
        value={item.label ?? ''}
        placeholder="라벨"
        aria-label="패널티 라벨"
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <MoneyInput
        value={item.amount}
        placeholder="금액"
        ariaLabel="패널티 금액"
        onChange={(amount) => onChange({ ...item, amount })}
        onEnter={onEnter}
      />
      <select
        className={`inp${unassigned ? ' is-warn' : ''}`}
        aria-label="패널티 지불자"
        value={item.payerId ?? ''}
        onChange={(e) => onChange({ ...item, payerId: e.target.value || undefined })}
      >
        <option value="">지불자 미지정</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <select
        className="inp"
        aria-label="패널티 분배 방식"
        value={item.mode}
        onChange={(e) => onChange({ ...item, mode: e.target.value as PenaltyMode })}
      >
        <option value="exclude-penalized">{PENALTY_MODE_LABEL['exclude-penalized']}</option>
        <option value="exclude-self">{PENALTY_MODE_LABEL['exclude-self']}</option>
        <option value="include-self">{PENALTY_MODE_LABEL['include-self']}</option>
      </select>
      <button className="icon-btn icon-btn--danger" aria-label="패널티 삭제" title="삭제" onClick={onDelete} type="button">
        <Icon name="trash" />
      </button>
    </div>
  );
}
