'use client';

import { useMemo, useRef } from 'react';

import { createDistributionClipboardText } from '@/lib/clipboard';
import { compute } from '@/lib/compute';

import { ActionsBar } from '@/components/ActionsBar';
import { InputPanel } from '@/components/InputPanel';
import { OutputSheet } from '@/components/OutputSheet';
import { TabsBar } from '@/components/TabsBar';
import { useAllocatorState } from '@/components/hooks/useAllocatorState';
import { buildMemoForPrint } from '@/components/utils/memo';
import { generatePaddedPngBlob } from '@/components/utils/png';

export function AllocatorApp() {
  const { hydrated, tabs, state, setState, switchTab, addNewTab, removeActiveTab, resetCurrent } = useAllocatorState();
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const result = useMemo(() => compute(state), [state]);
  const memoForPrint = useMemo(() => {
    // 출력용 memo는 멤버 이름 매핑이 필요해 result.members를 우선 사용합니다.
    if ('error' in result) return buildMemoForPrint(state, state.members);
    return buildMemoForPrint(state, result.members);
  }, [result, state]);

  const savePng = async () => {
    if (!printAreaRef.current) return;
    const blob = await generatePaddedPngBlob(printAreaRef.current);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ymd = (state.date || '').replaceAll('-', '');
    a.download = `알목-분배표-${ymd || 'export'}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyPng = async () => {
    if (!printAreaRef.current) return;
    const blob = await generatePaddedPngBlob(printAreaRef.current);
    if (!blob) return;
    try {
      // ClipboardItem은 일부 브라우저에서만 지원합니다.
      if (navigator?.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob });
        await navigator.clipboard.write([item]);
      }
    } catch {
      // ignore
    }
  };

  const copyText = async () => {
    const text = createDistributionClipboardText(state);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // fallback
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const printPdf = () => window.print();

  // SSR/CSR mismatch 방지: 로딩 전에는 최소 UI만 렌더
  if (!hydrated) {
    return <div className="container">로딩 중…</div>;
  }

  return (
    <div className="container">
      <TabsBar tabs={tabs} onSwitch={switchTab} onAdd={addNewTab} onRemove={removeActiveTab} />
      <InputPanel state={state} setState={setState} />
      <ActionsBar onReset={resetCurrent} onSavePng={savePng} onCopyPng={copyPng} onCopyText={copyText} onPrint={printPdf} />
      <OutputSheet ref={printAreaRef} state={state} result={result} memoForPrint={memoForPrint} />
    </div>
  );
}

