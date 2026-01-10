'use client';

import html2canvas from 'html2canvas';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { AppState, IncentiveItem, IncomeItem, Member, PenaltyItem, PenaltyMode, TabsState } from '@/lib/types';
import { compute, headerTitle } from '@/lib/compute';
import { createDistributionClipboardText } from '@/lib/clipboard';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { fmt, fmtOrBlank, genId, newBlankState, parseMoneyInput, reorder, todayYmd, deepClone, formatDate } from '@/lib/utils';

const PENALTY_MODE_LABEL: Record<PenaltyMode, string> = {
  'exclude-penalized': '부과 인원 제외 분배',
  'exclude-self': '본인 제외 분배',
  'include-self': '본인 포함 분배'
};

async function generatePaddedPngBlob(node: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
  const pad = 32;
  const padded = document.createElement('canvas');
  padded.width = canvas.width + pad * 2;
  padded.height = canvas.height + pad * 2;
  const ctx = padded.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, padded.width, padded.height);
  ctx.drawImage(canvas, pad, pad);
  const blob = await new Promise<Blob | null>((resolve) => padded.toBlob((b) => resolve(b), 'image/png'));
  return blob;
}

function buildMemoForPrint(state: AppState, members: Member[]): string {
  let memoText = state.memo || '';
  if (!state.penaltyItems?.length) return memoText;

  // 멤버 id -> 이름 매핑
  const idToName = new Map<string, string>();
  members.forEach((m, idx) => {
    const name = m.name || `공대원${idx + 1}`;
    if (m.id) idToName.set(m.id, name);
  });

  const lines = state.penaltyItems.map((it, i) => {
    const payerName = it.payerId ? idToName.get(it.payerId) || '' : '';
    const nameWithPayer = (it.label || `패널티 ${i + 1}`) + (payerName ? ` (${payerName})` : '');
    const modeLabel = PENALTY_MODE_LABEL[it.mode] || PENALTY_MODE_LABEL['exclude-penalized'];
    return `- ${nameWithPayer} [${modeLabel} 방식] ${fmt(Math.max(0, Math.floor(it.amount || 0)))}`;
  });

  memoText += (memoText ? '\n\n' : '') + '[패널티]\n' + lines.join('\n');
  return memoText;
}

export function AllocatorApp() {
  const [hydrated, setHydrated] = useState(false);
  const [tabs, setTabs] = useState<TabsState>({ activeId: '', items: [] });
  const [state, setState] = useState<AppState>(() => newBlankState());

  // 신규 입력 폼(리스트에 추가하기 전)
  const [newIncomeLabel, setNewIncomeLabel] = useState('');
  const [newIncomeGross, setNewIncomeGross] = useState('');
  const [newIncomeFeeRate, setNewIncomeFeeRate] = useState<number>(0);

  const [newIncLabel, setNewIncLabel] = useState('');
  const [newIncAmount, setNewIncAmount] = useState('');

  const [newPenaltyLabel, setNewPenaltyLabel] = useState('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState('');
  const [newPenaltyMode, setNewPenaltyMode] = useState<PenaltyMode>('exclude-penalized');

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberExclude, setNewMemberExclude] = useState(false);
  const [newMemberNote, setNewMemberNote] = useState('');

  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const didInitRef = useRef(false);

  // 초기 로드 (클라이언트에서만)
  useEffect(() => {
    const { tabs: loadedTabs, state: loadedState } = loadFromStorage();
    // 탭 저장소가 비어있다면 최소 1개 보장
    if (!loadedTabs.items.length) {
      const id = genId('tab');
      const s = loadedState.date ? loadedState : { ...loadedState, date: todayYmd() };
      setTabs({ activeId: id, items: [{ id, date: s.date, title: s.title, data: deepClone(s) }] });
      setState(s);
    } else {
      setTabs(loadedTabs);
      setState(loadedState.date ? loadedState : { ...loadedState, date: todayYmd() });
    }
    setHydrated(true);
    didInitRef.current = true;
  }, []);

  // 저장 (state 변경 시 자동)
  useEffect(() => {
    if (!didInitRef.current) return;
    if (!tabs.activeId) return;
    if (!hydrated) return;
    try {
      saveToStorage(tabs, state);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tabs.activeId, hydrated]);

  // date/title 변경 시 탭 라벨 갱신
  useEffect(() => {
    if (!hydrated) return;
    if (!tabs.activeId) return;
    setTabs((prev) => ({
      ...prev,
      items: prev.items.map((t) => (t.id === prev.activeId ? { ...t, date: state.date, title: state.title } : t))
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.date, state.title, hydrated]);

  const result = useMemo(() => compute(state), [state]);
  const memoForPrint = useMemo(() => {
    if ('error' in result) return buildMemoForPrint(state, state.members);
    return buildMemoForPrint(state, result.members);
  }, [result, state]);

  // 탭 라벨
  const tabLabel = (t: { date: string; title: string }) => {
    const lbl = `${formatDate(t.date) || '무제'} ${t.title || ''}`.trim();
    return lbl || '새 기록';
  };

  const switchTab = (id: string) => {
    if (id === tabs.activeId) return;
    const target = tabs.items.find((t) => t.id === id);
    if (!target) return;
    setTabs((prev) => ({ ...prev, activeId: id }));
    setState(deepClone(target.data));
  };

  const addNewTab = () => {
    const id = genId('tab');
    const data = deepClone(state);
    setTabs((prev) => ({ activeId: id, items: [...prev.items, { id, date: data.date, title: data.title, data }] }));
  };

  const removeActiveTab = () => {
    if (!confirm('현재 기록을 삭제할까요?')) return;
    setTabs((prev) => {
      const idx = prev.items.findIndex((t) => t.id === prev.activeId);
      if (idx < 0) return prev;
      const nextItems = prev.items.slice();
      nextItems.splice(idx, 1);
      if (nextItems.length === 0) {
        const s = newBlankState();
        const id = genId('tab');
        setState(s);
        return { activeId: id, items: [{ id, date: s.date, title: s.title, data: deepClone(s) }] };
      }
      const nextActive = nextItems[0]!;
      setState(deepClone(nextActive.data));
      return { activeId: nextActive.id, items: nextItems };
    });
  };

  const resetCurrent = () => {
    if (!confirm('모든 입력을 초기화할까요?')) return;
    setState(newBlankState());
  };

  const addIncome = () => {
    const label = newIncomeLabel.trim();
    const gross = parseMoneyInput(newIncomeGross);
    const feeRate = Number(newIncomeFeeRate || 0);
    const item: IncomeItem = { id: genId('income'), label, gross, feeRate };
    setState((s) => ({ ...s, incomeItems: [...s.incomeItems, item] }));
    setNewIncomeLabel('');
    setNewIncomeGross('');
    setNewIncomeFeeRate(0);
  };

  const addIncentive = () => {
    const label = newIncLabel.trim();
    const amount = Math.max(0, parseMoneyInput(newIncAmount));
    const item: IncentiveItem = { id: genId('inc'), label, amount };
    setState((s) => ({ ...s, incentives: [...s.incentives, item] }));
    setNewIncLabel('');
    setNewIncAmount('');
  };

  const addPenalty = () => {
    const label = newPenaltyLabel.trim();
    const amount = Math.max(0, parseMoneyInput(newPenaltyAmount));
    const item: PenaltyItem = { id: genId('pen'), label, amount, mode: newPenaltyMode };
    setState((s) => ({ ...s, penaltyItems: [...s.penaltyItems, item] }));
    setNewPenaltyLabel('');
    setNewPenaltyAmount('');
  };

  const addMember = () => {
    const name = newMemberName.trim() || `공대원${state.members.length + 1}`;
    const item: Member = { id: genId('m'), name, exclude: newMemberExclude, note: newMemberNote.trim() };
    setState((s) => ({ ...s, members: [...s.members, item] }));
    setNewMemberName('');
    setNewMemberExclude(false);
    setNewMemberNote('');
  };

  const onKeyAdd = (e: React.KeyboardEvent, action: () => void) => {
    if ((e as any).isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

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

  const groupColors = ['group-pink', 'group-yellow', 'group-sky', 'group-green'] as const;

  const renderTotalsCell = (value: number, ok: boolean, title: string) => (
    <td className={`num${ok ? '' : ' mismatch'}`} title={title}>
      {fmt(value)}
    </td>
  );

  const totalsCheck =
    'error' in result
      ? null
      : {
          baseOk: result.totals.base === result.meta.distributableBase,
          incentiveOk: result.totals.incentive === result.meta.incentiveTotal,
          finalOk: result.totals.final === result.meta.netIncome,
          penaltyDistOk: result.totals.penaltyDist === -result.totals.penalty
        };

  return (
    <div className="container">
      <div className="tabbar" id="tabbar">
        <div className="tabs-scroll" id="tabs-scroll">
          <div className="tabs" id="tabs">
            {tabs.items.map((t) => (
              <button
                key={t.id}
                className={`tab${t.id === tabs.activeId ? ' active' : ''}`}
                title={tabLabel(t)}
                onClick={() => switchTab(t.id)}
                type="button"
              >
                {tabLabel(t)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn" id="btn-add-tab" aria-label="새 기록 추가" onClick={addNewTab} type="button">
          + 새 기록
        </button>
        <button className="btn danger" id="btn-remove-tab" aria-label="현재 기록 삭제" onClick={removeActiveTab} type="button">
          🗑️
        </button>
      </div>

      <details className="input-panel" open>
        <summary>입력 패널 (접기/펼치기)</summary>
        <div className="panel-body">
          <div className="grid-2">
            <div className="section">
              <h3>기본 정보</h3>
              <div className="grid-3">
                <label className="field">
                  <span>날짜</span>
                  <input
                    id="input-date"
                    type="date"
                    value={state.date}
                    onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
                  />
                </label>
                <label className="field col-span-2">
                  <span>제목</span>
                  <input
                    id="input-title"
                    type="text"
                    placeholder="예) 혼테일 공대 알목 분배"
                    value={state.title}
                    onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="section">
              <h3 style={{ marginTop: 4 }}>수입 항목</h3>
              <div id="income-list">
                {state.incomeItems.map((it, idx) => (
                  <IncomeRow
                    key={it.id}
                    item={it}
                    onChange={(next) =>
                      setState((s) => ({
                        ...s,
                        incomeItems: s.incomeItems.map((x) => (x.id === it.id ? next : x))
                      }))
                    }
                    onDelete={() => setState((s) => ({ ...s, incomeItems: s.incomeItems.filter((x) => x.id !== it.id) }))}
                    onMove={(from, to) => setState((s) => ({ ...s, incomeItems: reorder(s.incomeItems, from, to) }))}
                    index={idx}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <input
                  id="new-income-label"
                  type="text"
                  placeholder="라벨(선택)"
                  style={{ flex: '1 1 160px' }}
                  value={newIncomeLabel}
                  onChange={(e) => setNewIncomeLabel(e.target.value)}
                  onKeyDown={(e) => onKeyAdd(e, addIncome)}
                />
                <input
                  id="new-income-gross"
                  type="text"
                  placeholder="전체금액"
                  style={{ width: 140 }}
                  value={newIncomeGross}
                  onChange={(e) => {
                    const raw = String(e.target.value || '');
                    const digits = raw.replace(/[^\d]/g, '');
                    if (!digits) setNewIncomeGross('');
                    else setNewIncomeGross(fmt(parseMoneyInput(raw)));
                  }}
                  onKeyDown={(e) => onKeyAdd(e, addIncome)}
                />
                <input
                  id="new-income-fee-rate"
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  placeholder="수수료율(%)"
                  style={{ width: 130 }}
                  value={Number.isFinite(newIncomeFeeRate) ? newIncomeFeeRate : 0}
                  onChange={(e) => setNewIncomeFeeRate(Number(e.target.value || 0))}
                  onKeyDown={(e) => onKeyAdd(e, addIncome)}
                />
                <button className="btn" id="btn-add-income" aria-label="수입 항목 추가" onClick={addIncome} type="button">
                  추가
                </button>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                수입 항목이 하나라도 있으면 위 단일 입력 대신 합산값을 사용합니다.
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="section">
              <h3>인센티브 항목</h3>
              <div id="incentive-list">
                {state.incentives.map((it, idx) => (
                  <IncentiveRow
                    key={it.id}
                    item={it}
                    members={state.members}
                    onChange={(next) =>
                      setState((s) => ({
                        ...s,
                        incentives: s.incentives.map((x) => (x.id === it.id ? next : x))
                      }))
                    }
                    onDelete={() => setState((s) => ({ ...s, incentives: s.incentives.filter((x) => x.id !== it.id) }))}
                    onMove={(from, to) => setState((s) => ({ ...s, incentives: reorder(s.incentives, from, to) }))}
                    index={idx}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  id="new-incentive-label"
                  type="text"
                  placeholder="라벨"
                  style={{ flex: 1 }}
                  value={newIncLabel}
                  onChange={(e) => setNewIncLabel(e.target.value)}
                  onKeyDown={(e) => onKeyAdd(e, addIncentive)}
                />
                <input
                  id="new-incentive-amount"
                  type="text"
                  placeholder="금액(+)"
                  value={newIncAmount}
                  onChange={(e) => setNewIncAmount(e.target.value ? fmt(parseMoneyInput(e.target.value)) : '')}
                  onKeyDown={(e) => onKeyAdd(e, addIncentive)}
                />
                <button className="btn" id="btn-add-incentive" aria-label="인센티브 추가" onClick={addIncentive} type="button">
                  추가
                </button>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                금액은 0 이상의 정수만 허용됩니다.
              </div>
            </div>

            <div className="section">
              <h3>패널티 항목</h3>
              <div id="penalty-list">
                {state.penaltyItems.map((it, idx) => (
                  <PenaltyRow
                    key={it.id}
                    item={it}
                    members={state.members}
                    onChange={(next) =>
                      setState((s) => ({
                        ...s,
                        penaltyItems: s.penaltyItems.map((x) => (x.id === it.id ? next : x))
                      }))
                    }
                    onDelete={() => setState((s) => ({ ...s, penaltyItems: s.penaltyItems.filter((x) => x.id !== it.id) }))}
                    onMove={(from, to) => setState((s) => ({ ...s, penaltyItems: reorder(s.penaltyItems, from, to) }))}
                    index={idx}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <input
                  id="new-penalty-label"
                  type="text"
                  placeholder="라벨"
                  style={{ flex: '1 1 100px' }}
                  value={newPenaltyLabel}
                  onChange={(e) => setNewPenaltyLabel(e.target.value)}
                  onKeyDown={(e) => onKeyAdd(e, addPenalty)}
                />
                <input
                  id="new-penalty-amount"
                  type="text"
                  placeholder="금액(-)"
                  style={{ width: 100 }}
                  value={newPenaltyAmount}
                  onChange={(e) => setNewPenaltyAmount(e.target.value ? fmt(parseMoneyInput(e.target.value)) : '')}
                  onKeyDown={(e) => onKeyAdd(e, addPenalty)}
                />
                <select
                  id="new-penalty-mode"
                  aria-label="패널티 분배 방식"
                  style={{ minWidth: 120 }}
                  value={newPenaltyMode}
                  onChange={(e) => setNewPenaltyMode(e.target.value as PenaltyMode)}
                >
                  <option value="exclude-penalized">부과 인원 제외 분배</option>
                  <option value="exclude-self">본인 제외 분배</option>
                  <option value="include-self">본인 포함 분배</option>
                </select>
                <button className="btn" id="btn-add-penalty" aria-label="패널티 추가" onClick={addPenalty} type="button">
                  추가
                </button>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                패널티 금액은 0 이상의 정수. 분배 제외 인원은 항상 제외됩니다.
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gridTemplateColumns: '5fr 3fr' }}>
            <div className="section">
              <h3>공대원 목록</h3>
              <div id="member-list">
                {state.members.map((m, idx) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onChange={(next) =>
                      setState((s) => ({ ...s, members: s.members.map((x) => (x.id === m.id ? next : x)) }))
                    }
                    onDelete={() => setState((s) => ({ ...s, members: s.members.filter((x) => x.id !== m.id) }))}
                    onMove={(from, to) => setState((s) => ({ ...s, members: reorder(s.members, from, to) }))}
                    index={idx}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  id="new-member-name"
                  type="text"
                  placeholder="이름"
                  style={{ flex: 1 }}
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => onKeyAdd(e, addMember)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    id="new-member-exclude"
                    type="checkbox"
                    checked={newMemberExclude}
                    onChange={(e) => setNewMemberExclude(e.target.checked)}
                  />{' '}
                  분배 제외
                </label>
                <input
                  id="new-member-note"
                  type="text"
                  placeholder="메모(선택)"
                  style={{ flex: 1 }}
                  value={newMemberNote}
                  onChange={(e) => setNewMemberNote(e.target.value)}
                  onKeyDown={(e) => onKeyAdd(e, addMember)}
                />
                <button className="btn" id="btn-add-member" aria-label="공대원 추가" onClick={addMember} type="button">
                  추가
                </button>
              </div>
              <div className="small" style={{ marginTop: 6 }}>
                키보드로도 추가(Enter)/삭제(Del) 가능합니다.
              </div>
            </div>

            <div className="section memo-input-section">
              <h3>MEMO</h3>
              <textarea
                id="input-memo"
                rows={7}
                placeholder="여러 줄 메모를 입력하세요. 인쇄 시 우측 박스에 표시됩니다."
                value={state.memo}
                onChange={(e) => setState((s) => ({ ...s, memo: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </details>

      <div className="actions">
        <button className="btn danger" id="btn-reset" aria-label="모든 입력 초기화" onClick={resetCurrent} type="button">
          초기화
        </button>
        <button className="btn" id="btn-save-png" aria-label="PNG 저장" onClick={savePng} type="button">
          PNG 저장
        </button>
        <button className="btn" id="btn-copy-png" aria-label="PNG 복사" onClick={copyPng} type="button">
          PNG 복사
        </button>
        <button className="btn" id="btn-copy-text" aria-label="텍스트 복사" onClick={copyText} type="button">
          텍스트 복사
        </button>
        <button className="btn primary" id="btn-print" aria-label="PDF/인쇄" onClick={printPdf} type="button">
          PDF/인쇄
        </button>
        <div className="small" style={{ marginLeft: 'auto' }}>
          인쇄 시 브라우저 설정에서 “배경 그래픽 인쇄”를 켜주세요.
        </div>
      </div>

      <div id="printArea" ref={printAreaRef}>
        <div className="header" id="header-title">
          {headerTitle(state) || '-'}
        </div>

        <div className="sheet">
          <div>
            <table id="main-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>명단</th>
                  <th style={{ width: '14%' }}>기본 분배금</th>
                  <th style={{ width: '14%' }}>패널티</th>
                  <th style={{ width: '14%' }}>인센티브</th>
                  <th style={{ width: '14%' }}>패널티 분배</th>
                  <th style={{ width: '16%' }}>최종 분배금</th>
                </tr>
              </thead>
              <tbody id="table-body">
                {'error' in result ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#b91c1c', padding: 14 }}>
                      {result.error}
                    </td>
                  </tr>
                ) : (
                  result.rows.map((r, i) => (
                    <tr key={`${r.name}_${i}`} className={groupColors[i % groupColors.length]}>
                      <td className="name">
                        <span title={r.note || ''}>{r.name}</span>
                        {r.note ? <span className="note">{r.note}</span> : null}
                        {r.exclude ? <span className="badge">분배 제외</span> : null}
                      </td>
                      <td className="num">{fmtOrBlank(r.base)}</td>
                      <td className="num" style={{ color: r.penalty < 0 ? 'var(--danger)' : 'inherit' }}>
                        {fmtOrBlank(r.penalty)}
                      </td>
                      <td className="num">{fmtOrBlank(r.incentive)}</td>
                      <td className="num">{fmtOrBlank(r.penaltyDist)}</td>
                      <td className="num">
                        <strong>{fmt(r.final)}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="total-row" id="total-row">
                  <th>TOTAL</th>
                  {'error' in result ? (
                    <>
                      <td className="num">0</td>
                      <td className="num">0</td>
                      <td className="num">0</td>
                      <td className="num">0</td>
                      <td className="num">0</td>
                    </>
                  ) : (
                    <>
                      {renderTotalsCell(
                        result.totals.base,
                        totalsCheck?.baseOk ?? true,
                        totalsCheck?.baseOk ? '검산 일치' : `검산 불일치 (기대값: ${fmt(result.meta.distributableBase)})`
                      )}
                      <td className="num">{fmt(result.totals.penalty)}</td>
                      {renderTotalsCell(
                        result.totals.incentive,
                        totalsCheck?.incentiveOk ?? true,
                        totalsCheck?.incentiveOk ? '검산 일치' : `검산 불일치 (기대값: ${fmt(result.meta.incentiveTotal)})`
                      )}
                      {renderTotalsCell(
                        result.totals.penaltyDist,
                        totalsCheck?.penaltyDistOk ?? true,
                        totalsCheck?.penaltyDistOk ? '검산 일치' : `검산 불일치 (기대값: ${fmt(-result.totals.penalty)})`
                      )}
                      {renderTotalsCell(
                        result.totals.final,
                        totalsCheck?.finalOk ?? true,
                        totalsCheck?.finalOk ? '검산 일치' : `검산 불일치 (기대값: ${fmt(result.meta.netIncome)})`
                      )}
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="footer">
          <div>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>전체금액</th>
                  <th>수수료 제외 금액</th>
                  <th>인센티브</th>
                </tr>
              </thead>
              <tbody id="summary-body">
                {'error' in result ? null : (
                  <>
                    {state.incomeItems.map((it, i) => {
                      const g = Math.floor(Number(it.gross || 0));
                      const fr = Number(it.feeRate || 0);
                      const feeByRate = Math.floor(g * (fr / 100));
                      const net = Math.max(0, g - feeByRate);
                      return (
                        <tr key={it.id}>
                          <td>{it.label || `수입 ${i + 1}`}</td>
                          <td className="num">{fmt(g)}</td>
                          <td className="num">{fmt(net)}</td>
                          <td className="num">0</td>
                        </tr>
                      );
                    })}
                    {state.incentives.map((it, i) => {
                      const name = it.recipientId ? state.members.find((m) => m.id === it.recipientId)?.name : '';
                      const title = (it.label || `인센 ${i + 1}`) + (name ? ` (${name})` : '');
                      return (
                        <tr key={it.id}>
                          <td>{title}</td>
                          <td className="num">0</td>
                          <td className="num">0</td>
                          <td className="num">-{fmt(Math.max(0, Math.floor(it.amount || 0)))}</td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th>합계</th>
                  <th className="num">{'error' in result ? '0' : fmt(result.meta.gross)}</th>
                  <th className="num">{'error' in result ? '0' : fmt(result.meta.netIncome)}</th>
                  <th className="num">{'error' in result ? '0' : `-${fmt(result.meta.incentiveTotal)}`}</th>
                </tr>
              </tfoot>
            </table>

            <div className="kpi">
              <div className="tile">
                <div className="label">수입 총액</div>
                <div className="value">{'error' in result ? '0' : fmt(result.meta.netIncome)}</div>
              </div>
              <div className="tile">
                <div className="label">분배 총액</div>
                <div className="value">{'error' in result ? '0' : fmt(result.meta.distributableBase)}</div>
              </div>
              <div className="tile">
                <div className="label">분배 인원</div>
                <div className="value">{'error' in result ? '0' : String(result.meta.includedCount)}</div>
              </div>
              <div className="tile">
                <div className="label">인당 분배금(기본)</div>
                <div className="value">{'error' in result ? '0' : fmt(result.meta.basePerFloor)}</div>
              </div>
            </div>
          </div>

          <div className="memo-box">
            <h4>MEMO</h4>
            <div className="memo-content" id="memo-render-bottom">
              {memoForPrint}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DragHandle({ index }: { index: number }) {
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

function useRowDnd(index: number, onMove: (from: number, to: number) => void) {
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

function IncomeRow({
  item,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: IncomeItem;
  index: number;
  onChange: (next: IncomeItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`income-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input
        type="text"
        value={item.label ?? ''}
        aria-label="수입 라벨"
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.gross || 0)))}
        aria-label="전체금액"
        onChange={(e) => onChange({ ...item, gross: parseMoneyInput(e.target.value) })}
      />
      <input
        type="number"
        min={0}
        step={0.01}
        inputMode="decimal"
        value={Number(item.feeRate || 0)}
        aria-label="수수료율"
        onChange={(e) => onChange({ ...item, feeRate: Number(e.target.value || 0) })}
      />
      <button className="btn" aria-label="수입 항목 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

function IncentiveRow({
  item,
  members,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: IncentiveItem;
  members: Member[];
  index: number;
  onChange: (next: IncentiveItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`incentive-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input
        type="text"
        value={item.label ?? ''}
        aria-label="인센티브 라벨"
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.amount || 0)))}
        aria-label="인센티브 금액"
        onChange={(e) => onChange({ ...item, amount: Math.max(0, parseMoneyInput(e.target.value)) })}
      />
      <select
        aria-label="인센티브 대상자"
        value={item.recipientId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange({ ...item, recipientId: undefined });
          else onChange({ ...item, recipientId: v });
        }}
      >
        <option value="">선택 안함</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <button className="btn" aria-label="인센티브 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

function PenaltyRow({
  item,
  members,
  index,
  onChange,
  onDelete,
  onMove
}: {
  item: PenaltyItem;
  members: Member[];
  index: number;
  onChange: (next: PenaltyItem) => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { over, rowProps } = useRowDnd(index, onMove);
  return (
    <div className={`penalty-row${over ? ' drag-over' : ''}`} draggable={false} {...rowProps}>
      <DragHandle index={index} />
      <input
        type="text"
        value={item.label ?? ''}
        aria-label="패널티 라벨"
        style={{ flex: '1 1 100px', minWidth: 100 }}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <input
        type="text"
        value={fmt(Math.max(0, Math.floor(item.amount || 0)))}
        aria-label="패널티 금액"
        onChange={(e) => onChange({ ...item, amount: Math.max(0, parseMoneyInput(e.target.value)) })}
      />
      <select
        aria-label="패널티 지불자"
        style={{ width: 100 }}
        value={item.payerId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange({ ...item, payerId: undefined });
          else onChange({ ...item, payerId: v });
        }}
      >
        <option value="">선택 안함</option>
        {members.map((m, i) => (
          <option key={m.id} value={m.id}>
            {m.name || `공대원${i + 1}`}
          </option>
        ))}
      </select>
      <select
        aria-label="분배 방식"
        value={item.mode}
        onChange={(e) => onChange({ ...item, mode: e.target.value as PenaltyMode })}
      >
        <option value="exclude-penalized">부과 인원 제외</option>
        <option value="exclude-self">본인 제외</option>
        <option value="include-self">본인 포함</option>
      </select>
      <button className="btn" aria-label="패널티 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

function MemberRow({
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
      <input
        type="text"
        value={member.name ?? ''}
        aria-label="이름"
        onChange={(e) => onChange({ ...member, name: e.target.value })}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={!!member.exclude}
          aria-label="분배 제외"
          onChange={(e) => onChange({ ...member, exclude: e.target.checked })}
        />{' '}
        분배 제외
      </label>
      <input
        type="text"
        value={member.note ?? ''}
        aria-label="메모"
        onChange={(e) => onChange({ ...member, note: e.target.value })}
      />
      <button className="btn" aria-label="공대원 삭제" onClick={onDelete} type="button">
        🗑️
      </button>
    </div>
  );
}

