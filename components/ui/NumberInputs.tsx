'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { fmt, parseMoneyInput } from '@/lib/utils';

type MoneyInputProps = {
  value: number;
  onChange: (next: number) => void;
  placeholder?: string;
  ariaLabel: string;
  onEnter?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** 음수 허용. 수입 항목(공대 공동 비용)만 켭니다 — 인센티브·패널티는 음수가 들어오면 안 됩니다. */
  allowNegative?: boolean;
};

/**
 * 금액 입력. 세 자리 콤마를 붙여 보여주고 숫자만 돌려줍니다.
 *
 * 두 가지를 신경 씁니다.
 * - 0 은 빈 칸으로 보여줍니다. "0"이 박혀 있으면 매번 지우고 써야 합니다.
 * - 콤마가 다시 붙어도 캐럿을 원래 자리에 돌려놓습니다. 그냥 두면 숫자 중간을
 *   고칠 때마다 캐럿이 맨 뒤로 튑니다.
 *
 * 캐럿은 "앞에 있는 숫자 개수"로 기억하므로 맨 앞 `-` 는 세지 않습니다. 부호만
 * 남은 "-" 상태에서는 값이 0 이라 표시가 빈 칸이 되는데, 그러면 방금 친 `-` 가
 * 사라져 음수를 아예 못 칩니다. 그래서 그 순간의 부호를 draft 로 붙들어 둡니다.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  onEnter,
  inputRef,
  allowNegative = false
}: MoneyInputProps) {
  const localRef = useRef<HTMLInputElement | null>(null);
  // 값이 0 인데 사용자가 '-' 만 쳐 둔 상태를 기억합니다(포커스가 빠지면 버립니다).
  const [minusDraft, setMinusDraft] = useState(false);
  // 값이 다시 그려진 뒤에 캐럿을 되돌리기 위해 "캐럿 앞 숫자 개수"를 적어 둡니다.
  const caretDigitsRef = useRef<number | null>(null);

  // rAF 가 아니라 layout effect 인 이유: rAF 는 React 가 input.value 를 다시 쓰기 전에
  // 돌 수 있고, 그러면 방금 맞춰 놓은 캐럿이 맨 뒤로 밀립니다.
  useLayoutEffect(() => {
    const el = localRef.current;
    const digits = caretDigitsRef.current;
    caretDigitsRef.current = null;
    if (!el || digits === null || document.activeElement !== el) return;

    const text = el.value;
    let seen = 0;
    // digits === 0 이면 첫 숫자 앞 — 부호가 있으면 그 뒤입니다.
    let pos = digits === 0 ? (text.startsWith('-') ? 1 : 0) : text.length;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code >= 48 && code <= 57) {
        seen += 1;
        if (seen === digits) {
          pos = i + 1;
          break;
        }
      }
    }
    el.setSelectionRange(pos, pos);
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const caret = el.selectionStart ?? el.value.length;
    caretDigitsRef.current = el.value.slice(0, caret).replace(/\D/g, '').length;
    const next = parseMoneyInput(el.value, allowNegative);
    setMinusDraft(allowNegative && next === 0 && el.value.includes('-'));
    onChange(next);
  };

  const normalized = allowNegative ? Math.floor(value) : Math.max(0, Math.floor(value));
  const shown = normalized ? fmt(normalized) : minusDraft ? '-' : '';

  return (
    <input
      ref={(node) => {
        localRef.current = node;
        if (typeof inputRef === 'function') inputRef(node);
        else if (inputRef && typeof inputRef === 'object') (inputRef as React.RefObject<HTMLInputElement | null>).current = node;
      }}
      className="inp inp--num"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={shown}
      onChange={handleChange}
      onBlur={() => setMinusDraft(false)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || !onEnter) return;
        if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;
        e.preventDefault();
        onEnter();
      }}
    />
  );
}

/**
 * 수수료율(%) 입력.
 *
 * 입력 중에는 사용자가 친 문자열(draft)을 그대로 보여줍니다. 그러지 않으면
 * "3." 처럼 아직 안 끝난 입력이 저장값으로 정규화되면서 소수점이 사라집니다.
 */
export function PercentInput({
  value,
  onChange,
  ariaLabel,
  onEnter,
  disabled = false,
  title
}: {
  value: number;
  onChange: (next: number) => void;
  ariaLabel: string;
  onEnter?: () => void;
  /** 잠긴 동안에는 저장된 값을 감춥니다 — 안 쓰이는 값이 보이면 쓰인다고 오해합니다. */
  disabled?: boolean;
  title?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = disabled ? '' : draft ?? (value ? String(value) : '');

  return (
    <div className="inp-adorn">
      <input
        className="inp inp--num"
        disabled={disabled}
        title={title}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        aria-label={ariaLabel}
        value={shown}
        onChange={(e) => {
          // 숫자와 소수점만, 소수점은 하나만 남깁니다.
          const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/\.(?=.*\.)/g, '');
          setDraft(cleaned);
          const parsed = Number.parseFloat(cleaned);
          onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !onEnter) return;
          e.preventDefault();
          setDraft(null);
          onEnter();
        }}
      />
      <span className="inp-adorn-suffix" aria-hidden="true">
        %
      </span>
    </div>
  );
}
