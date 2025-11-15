// 렌더 모듈: 출력용 렌더와 계산 로직
// - 입력 리스트 재생성 없이 결과 영역만 갱신

import { fmt, fmtOrBlank, clampInt, escapeHtml, formatDate } from './utils.js';

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

	const pTotal = members.reduce((s, m) => s + Math.max(0, m.penalty), 0);
	const eligibleIdx = [];
	members.forEach((m, i) => { if (m.penalty === 0 && !m.exclude) eligibleIdx.push(i); });
	const N = eligibleIdx.length;
	if (pTotal > 0 && N === 0) {
		return { error: '사망 패널티가 존재하지만 분배 대상자가 0명입니다. (패널티 0 & 분배 제외 해제 필요)' };
	}

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

	const penaltyDistEach = new Array(memberCount).fill(0);
	if (pTotal > 0 && N > 0) {
		const per = Math.floor(pTotal / N);
		const rem = pTotal - (per * N);
		eligibleIdx.forEach((idx, k) => {
			penaltyDistEach[idx] = per + (k < rem ? 1 : 0);
		});
	}

	const perMemberIncent = new Array(memberCount).fill(0);
	const idToIndex = new Map();
	members.forEach((m, idx) => { if (m.id) idToIndex.set(m.id, idx); });
	incentives.forEach(it => {
		let idx = null;
		if (it.recipientId && idToIndex.has(it.recipientId)) {
			idx = idToIndex.get(it.recipientId);
		} else if (typeof it.recipient === 'number' && it.recipient >= 0 && it.recipient < memberCount) {
			idx = it.recipient;
		}
		if (idx !== null) perMemberIncent[idx] += it.amount;
	});

	const finalEach = members.map((m, i) => basePerEach[i] - m.penalty + penaltyDistEach[i] + perMemberIncent[i]);
	const sumBase = basePerEach.reduce((a,b)=>a+b,0);
	const sumPenaltyDist = penaltyDistEach.reduce((a,b)=>a+b,0);
	const sumPenalty = members.reduce((a,m)=>a + (m.penalty>0 ? -m.penalty : 0),0);
	const sumFinal = finalEach.reduce((a,b)=>a+b,0);

	return {
		members, incentives,
		meta: {
			gross, netIncome, incentiveTotal, distributableBase,
			memberCount, includedCount, basePerFloor, baseRemainder, pTotal, N
		},
		rows: members.map((m, i) => ({
			name: m.name || `인원${i+1}`,
			note: m.note,
			base: basePerEach[i],
			penalty: -m.penalty,
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
		el.memoRenderBottom.textContent = state.memo || '';
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
			const name = m.name || `인원${idx+1}`;
			if (m.id) idToName.set(m.id, name);
		});
		state.incentives.forEach((it, i) => {
			let rname = '';
			if (it.recipientId && idToName.has(it.recipientId)) {
				rname = idToName.get(it.recipientId);
			} else if (Number.isFinite(Number(it.recipient))) {
				const ridx = Number(it.recipient);
				rname = (result.members[ridx]) ? (result.members[ridx].name || `인원${ridx+1}`) : '';
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

	el.sumGross.textContent = fmt(result.meta.gross);
	el.sumNet.textContent = fmt(result.meta.netIncome);
	el.sumIncentive.textContent = '-' + fmt(result.meta.incentiveTotal);
	el.kpiIncome.textContent = fmt(result.meta.netIncome);
	el.kpiDistributable.textContent = fmt(result.meta.distributableBase);
	el.kpiCount.textContent = String(result.meta.includedCount);
	el.kpiPerHead.textContent = fmt(result.meta.basePerFloor);
	el.memoRenderBottom.textContent = state.memo || '';
}


