'use client';

import type { IncomeItem } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { MoneyInput, PercentInput } from '@/components/ui/NumberInputs';
import { DragHandle, useRowAutoFocus, useRowDnd } from '@/components/rows/dnd';

export function IncomeRow({
  item,
  index,
  focused,
  onChange,
  onDelete,
  onMove,
  onEnter
}: {
  item: IncomeItem;
  index: number;
  focused: boolean;
  onChange: (next: IncomeItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
  onEnter?: () => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove, onDelete);
  const firstRef = useRowAutoFocus(focused);
  // 음수 = 공대 분담 비용. 수수료율은 뜻이 없어서 잠급니다(값은 지우지 않습니다).
  const isCost = Number(item.gross || 0) < 0;

  return (
    <div className={`row row--income${over ? ' is-drag-over' : ''}`} {...rowProps}>
      <DragHandle index={index} />
      <input
        ref={firstRef}
        className="inp inp--label"
        type="text"
        value={item.label ?? ''}
        placeholder="라벨(선택)"
        aria-label="수입 라벨"
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <MoneyInput
        value={item.gross}
        placeholder="전체금액"
        ariaLabel="전체금액"
        allowNegative
        onChange={(gross) => onChange({ ...item, gross })}
        onEnter={onEnter}
      />
      <PercentInput
        value={Number(item.feeRate || 0)}
        ariaLabel="수수료율(%)"
        disabled={isCost}
        title={isCost ? '비용(음수) 항목에는 수수료가 붙지 않습니다.' : undefined}
        onChange={(feeRate) => onChange({ ...item, feeRate })}
        onEnter={onEnter}
      />
      <button className="icon-btn icon-btn--danger" aria-label="수입 항목 삭제" title="삭제" onClick={onDelete} type="button">
        <Icon name="trash" />
      </button>
    </div>
  );
}
