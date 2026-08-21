'use client';

import { useMemo, useRef } from 'react';

import { createDistributionClipboardText } from '@/lib/clipboard';
import { compute } from '@/lib/compute';
import { normalizeAppState } from '@/lib/storage';
import { escapeFilenameSegment, todayYmd } from '@/lib/utils';

import { ActionsBar } from '@/components/ActionsBar';
import { InputPanel } from '@/components/InputPanel';
import { OutputSheet } from '@/components/OutputSheet';
import { TabsBar } from '@/components/TabsBar';
import { Toast, useToast } from '@/components/ui/Toast';
import { useAllocatorState } from '@/components/hooks/useAllocatorState';
import { buildMemoForPrint } from '@/components/utils/memo';
import { generatePaddedPngBlob } from '@/components/utils/png';

export function AllocatorApp() {
  const { hydrated, tabs, state, setState, switchTab, addNewTab, duplicateTab, addTabFromState, removeTab, resetCurrent } =
    useAllocatorState();
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const { message, show } = useToast();

  const result = useMemo(() => compute(state), [state]);
  const memoForPrint = useMemo(() => {
    // 출력용 memo는 멤버 이름 매핑이 필요해 result.members를 우선 사용합니다.
    if ('error' in result) return buildMemoForPrint(state, state.members);
    return buildMemoForPrint(state, result.members);
  }, [result, state]);

  const savePng = async () => {
    if (!printAreaRef.current) return;
    try {
      const blob = await generatePaddedPngBlob(printAreaRef.current);
      if (!blob) throw new Error('no blob');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ymd = (state.date || '').replaceAll('-', '');
      a.download = `알목-분배표-${ymd || 'export'}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      show('PNG 를 저장했습니다.');
    } catch {
      show('PNG 를 만들지 못했습니다.', 'error');
    }
  };

  const copyPng = async () => {
    if (!printAreaRef.current) return;
    // ClipboardItem 은 보안 컨텍스트(HTTPS/localhost)에서만 있습니다.
    if (!navigator?.clipboard || !(window as unknown as { ClipboardItem?: unknown }).ClipboardItem) {
      show('이 브라우저에서는 PNG 복사를 지원하지 않습니다. PNG 저장을 써 주세요.', 'error');
      return;
    }
    try {
      const blob = await generatePaddedPngBlob(printAreaRef.current);
      if (!blob) throw new Error('no blob');
      const Ctor = (window as unknown as { ClipboardItem: new (items: Record<string, Blob>) => ClipboardItem }).ClipboardItem;
      await navigator.clipboard.write([new Ctor({ [blob.type || 'image/png']: blob })]);
      show('PNG 를 클립보드에 복사했습니다.');
    } catch {
      show('PNG 복사에 실패했습니다.', 'error');
    }
  };

  const copyText = async () => {
    const text = createDistributionClipboardText(state);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        show('분배 텍스트를 복사했습니다.');
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
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    show(ok ? '분배 텍스트를 복사했습니다.' : '텍스트 복사에 실패했습니다.', ok ? 'ok' : 'error');
  };

  const exportJson = () => {
    try {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ymd = state.date || todayYmd(); // YYYY-MM-DD
      const title = escapeFilenameSegment(state.title);
      a.download = `${ymd}-${title || 'export'}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      show('JSON 을 내보냈습니다.');
    } catch {
      show('JSON 내보내기에 실패했습니다.', 'error');
    }
  };

  const importJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const next = normalizeAppState(JSON.parse(text) as unknown);
      addTabFromState(next, { activate: true });
      show(`새 기록으로 가져왔습니다 · 공대원 ${next.members.length}명 · 수입 ${next.incomeItems.length}건`);
    } catch {
      show('JSON 을 읽지 못했습니다. 파일 형식을 확인해 주세요.', 'error');
    }
  };

  const printPdf = () => window.print();

  // SSR/CSR mismatch 방지: 로딩 전에는 최소 UI만 렌더
  if (!hydrated) {
    return (
      <div className="container">
        <p className="boot">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 인쇄/PNG 에 들어가면 안 되는 조작 UI는 전부 이 안에 둡니다. */}
      <div className="chrome">
        <header className="app-head">
          <h1>분배 계산기</h1>
          <p>수입·인센티브·패널티를 넣으면 인당 분배금이 나옵니다. 기록은 이 브라우저에만 저장됩니다.</p>
        </header>

        <TabsBar tabs={tabs} onSwitch={switchTab} onAdd={addNewTab} onDuplicate={duplicateTab} onRemove={removeTab} />
        <InputPanel state={state} setState={setState} result={result} />
        <ActionsBar
          onReset={resetCurrent}
          onExportJson={exportJson}
          onImportJsonFile={importJsonFile}
          onSavePng={savePng}
          onCopyPng={copyPng}
          onCopyText={copyText}
          onPrint={printPdf}
        />
      </div>

      <div className="sheet-card">
        <OutputSheet ref={printAreaRef} state={state} result={result} memoForPrint={memoForPrint} />
      </div>

      <Toast message={message} />
    </div>
  );
}
