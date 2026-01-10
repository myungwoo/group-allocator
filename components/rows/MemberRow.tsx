'use client';

import type { Member } from '@/lib/types';
import { DragHandle, useRowDnd } from '@/components/rows/dnd';

export function MemberRow({
  member,
  index,
  onChange,
  onDelete,
  onMove
}: {
  member: Member;
  index: number;
  onChange: (next: Member) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div
      className={`member-row${over ? ' drag-over' : ''}`}
      draggable={false}
      {...rowProps}
      onKeyDown={(e) => {
        if (e.key === 'Delete') onDelete();
      }}
    >
      <DragHandle index={index} />
      <input type="text" value={member.name ?? ''} aria-label="이름" onChange={(e) => onChange({ ...member, name: e.target.value })} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={!!member.exclude}
          aria-label="분배 제외"
          onChange={(e) => onChange({ ...member, exclude: e.target.checked })}
        />{' '}
        분배 제외
      </label>
      <input type="text" value={member.note ?? ''} aria-label="메모" onChange={(e) => onChange({ ...member, note: e.target.value })} />
      <button className="btn" aria-label="공대원 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

