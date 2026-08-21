'use client';

import { useEffect, useRef, useState } from 'react';

export function DragHandle({ index }: { index: number }) {
  return (
    <span
      className="drag-handle"
      aria-hidden="true"
      title="드래그해서 순서 이동 (Alt+↑/↓ 로도 가능)"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
      }}
    />
  );
}

function isFormField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName);
}

/**
 * 행 하나의 드래그 정렬 + 키보드 조작.
 *
 * Delete 는 입력칸 밖에서만 받습니다. 예전에는 행 전체에 걸려 있어서 이름을 고치다가
 * Delete 를 누르면 행이 통째로 사라졌습니다.
 */
export function useRowDnd(index: number, onMove: (from: number, to: number) => void, onDelete?: () => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    rowProps: {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        const from = Number(e.dataTransfer.getData('text/plain'));
        const to = index;
        if (!Number.isFinite(from) || from === to) return;
        onMove(from, to);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          onMove(index, e.key === 'ArrowUp' ? index - 1 : index + 1);
          return;
        }
        if (e.key === 'Delete' && onDelete && !isFormField(e.target)) {
          e.preventDefault();
          onDelete();
        }
      }
    }
  };
}

/**
 * 방금 추가한 행의 첫 칸으로 포커스를 옮깁니다.
 * (행을 추가하면 바로 타이핑할 수 있어야 하니까요.)
 */
export function useRowAutoFocus(active: boolean) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
