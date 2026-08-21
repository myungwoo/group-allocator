'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastTone = 'ok' | 'error';
export type ToastMessage = { text: string; tone: ToastTone };

/**
 * 작업 결과를 알려 주는 짧은 알림.
 *
 * 복사/내려받기가 조용히 끝나거나 조용히 실패하면 사용자는 눌린 건지 알 수 없습니다.
 * alert() 대신 쓰는 이유는 흐름을 끊지 않기 때문입니다.
 */
export function useToast(durationMs = 2400) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback(
    (text: string, tone: ToastTone = 'ok') => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setMessage({ text, tone });
      timerRef.current = window.setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { message, show };
}

export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    <div className="toast-layer" role="status" aria-live="polite">
      {message ? <div className={`toast toast--${message.tone}`}>{message.text}</div> : null}
    </div>
  );
}
