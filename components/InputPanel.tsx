'use client';

import { useState } from 'react';

import type { AppState, IncentiveItem, IncomeItem, Member, PenaltyItem, PenaltyMode } from '@/lib/types';
import { PENALTY_MODE_LABEL_WITH_DIST } from '@/lib/penalty';
import { fmt, genId, parseMoneyInput } from '@/lib/utils';

import { IncomeRow } from '@/components/rows/IncomeRow';
import { IncentiveRow } from '@/components/rows/IncentiveRow';
import { PenaltyRow } from '@/components/rows/PenaltyRow';
import { MemberRow } from '@/components/rows/MemberRow';

export function InputPanel({
  state,
  setState
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
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

  const onKeyAdd = (e: React.KeyboardEvent, action: () => void) => {
    // IME 조합 중 Enter는 무시
    if ((e as any).isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
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

  return (
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
                  onMove={(from, to) =>
                    setState((s) => {
                      const next = s.incomeItems.slice();
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return { ...s, incomeItems: next };
                    })
                  }
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
                  onMove={(from, to) =>
                    setState((s) => {
                      const next = s.incentives.slice();
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return { ...s, incentives: next };
                    })
                  }
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
                  onMove={(from, to) =>
                    setState((s) => {
                      const next = s.penaltyItems.slice();
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return { ...s, penaltyItems: next };
                    })
                  }
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
                <option value="exclude-penalized">{PENALTY_MODE_LABEL_WITH_DIST['exclude-penalized']}</option>
                <option value="exclude-self">{PENALTY_MODE_LABEL_WITH_DIST['exclude-self']}</option>
                <option value="include-self">{PENALTY_MODE_LABEL_WITH_DIST['include-self']}</option>
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
                  onChange={(next) => setState((s) => ({ ...s, members: s.members.map((x) => (x.id === m.id ? next : x)) }))}
                  onDelete={() => setState((s) => ({ ...s, members: s.members.filter((x) => x.id !== m.id) }))}
                  onMove={(from, to) =>
                    setState((s) => {
                      const next = s.members.slice();
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return { ...s, members: next };
                    })
                  }
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
  );
}

