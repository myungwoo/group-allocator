'use client';

import { useState } from 'react';

export function DragHandle({ index }: { index: number }) {
  return (
    <span
      className="drag-handle"
      aria-label="순서 이동"
      title="순서 이동"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
      }}
    />
  );
}

export function useRowDnd(index: number, onMove: (from: number, to: number) => void) {
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
      }
    }
  };
}

