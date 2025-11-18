// 렌더 모듈: 출력용 렌더와 계산 로직
// - 입력 리스트 재생성 없이 결과 영역만 갱신

import { fmt, fmtOrBlank, clampInt, escapeHtml, formatDate } from './utils.js';

// 패널티 분배 방식 라벨(전역)
const PENALTY_MODE_LABEL = {
	'exclude-penalized': '부과 인원 제외',
	'exclude-self': '본인 제외',
	'include-self': '본인 포함'
};

export function headerTitle(state) {
	const ds = formatDate(state.date);
	const t = (state.title || '').trim();
	return `${ds}${ds && t ? ' ' : ''}${t}`;
}

export function compute(state) {
	const membersRaw = Array.isArray(state?.members) ? state.members : [];
	const members = membersRaw.map(m => ({
		id: m.id,
		name: (m.name || '').trim(),
		penalty: Math.max(0, clampInt(m.penalty)),
		exclude: !!m.exclude,
		note: m.note || ''
	}));
	const memberCount = members.length;
	if (memberCount === 0) {
		return { error: '공대원 수가 0명입니다. 최소 1명 이상 입력하세요.' };
	}
	let gross = 0;
	let netIncome = 0;
	const incomeItems = Array.isArray(state?.incomeItems) ? state.incomeItems : [];
	if (incomeItems.length > 0) {
		incomeItems.forEach(item => {
			const g = clampInt(item.gross);
			const fr = Number(item.feeRate || 0);
			const feeByRate = Math.floor(g * (fr / 100));
			const net = Math.max(0, g - feeByRate);
			gross += g;
			netIncome += net;
		});
	}
	const incentivesRaw = Array.isArray(state?.incentives) ? state.incentives : [];
	const incentives = incentivesRaw.map(i => ({
		label: (i.label || '').trim(),
		amount: Math.max(0, clampInt(i.amount)),
		recipientId: i.recipientId || null,
		recipient: Number.isFinite(Number(i.recipient)) ? Number(i.recipient) : null
	}));
	const incentiveTotal = incentives.reduce((s, i) => s + i.amount, 0);
	const distributableBase = Math.max(0, netIncome - incentiveTotal);

	const includedIdx = [];
	members.forEach((m, i) => { if (!m.exclude) includedIdx.push(i); });
	const includedCount = includedIdx.length;
	if (includedCount === 0) {
		return { error: '분배 대상자가 0명입니다. (분배 제외 해제 필요)' };
	}

	const basePerFloor = Math.floor(distributableBase / includedCount);
	const baseRemainder = distributableBase - (basePerFloor * includedCount);
	const basePerEach = new Array(memberCount).fill(0);
	includedIdx.forEach((idx, order) => {
		basePerEach[idx] = basePerFloor + (order < baseRemainder ? 1 : 0);
	});

	const penaltyChargeEach = new Array(memberCount).fill(0);
	const penaltyDistEach = new Array(memberCount).fill(0);

	// 신규: 패널티 항목 기반 분배
	const penaltyItemsRaw = Array.isArray(state?.penaltyItems) ? state.penaltyItems : [];
	const penaltyItems = penaltyItemsRaw.map(p => ({
		label: (p.label || '').trim(),
		amount: Math.max(0, clampInt(p.amount)),
		payerId: p.payerId || null,
		payer: Number.isFinite(Number(p.payer)) ? Number(p.payer) : null,
		mode: p.mode || 'exclude-penalized'
	}));

	const idToIndex = new Map();
	members.forEach((m, idx) => { if (m.id) idToIndex.set(m.id, idx); });
	// 패널티 항목: 분배 집합 계산
	const penalizedSet = new Set();
	const payerIndexOf = (it) => {
		if (it.payerId && idToIndex.has(it.payerId)) return idToIndex.get(it.payerId);
		if (typeof it.payer === 'number' && it.payer >= 0 && it.payer < memberCount) return it.payer;
		return null;
	};
	penaltyItems.forEach(it => {
		// "부과 인원 제외" 항목에 대해서만 제외 집합에 포함
		if (it.mode === 'exclude-penalized') {
			const pidx = payerIndexOf(it);
			if (pidx !== null) penalizedSet.add(pidx);
		}
	});
	for (const it of penaltyItems) {
		const amt = it.amount;
		if (!(Number.isFinite(amt) && amt > 0)) continue;
		const pidx = payerIndexOf(it);
		if (pidx === null) continue; // 유효한 지불자 없음
		penaltyChargeEach[pidx] += amt;
		// 분배 대상 계산
		let recipients = [];
		if (it.mode === 'include-self') {
			recipients = includedIdx.slice();
		} else if (it.mode === 'exclude-self') {
			recipients = includedIdx.filter(i => i !== pidx);
		} else {
			// exclude-penalized (기본)
			recipients = includedIdx.filter(i => !penalizedSet.has(i));
		}
		const R = recipients.length;
		if (R === 0) {
			return { error: `패널티 항목 "${it.label || '무명'}"의 분배 대상자가 0명입니다. (분배 제외 해제/모드 확인)` };
		}
		const per = Math.floor(amt / R);
		const rem = amt - (per * R);
		recipients.forEach((idx, k) => {
			penaltyDistEach[idx] += per + (k < rem ? 1 : 0);
		});
	}

	const perMemberIncent = new Array(memberCount).fill(0);
	incentives.forEach(it => {
		let idx = null;
		if (it.recipientId && idToIndex.has(it.recipientId)) {
			idx = idToIndex.get(it.recipientId);
		} else if (typeof it.recipient === 'number' && it.recipient >= 0 && it.recipient < memberCount) {
			idx = it.recipient;
		}
		if (idx !== null) perMemberIncent[idx] += it.amount;
	});

	const finalEach = members.map((m, i) => basePerEach[i] - penaltyChargeEach[i] + penaltyDistEach[i] + perMemberIncent[i]);
	const sumBase = basePerEach.reduce((a,b)=>a+b,0);
	const sumPenaltyDist = penaltyDistEach.reduce((a,b)=>a+b,0);
	const sumPenalty = -penaltyChargeEach.reduce((a,b)=>a+b,0);
	const sumFinal = finalEach.reduce((a,b)=>a+b,0);

	return {
		members, incentives,
		meta: {
			gross, netIncome, incentiveTotal, distributableBase,
			memberCount, includedCount, basePerFloor, baseRemainder, pTotal: penaltyChargeEach.reduce((a,b)=>a+b,0), N: includedCount
		},
		rows: members.map((m, i) => ({
			name: m.name || `공대원${i+1}`,
			note: m.note,
			base: basePerEach[i],
			penalty: -penaltyChargeEach[i],
			incentive: perMemberIncent[i],
			penaltyDist: penaltyDistEach[i],
			final: finalEach[i]
		})),
		totals: {
			base: sumBase,
			penalty: sumPenalty,
			incentive: incentiveTotal,
			penaltyDist: sumPenaltyDist,
			final: sumFinal
		}
	};
}

export function renderOutputs(el, state) {
	const result = compute(state);
	if (result?.error) {
		el.headerTitle.textContent = headerTitle(state);
		el.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#b91c1c; padding:14px;">${result.error}</td></tr>`;
		const zeros = ['sum-gross','sum-net','sum-incentive','kpi-income','kpi-distributable','kpi-count','kpi-per-head'];
		zeros.forEach(id => document.getElementById(id).textContent = '0');
		['total-base','total-penalty','total-incentive','total-penalty-dist','total-final'].forEach(k => {
			el.totalRow.querySelector(`[data-k="${k}"]`).textContent = '0';
		});
		// 검산 표시 초기화
		['total-base','total-incentive','total-final','total-penalty-dist'].forEach(k => {
			const c = el.totalRow.querySelector(`[data-k="${k}"]`);
			if (c) {
				c.classList.remove('mismatch');
				c.removeAttribute('title');
			}
		});
		// 메모 + 패널티 항목 노출
		let memoText = state.memo || '';
		if (state.penaltyItems?.length) {
			// 멤버 이름 매핑
			const idToName = new Map();
			(state.members || []).forEach((m, idx) => {
				const name = (m?.name || `공대원${idx+1}`);
				if (m?.id) idToName.set(m.id, name);
			});
			const lines = state.penaltyItems.map((it, i) => {
				let pname = '';
				if (it.payerId && idToName.has(it.payerId)) pname = idToName.get(it.payerId);
				else if (Number.isFinite(Number(it.payer))) {
					const pidx = Number(it.payer);
					pname = ((state.members || [])[pidx]) ? (((state.members || [])[pidx].name) || `공대원${pidx+1}`) : '';
				}
				const nameWithPayer = (it.label || `패널티 ${i+1}`) + (pname ? ` (${pname})` : '');
				const modeLabel = PENALTY_MODE_LABEL[it.mode] || PENALTY_MODE_LABEL['exclude-penalized'];
				return `- ${nameWithPayer} [${modeLabel} 방식] ${fmt(clampInt(it.amount))}`;
			});
			if (lines.length) {
				memoText += (memoText ? '\n\n' : '') + '[패널티]\n' + lines.join('\n');
			}
		}
		el.memoRenderBottom.textContent = memoText;
		return;
	}

	el.headerTitle.textContent = headerTitle(state);
	el.tableBody.innerHTML = '';
	const groupColors = ['group-pink','group-yellow','group-sky','group-green'];
	result.rows.forEach((r, i) => {
		const tr = document.createElement('tr');
		tr.className = groupColors[i % groupColors.length];
		tr.innerHTML = `
			<td class="name"><span title="${escapeHtml(r.note)}">${escapeHtml(r.name)}</span>
				${r.note ? `<span class="note">${escapeHtml(r.note)}</span>`:''}
				${(result.members[i].exclude && result.members[i].penalty===0) ? `<span class="badge">분배 제외</span>`:''}
			</td>
			<td class="num">${fmtOrBlank(r.base)}</td>
			<td class="num" style="color:${r.penalty<0? 'var(--danger)':'inherit'}">${fmtOrBlank(r.penalty)}</td>
			<td class="num">${fmtOrBlank(r.incentive)}</td>
			<td class="num">${fmtOrBlank(r.penaltyDist)}</td>
			<td class="num"><strong>${fmt(r.final)}</strong></td>
		`;
		el.tableBody.appendChild(tr);
	});
	// TOTAL
	el.totalRow.querySelector('[data-k="total-base"]').textContent = fmt(result.totals.base);
	el.totalRow.querySelector('[data-k="total-penalty"]').textContent = fmt(result.totals.penalty);
	el.totalRow.querySelector('[data-k="total-incentive"]').textContent = fmt(result.totals.incentive);
	el.totalRow.querySelector('[data-k="total-penalty-dist"]').textContent = fmt(result.totals.penaltyDist);
	el.totalRow.querySelector('[data-k="total-final"]').textContent = fmt(result.totals.final);
	// TOTAL 검산 표시
	const cellBase = el.totalRow.querySelector('[data-k="total-base"]');
	const cellIncentive = el.totalRow.querySelector('[data-k="total-incentive"]');
	const cellFinal = el.totalRow.querySelector('[data-k="total-final"]');
	const cellPenaltyDist = el.totalRow.querySelector('[data-k="total-penalty-dist"]');
	const setCheck = (cell, ok, expected) => {
		cell.classList.toggle('mismatch', !ok);
		cell.title = ok ? '검산 일치' : `검산 불일치 (기대값: ${fmt(expected)})`;
	};
	setCheck(cellBase, result.totals.base === result.meta.distributableBase, result.meta.distributableBase);
	setCheck(cellIncentive, result.totals.incentive === result.meta.incentiveTotal, result.meta.incentiveTotal);
	setCheck(cellFinal, result.totals.final === result.meta.netIncome, result.meta.netIncome);
	// 패널티 분배금 합계 = 사망 패널티 합계(부호 보정)
	setCheck(cellPenaltyDist, result.totals.penaltyDist === -result.totals.penalty, -result.totals.penalty);

	// 요약/메모
	const tbody = document.getElementById('summary-body');
	tbody.innerHTML = '';
	if (state.incomeItems?.length) {
		state.incomeItems.forEach((it, i) => {
			const g = clampInt(it.gross);
			const fr = Number(it.feeRate || 0);
			const feeByRate = Math.floor(g * (fr / 100));
			const net = Math.max(0, g - feeByRate);
			const tr = document.createElement('tr');
			tr.innerHTML = `<td>${escapeHtml(it.label || `수입 ${i+1}`)}</td>
				<td class="num">${fmt(g)}</td>
				<td class="num">${fmt(net)}</td>
				<td class="num">0</td>`;
			tbody.appendChild(tr);
		});
	}
	if (state.incentives?.length) {
		const idToName = new Map();
		result.members.forEach((m, idx) => {
			const name = m.name || `공대원${idx+1}`;
			if (m.id) idToName.set(m.id, name);
		});
		state.incentives.forEach((it, i) => {
			let rname = '';
			if (it.recipientId && idToName.has(it.recipientId)) {
				rname = idToName.get(it.recipientId);
			} else if (Number.isFinite(Number(it.recipient))) {
				const ridx = Number(it.recipient);
				rname = (result.members[ridx]) ? (result.members[ridx].name || `공대원${ridx+1}`) : '';
			}
			const nameWithRecipient = (it.label || `인센 ${i+1}`) + (rname ? ` (${rname})` : '');
			const tr = document.createElement('tr');
			tr.innerHTML = `<td>${escapeHtml(nameWithRecipient)}</td>
				<td class="num">0</td>
				<td class="num">0</td>
				<td class="num">-${fmt(clampInt(it.amount))}</td>`;
			tbody.appendChild(tr);
		});
	}
	// 패널티 항목은 요약 표에 표시하지 않음

	el.sumGross.textContent = fmt(result.meta.gross);
	el.sumNet.textContent = fmt(result.meta.netIncome);
	el.sumIncentive.textContent = '-' + fmt(result.meta.incentiveTotal);
	el.kpiIncome.textContent = fmt(result.meta.netIncome);
	el.kpiDistributable.textContent = fmt(result.meta.distributableBase);
	el.kpiCount.textContent = String(result.meta.includedCount);
	el.kpiPerHead.textContent = fmt(result.meta.basePerFloor);
	// 메모 + 패널티 항목 노출
	let memoText = state.memo || '';
	if (state.penaltyItems?.length) {
		const idToName = new Map();
		result.members.forEach((m, idx) => {
			const name = m.name || `공대원${idx+1}`;
			if (m.id) idToName.set(m.id, name);
		});
		const lines = state.penaltyItems.map((it, i) => {
			let pname = '';
			if (it.payerId && idToName.has(it.payerId)) {
				pname = idToName.get(it.payerId);
			} else if (Number.isFinite(Number(it.payer))) {
				const pidx = Number(it.payer);
				pname = (result.members[pidx]) ? (result.members[pidx].name || `공대원${pidx+1}`) : '';
			}
			const nameWithPayer = (it.label || `패널티 ${i+1}`) + (pname ? ` (${pname})` : '');
			const modeLabel = PENALTY_MODE_LABEL[it.mode] || PENALTY_MODE_LABEL['exclude-penalized'];
			return `- ${nameWithPayer} [${modeLabel} 방식] ${fmt(clampInt(it.amount))}`;
		});
		if (lines.length) {
			memoText += (memoText ? '\n\n' : '') + '[패널티]\n' + lines.join('\n');
		}
	}
	el.memoRenderBottom.textContent = memoText;
}


