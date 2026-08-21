'use client';

import { useState } from 'react';

import type { ComputeResult } from '@/lib/compute';
import { DEFAULT_INCOME_FEE_RATE } from '@/lib/constants';
import { sumIncome } from '@/lib/compute';
import type { AppState, IncentiveItem, IncomeItem, Member, PenaltyItem } from '@/lib/types';
import { fmt, genId } from '@/lib/utils';

import { Chip, Section } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { RowList } from '@/components/ui/RowList';
import { useListOps } from '@/components/hooks/useListOps';
import { IncomeRow } from '@/components/rows/IncomeRow';
import { IncentiveRow } from '@/components/rows/IncentiveRow';
import { PenaltyRow } from '@/components/rows/PenaltyRow';
import { MemberRow } from '@/components/rows/MemberRow';

const sumAmounts = (items: { amount: number }[]) => items.reduce((acc, it) => acc + Math.max(0, Math.floor(it.amount || 0)), 0);

export function InputPanel({
  state,
  setState,
  result
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  result: ComputeResult;
}) {
  const [open, setOpen] = useState(true);
  // 방금 추가한 행의 id. 그 행이 스스로 포커스를 잡습니다.
  const [focusId, setFocusId] = useState<string | null>(null);

  const income = useListOps(setState, 'incomeItems');
  const incentives = useListOps(setState, 'incentives');
  const penalties = useListOps(setState, 'penaltyItems');
  const members = useListOps(setState, 'members');

  const addIncome = () => {
    // 수수료율은 보통 항목마다 같으니 마지막 값을 물려받고, 첫 항목이면 기본값을 씁니다.
    // 마지막 항목이 0% 면 0% 를 물려받습니다 — 일부러 0 으로 둔 것을 되돌리지 않습니다.
    const last = state.incomeItems[state.incomeItems.length - 1];
    const feeRate = last ? Number(last.feeRate || 0) : DEFAULT_INCOME_FEE_RATE;
    const item: IncomeItem = { id: genId('income'), label: '', gross: 0, feeRate };
    income.append(item);
    setFocusId(item.id);
  };

  const addIncentive = () => {
    const item: IncentiveItem = { id: genId('inc'), label: '', amount: 0 };
    incentives.append(item);
    setFocusId(item.id);
  };

  const addPenalty = () => {
    // 분배 방식도 마지막 항목을 따라갑니다.
    const mode = state.penaltyItems[state.penaltyItems.length - 1]?.mode ?? 'exclude-penalized';
    const item: PenaltyItem = { id: genId('pen'), label: '', amount: 0, mode };
    penalties.append(item);
    setFocusId(item.id);
  };

  const addMember = () => {
    const item: Member = { id: genId('m'), name: '', exclude: false, note: '' };
    members.append(item);
    setFocusId(item.id);
  };

  const incomeSum = sumIncome(state.incomeItems);
  const incentiveSum = sumAmounts(state.incentives);
  const incentiveUnassigned = state.incentives.filter((it) => !it.recipientId).length;
  const penaltySum = sumAmounts(state.penaltyItems);
  const penaltyUnassigned = state.penaltyItems.filter((it) => !it.payerId).length;
  const includedCount = state.members.filter((m) => !m.exclude).length;
  const perPerson = 'error' in result ? 0 : result.meta.basePerFloor;

  return (
    <section className="panel">
      <div className="panel-head">
        <label className="field field--date">
          <span>날짜</span>
          <input
            id="input-date"
            className="inp"
            type="date"
            value={state.date}
            onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
          />
        </label>
        <label className="field field--title">
          <span>제목</span>
          <input
            id="input-title"
            className="inp"
            type="text"
            placeholder="예) 혼테일 공대 알목 분배"
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          />
        </label>
        <button
          className="btn btn--ghost panel-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="panel-body"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="chevron" />
          {open ? '입력 접기' : '입력 펼치기'}
        </button>
      </div>

      {open ? (
        <div className="panel-body" id="panel-body">
          <div className="panel-row panel-row--income">
            <Section
              title="수입 항목"
              chips={
                <>
                  <Chip>{state.incomeItems.length}건</Chip>
                  <Chip>수수료 제외 {fmt(incomeSum.net)}</Chip>
                </>
              }
              hint={`수수료율을 넣으면 수수료를 뺀 금액이 분배 대상이 됩니다. 항목별로 내림합니다. 새 항목은 ${DEFAULT_INCOME_FEE_RATE}% 로 시작합니다.`}
            >
              <RowList
                variant="income"
                columns={['라벨', '전체금액', '수수료율']}
                count={state.incomeItems.length}
                empty="수입 항목이 없습니다. 먼저 판 금액을 넣어 주세요."
                addLabel="수입 항목 추가"
                onAdd={addIncome}
              >
                {state.incomeItems.map((it, idx) => (
                  <IncomeRow
                    key={it.id}
                    item={it}
                    index={idx}
                    focused={focusId === it.id}
                    onChange={income.update}
                    onDelete={() => income.remove(it.id)}
                    onMove={income.move}
                    onEnter={idx === state.incomeItems.length - 1 ? addIncome : undefined}
                  />
                ))}
              </RowList>
            </Section>

            <Section
              title="인센티브 항목"
              chips={
                <>
                  <Chip>합계 {fmt(incentiveSum)}</Chip>
                  {incentiveUnassigned ? <Chip tone="warn">대상자 미지정 {incentiveUnassigned}건</Chip> : null}
                </>
              }
              hint="분배 총액에서 먼저 빠집니다. 대상자를 비우면 아무에게도 가지 않습니다."
            >
              <RowList
                variant="incentive"
                columns={['라벨', '금액', '대상자']}
                count={state.incentives.length}
                empty="인센티브가 없습니다."
                addLabel="인센티브 추가"
                onAdd={addIncentive}
              >
                {state.incentives.map((it, idx) => (
                  <IncentiveRow
                    key={it.id}
                    item={it}
                    members={state.members}
                    index={idx}
                    focused={focusId === it.id}
                    onChange={incentives.update}
                    onDelete={() => incentives.remove(it.id)}
                    onMove={incentives.move}
                    onEnter={idx === state.incentives.length - 1 ? addIncentive : undefined}
                  />
                ))}
              </RowList>
            </Section>
          </div>

          <div className="panel-row panel-row--penalty">
            <Section
              title="패널티 항목"
              chips={
                <>
                  <Chip>합계 {fmt(penaltySum)}</Chip>
                  {penaltyUnassigned ? <Chip tone="warn">지불자 미지정 {penaltyUnassigned}건</Chip> : null}
                </>
              }
              hint="지불자에게서 빼고 분배 방식대로 나눕니다. 지불자를 비우면 계산에서 빠집니다."
            >
              <RowList
                variant="penalty"
                columns={['라벨', '금액', '지불자', '분배 방식']}
                count={state.penaltyItems.length}
                empty="패널티가 없습니다."
                addLabel="패널티 추가"
                onAdd={addPenalty}
              >
                {state.penaltyItems.map((it, idx) => (
                  <PenaltyRow
                    key={it.id}
                    item={it}
                    members={state.members}
                    index={idx}
                    focused={focusId === it.id}
                    onChange={penalties.update}
                    onDelete={() => penalties.remove(it.id)}
                    onMove={penalties.move}
                    onEnter={idx === state.penaltyItems.length - 1 ? addPenalty : undefined}
                  />
                ))}
              </RowList>
            </Section>

            <Section title="MEMO" className="card--memo" hint="출력물 오른쪽 아래 MEMO 칸에 그대로 들어갑니다.">
              <textarea
                id="input-memo"
                className="inp"
                rows={8}
                placeholder="여러 줄 메모를 입력하세요."
                value={state.memo}
                onChange={(e) => setState((s) => ({ ...s, memo: e.target.value }))}
              />
            </Section>
          </div>

          <Section
            title="공대원 목록"
            chips={
              <>
                <Chip>{state.members.length}명</Chip>
                {includedCount === state.members.length ? null : <Chip>분배 대상 {includedCount}명</Chip>}
                {perPerson ? <Chip>인당 {fmt(perPerson)}</Chip> : null}
              </>
            }
            hint="Enter 로 다음 행 추가, Alt+↑/↓ 로 순서 이동. 순서는 나머지 1원을 앞에서부터 배분할 때 쓰고, 두 열일 때는 좌→우 순서입니다."
          >
            <RowList
              variant="member"
              split
              columns={['이름', '메모', '분배 제외']}
              count={state.members.length}
              empty="공대원이 없습니다. 최소 1명은 있어야 계산됩니다."
              addLabel="공대원 추가"
              onAdd={addMember}
            >
              {state.members.map((m, idx) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  index={idx}
                  focused={focusId === m.id}
                  onChange={members.update}
                  onDelete={() => members.remove(m.id)}
                  onMove={members.move}
                  onEnter={idx === state.members.length - 1 ? addMember : undefined}
                />
              ))}
            </RowList>
          </Section>
        </div>
      ) : null}
    </section>
  );
}
