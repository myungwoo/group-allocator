'use client';

import type { Member } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { DragHandle, useRowAutoFocus, useRowDnd } from '@/components/rows/dnd';

export function MemberRow({
  member,
  index,
  focused,
  onChange,
  onDelete,
  onMove,
  onEnter
}: {
  member: Member;
  index: number;
  focused: boolean;
  onChange: (next: Member) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
  onEnter?: () => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove, onDelete);
  const firstRef = useRowAutoFocus(focused);

  const onKeyDownEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !onEnter) return;
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;
    e.preventDefault();
    onEnter();
  };

  return (
    <div className={`row row--member${member.exclude ? ' is-muted' : ''}${over ? ' is-drag-over' : ''}`} {...rowProps}>
      <DragHandle index={index} />
      <input
        ref={firstRef}
        className="inp inp--label"
        type="text"
        value={member.name ?? ''}
        placeholder={`공대원${index + 1}`}
        aria-label="이름"
        onChange={(e) => onChange({ ...member, name: e.target.value })}
        onKeyDown={onKeyDownEnter}
      />
      <input
        className="inp"
        type="text"
        value={member.note ?? ''}
        placeholder="메모(선택)"
        aria-label="메모"
        onChange={(e) => onChange({ ...member, note: e.target.value })}
        onKeyDown={onKeyDownEnter}
      />
      <label className="row-check">
        <input
          type="checkbox"
          checked={!!member.exclude}
          aria-label="분배 제외"
          onChange={(e) => onChange({ ...member, exclude: e.target.checked })}
        />
        <span className="row-check-text">분배 제외</span>
      </label>
      <button className="icon-btn icon-btn--danger" aria-label="공대원 삭제" title="삭제" onClick={onDelete} type="button">
        <Icon name="trash" />
      </button>
    </div>
  );
}
