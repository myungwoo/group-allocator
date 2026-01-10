'use client';

import { forwardRef } from 'react';

import type { AppState } from '@/lib/types';
import type { ComputeResult } from '@/lib/compute';
import { headerTitle } from '@/lib/compute';
import { fmt, fmtOrBlank } from '@/lib/utils';

export const OutputSheet = forwardRef<HTMLDivElement, { state: AppState; result: ComputeResult; memoForPrint: string }>(
  function OutputSheet({ state, result, memoForPrint }, ref) {
    const groupColors = ['group-pink', 'group-yellow', 'group-sky', 'group-green'] as const;

    const totalsCheck =
      'error' in result
        ? null
        : {
            baseOk: result.totals.base === result.meta.distributableBase,
            incentiveOk: result.totals.incentive === result.meta.incentiveTotal,
            finalOk: result.totals.final === result.meta.netIncome,
            penaltyDistOk: result.totals.penaltyDist === -result.totals.penalty
          };

    const renderTotalsCell = (value: number, ok: boolean, title: string) => (
      <td className={`num${ok ? '' : ' mismatch'}`} title={title}>
        {fmt(value)}
      </td>
    );

    return (
      <div id="printArea" ref={ref}>
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
    );
  }
);

