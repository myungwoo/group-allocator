// 앱 스크립트 (ES 모듈) - 가독성 향상 및 모듈화
import { clampInt, genId, formatDate } from './utils.js';
import { state, tabs, save, loadTabs, newBlankState } from './state.js';
import { renderOutputs as renderOutputsView } from './render.js';

// ===== DOM 참조 =====
const el = {
	date: document.getElementById('input-date'),
	title: document.getElementById('input-title'),
	incentiveList: document.getElementById('incentive-list'),
	newIncLabel: document.getElementById('new-incentive-label'),
	newIncAmount: document.getElementById('new-incentive-amount'),
	btnAddInc: document.getElementById('btn-add-incentive'),

	incomeList: document.getElementById('income-list'),
	newIncomeLabel: document.getElementById('new-income-label'),
	newIncomeGross: document.getElementById('new-income-gross'),
	newIncomeFeeRate: document.getElementById('new-income-fee-rate'),
	btnAddIncome: document.getElementById('btn-add-income'),

	memberList: document.getElementById('member-list'),
	newMemName: document.getElementById('new-member-name'),
	newMemPenalty: document.getElementById('new-member-penalty'),
	newMemExclude: document.getElementById('new-member-exclude'),
	newMemNote: document.getElementById('new-member-note'),
	btnAddMem: document.getElementById('btn-add-member'),

	memo: document.getElementById('input-memo'),

	btnReset: document.getElementById('btn-reset'),
	btnSavePng: document.getElementById('btn-save-png'),
	btnPrint: document.getElementById('btn-print'),
	btnAddTab: document.getElementById('btn-add-tab'),
	btnRemoveTab: document.getElementById('btn-remove-tab'),
	tabsScroll: document.getElementById('tabs-scroll'),
	tabs: document.getElementById('tabs'),

	headerTitle: document.getElementById('header-title'),
	tableBody: document.getElementById('table-body'),
	totalRow: document.getElementById('total-row'),
	memoRenderBottom: document.getElementById('memo-render-bottom'),

	sumGross: document.getElementById('sum-gross'),
	sumNet: document.getElementById('sum-net'),
	sumIncentive: document.getElementById('sum-incentive'),
	kpiIncome: document.getElementById('kpi-income'),
	kpiDistributable: document.getElementById('kpi-distributable'),
	kpiCount: document.getElementById('kpi-count'),
	kpiPerHead: document.getElementById('kpi-per-head'),
};

// ===== 렌더/바인딩 =====
function renderOutputs() {
	renderOutputsView(el, state);
}
function bindInputs() {
	el.date.value = state.date;
	el.title.value = state.title;
	el.memo.value = state.memo || '';
}
function renderTabs() {
	if (!el.tabs) return;
	el.tabs.innerHTML = '';
	tabs.items.forEach(t => {
		const b = document.createElement('button');
		b.className = 'tab' + (t.id === tabs.activeId ? ' active' : '');
		const lbl = (formatDate(t.date) || '무제') + ' ' + (t.title || '');
		b.textContent = lbl.trim() || '새 기록';
		b.title = b.textContent;
		b.addEventListener('click', () => switchTab(t.id));
		el.tabs.appendChild(b);
		if (t.id === tabs.activeId) {
			setTimeout(() => {
				b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
			}, 0);
		}
	});
	updateTabNavButtons();
}
function updateTabNavButtons() {
	// 추후 탭 이동 버튼이 추가되면 제어 로직을 넣습니다.
}

// 인센티브 목록
function renderIncentives() {
	el.incentiveList.innerHTML = '';
	state.incentives.forEach((it, idx) => {
		const row = document.createElement('div');
		row.className = 'incentive-row';
		row.draggable = false;
		row.dataset.index = String(idx);
		row.innerHTML = `
			<span class="drag-handle" aria-label="순서 이동" title="순서 이동" draggable="true"></span>
			<input type="text" value="${it.label ?? ''}" aria-label="인센티브 라벨">
			<input type="number" min="0" step="1" value="${it.amount ?? 0}" aria-label="인센티브 금액">
			<select aria-label="인센티브 대상자"></select>
			<button class="btn" aria-label="인센티브 삭제">삭제</button>
		`;
		const [handle, label, amount, sel, del] = row.children;
		// 멤버 옵션 구성
		sel.innerHTML = '';
		state.members.forEach((m, i) => {
			const opt = document.createElement('option');
			opt.value = m.id || String(i);
			opt.textContent = m.name || `인원${i+1}`;
			if (it.recipientId ? it.recipientId === m.id : Number(it.recipient) === i) opt.selected = true;
			sel.appendChild(opt);
		});
		// 입력 요소에서의 드래그 방지, 핸들 제외
		row.querySelectorAll('input, textarea, select, button:not(.drag-handle), label').forEach(elm => {
			elm.setAttribute('draggable', 'false');
		});
		label.addEventListener('input', () => { it.label = label.value; save(); renderOutputs(); });
		label.addEventListener('change', () => { renderOutputs(); });
		amount.addEventListener('input', () => { it.amount = Math.max(0, clampInt(amount.value)); amount.value = it.amount; save(); renderOutputs(); });
		amount.addEventListener('change', () => { renderOutputs(); });
		sel.addEventListener('change', () => {
			it.recipientId = sel.value;
			if ('recipient' in it) delete it.recipient; // 레거시 인덱스 제거
			save();
			renderOutputs();
		});
		del.addEventListener('click', () => { state.incentives.splice(idx,1); save(); renderIncentives(); renderOutputs(); });
		// DnD - drag image를 행 전체로
		let dragGhostInc = null;
		handle.addEventListener('dragstart', (e) => {
			e.dataTransfer.setData('text/plain', String(idx));
			e.dataTransfer.effectAllowed = 'move';
			const rect = row.getBoundingClientRect();
			dragGhostInc = row.cloneNode(true);
			dragGhostInc.classList.add('drag-ghost');
			dragGhostInc.style.position = 'fixed';
			dragGhostInc.style.top = '-1000px';
			dragGhostInc.style.left = '-1000px';
			dragGhostInc.style.width = rect.width + 'px';
			dragGhostInc.style.pointerEvents = 'none';
			document.body.appendChild(dragGhostInc);
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;
			if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(dragGhostInc, offsetX, offsetY);
		});
		handle.addEventListener('dragend', () => {
			if (dragGhostInc && dragGhostInc.parentNode) dragGhostInc.parentNode.removeChild(dragGhostInc);
			dragGhostInc = null;
		});
		// 드롭 타겟
		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			row.classList.add('drag-over');
		});
		row.addEventListener('dragleave', () => {
			row.classList.remove('drag-over');
		});
		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.classList.remove('drag-over');
			const from = Number(e.dataTransfer.getData('text/plain'));
			const to = idx;
			if (!Number.isFinite(from) || from === to) return;
			const [moved] = state.incentives.splice(from, 1);
			state.incentives.splice(to, 0, moved);
			save();
			renderAllNoTabs();
		});
		el.incentiveList.appendChild(row);
	});
}

// 수입 항목 목록
function renderIncomeItems() {
	el.incomeList.innerHTML = '';
	state.incomeItems.forEach((it, idx) => {
		const row = document.createElement('div');
		row.className = 'income-row';
		row.draggable = false;
		row.dataset.index = String(idx);
		row.innerHTML = `
			<span class="drag-handle" aria-label="순서 이동" title="순서 이동" draggable="true"></span>
			<input type="text" value="${it.label ?? ''}" aria-label="수입 라벨">
			<input type="number" min="0" step="1" value="${clampInt(it.gross) || 0}" aria-label="전체금액">
			<input type="number" min="0" step="0.01" inputmode="decimal" value="${Number(it.feeRate || 0)}" aria-label="수수료율">
			<button class="btn" aria-label="수입 항목 삭제">삭제</button>
		`;
		const [handle, label, gross, feeRate, del] = row.children;
		// 입력 요소에서의 드래그 방지, 핸들 제외
		row.querySelectorAll('input, textarea, select, button:not(.drag-handle), label').forEach(elm => {
			elm.setAttribute('draggable', 'false');
		});
		label.addEventListener('input', () => { it.label = label.value; save(); renderOutputs(); });
		label.addEventListener('change', () => { renderOutputs(); });
		gross.addEventListener('input', () => { it.gross = clampInt(gross.value); gross.value = it.gross; save(); renderOutputs(); });
		gross.addEventListener('change', () => { renderOutputs(); });
		feeRate.addEventListener('input', () => { it.feeRate = Number(feeRate.value || 0); save(); renderOutputs(); });
		feeRate.addEventListener('change', () => { renderOutputs(); });
		del.addEventListener('click', () => { state.incomeItems.splice(idx,1); save(); renderIncomeItems(); renderOutputs(); });
		// DnD - drag image를 행 전체로
		let dragGhostIncItem = null;
		handle.addEventListener('dragstart', (e) => {
			e.dataTransfer.setData('text/plain', String(idx));
			e.dataTransfer.effectAllowed = 'move';
			const rect = row.getBoundingClientRect();
			dragGhostIncItem = row.cloneNode(true);
			dragGhostIncItem.classList.add('drag-ghost');
			dragGhostIncItem.style.position = 'fixed';
			dragGhostIncItem.style.top = '-1000px';
			dragGhostIncItem.style.left = '-1000px';
			dragGhostIncItem.style.width = rect.width + 'px';
			dragGhostIncItem.style.pointerEvents = 'none';
			document.body.appendChild(dragGhostIncItem);
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;
			if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(dragGhostIncItem, offsetX, offsetY);
		});
		handle.addEventListener('dragend', () => {
			if (dragGhostIncItem && dragGhostIncItem.parentNode) dragGhostIncItem.parentNode.removeChild(dragGhostIncItem);
			dragGhostIncItem = null;
		});
		// 드롭 타겟
		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			row.classList.add('drag-over');
		});
		row.addEventListener('dragleave', () => {
			row.classList.remove('drag-over');
		});
		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.classList.remove('drag-over');
			const from = Number(e.dataTransfer.getData('text/plain'));
			const to = idx;
			if (!Number.isFinite(from) || from === to) return;
			const [moved] = state.incomeItems.splice(from, 1);
			state.incomeItems.splice(to, 0, moved);
			save();
			renderAllNoTabs();
		});
		el.incomeList.appendChild(row);
	});
}

// 공대원 목록
function renderMembers() {
	el.memberList.innerHTML = '';
	state.members.forEach((m, idx) => {
		const row = document.createElement('div');
		row.className = 'member-row';
		row.draggable = false;
		row.dataset.index = String(idx);
		row.innerHTML = `
			<span class="drag-handle" aria-label="순서 이동" title="순서 이동" draggable="true"></span>
			<input type="text" value="${m.name ?? ''}" aria-label="이름">
			<input type="number" min="0" step="1" value="${m.penalty ?? 0}" aria-label="사망 패널티">
			<label style="display:flex; align-items:center; gap:6px; justify-content:center;"><input type="checkbox" ${m.exclude ? 'checked':''} aria-label="분배 제외"> 분배 제외</label>
			<input type="text" value="${m.note ?? ''}" aria-label="메모">
			<button class="btn" aria-label="공대원 삭제">삭제</button>
		`;
		const [handle, name, pen, excludeWrap, note, del] = row.children;
		const exclude = excludeWrap.querySelector('input[type="checkbox"]');
		// 텍스트/입력 요소에서의 드래그로 순서 변경 방지
		row.querySelectorAll('input, textarea, select, button:not(.drag-handle), label').forEach(elm => {
			elm.setAttribute('draggable', 'false');
		});
		name.addEventListener('input', () => { m.name = name.value; save(); renderOutputs(); renderIncentives(); });
		name.addEventListener('change', () => { save(); renderAllNoTabs(); });
		pen.addEventListener('input', () => { m.penalty = Math.max(0, clampInt(pen.value)); pen.value = m.penalty; save(); renderOutputs(); });
		pen.addEventListener('change', () => { renderOutputs(); });
		exclude.addEventListener('change', () => { m.exclude = !!exclude.checked; save(); renderOutputs(); });
		note.addEventListener('input', () => { m.note = note.value; save(); renderOutputs(); });
		note.addEventListener('change', () => { renderOutputs(); });
		del.addEventListener('click', () => { state.members.splice(idx,1); save(); renderMembers(); renderOutputs(); });
		row.addEventListener('keydown', (e) => {
			if (e.key === 'Delete') { state.members.splice(idx,1); save(); renderMembers(); renderOutputs(); }
		});
		// Drag & Drop handlers
		let dragGhost = null;
		handle.addEventListener('dragstart', (e) => {
			e.dataTransfer.setData('text/plain', String(idx));
			e.dataTransfer.effectAllowed = 'move';
			// 전체 행이 따라오도록 드래그 이미지 커스터마이즈
			const rect = row.getBoundingClientRect();
			dragGhost = row.cloneNode(true);
			dragGhost.classList.add('drag-ghost');
			dragGhost.style.position = 'fixed';
			dragGhost.style.top = '-1000px';
			dragGhost.style.left = '-1000px';
			dragGhost.style.width = rect.width + 'px';
			dragGhost.style.pointerEvents = 'none';
			document.body.appendChild(dragGhost);
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;
			if (e.dataTransfer.setDragImage) {
				e.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);
			}
		});
		handle.addEventListener('dragend', () => {
			if (dragGhost && dragGhost.parentNode) {
				dragGhost.parentNode.removeChild(dragGhost);
			}
			dragGhost = null;
		});
		row.addEventListener('dragover', (e) => {
			e.preventDefault();
			row.classList.add('drag-over');
		});
		row.addEventListener('dragleave', () => {
			row.classList.remove('drag-over');
		});
		row.addEventListener('drop', (e) => {
			e.preventDefault();
			row.classList.remove('drag-over');
			const from = Number(e.dataTransfer.getData('text/plain'));
			const to = idx;
			if (!Number.isFinite(from) || from === to) return;
			const [moved] = state.members.splice(from, 1);
			state.members.splice(to, 0, moved);
			save();
			renderAllNoTabs();
		});
		el.memberList.appendChild(row);
	});
}

// ===== 이벤트 바인딩 =====
// 신규 항목 추가
el.btnAddInc.addEventListener('click', () => {
	const label = el.newIncLabel.value.trim();
	const amount = Math.max(0, clampInt(el.newIncAmount.value));
	state.incentives.push({ label, amount });
	el.newIncLabel.value = ''; el.newIncAmount.value = '';
	save(); renderAllNoTabs();
	el.newIncLabel.focus();
});
el.btnAddIncome?.addEventListener('click', () => {
	const label = el.newIncomeLabel.value.trim();
	const gross = clampInt(el.newIncomeGross.value);
	const feeRate = Number(el.newIncomeFeeRate.value || 0);
	state.incomeItems.push({ label, gross, feeRate });
	el.newIncomeLabel.value=''; el.newIncomeGross.value=''; el.newIncomeFeeRate.value='';
	save(); renderAllNoTabs();
	el.newIncomeLabel.focus();
});
el.btnAddMem.addEventListener('click', () => {
	const name = el.newMemName.value.trim() || `인원${state.members.length+1}`;
	const penalty = Math.max(0, clampInt(el.newMemPenalty.value));
	const exclude = !!el.newMemExclude.checked;
	const note = el.newMemNote.value.trim();
	state.members.push({ id: genId(), name, penalty, exclude, note });
	el.newMemName.value = ''; el.newMemPenalty.value = ''; el.newMemExclude.checked = false; el.newMemNote.value = '';
	save(); renderAllNoTabs();
	el.newMemName.focus();
});
// Enter로 인센티브/수입/공대원 추가 (IME 조합 중 Enter는 무시)
const makeAddOnEnter = (btn) => (e) => {
	if (e.isComposing) return;
	if (e.key === 'Enter') {
		e.preventDefault();
		btn.click();
	}
};
const addIncentiveOnEnter = makeAddOnEnter(el.btnAddInc);
el.newIncLabel.addEventListener('keydown', addIncentiveOnEnter);
el.newIncAmount.addEventListener('keydown', addIncentiveOnEnter);
const addIncomeOnEnter = makeAddOnEnter(el.btnAddIncome);
el.newIncomeLabel.addEventListener('keydown', addIncomeOnEnter);
el.newIncomeGross.addEventListener('keydown', addIncomeOnEnter);
el.newIncomeFeeRate.addEventListener('keydown', addIncomeOnEnter);
// Enter로 공대원 추가 (IME 조합 중 Enter는 무시)
const addMemberOnEnter = makeAddOnEnter(el.btnAddMem);
el.newMemName.addEventListener('keydown', addMemberOnEnter);
el.newMemPenalty.addEventListener('keydown', addMemberOnEnter);
el.newMemNote.addEventListener('keydown', addMemberOnEnter);
['date','title','memo'].forEach(k => {
	el[k].addEventListener('input', () => {
		if (k === 'date') state.date = el.date.value || state.date;
		else if (k === 'title') state.title = el.title.value;
		else if (k === 'memo') state.memo = el.memo.value;
		save();
		if (k === 'date' || k === 'title') renderTabs();
		renderOutputs();
	});
	el[k].addEventListener('change', () => {
		if (k === 'date') state.date = el.date.value || state.date;
		else if (k === 'title') state.title = el.title.value;
		else if (k === 'memo') state.memo = el.memo.value;
		save();
		if (k === 'date' || k === 'title') renderTabs();
		renderOutputs();
	});
});

// 버튼 - 초기화/PNG/인쇄/탭
el.btnReset.addEventListener('click', () => {
	if (!confirm('모든 입력을 초기화할까요?')) return;
	// 현재 탭만 초기화
	Object.assign(state, newBlankState());
	save();
	renderAllNoTabs();
});
el.btnSavePng.addEventListener('click', async () => {
	const node = document.getElementById('printArea');
	const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
	// 패딩 추가 캔버스
	const pad = 32;
	const padded = document.createElement('canvas');
	padded.width = canvas.width + pad * 2;
	padded.height = canvas.height + pad * 2;
	const ctx = padded.getContext('2d');
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, padded.width, padded.height);
	ctx.drawImage(canvas, pad, pad);
	padded.toBlob((blob) => {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		const ymd = (state.date || '').replaceAll('-', '');
		a.download = `알목-분배표-${ymd || 'export'}.png`;
		a.click();
		URL.revokeObjectURL(a.href);
	});
});
el.btnPrint.addEventListener('click', () => window.print());
el.btnAddTab.addEventListener('click', addNewTab);
el.btnRemoveTab.addEventListener('click', removeActiveTab);

// ===== 탭 제어 =====
function addNewTab() {
	const id = 'tab_' + Date.now();
	// 현재 상태를 복제하여 새 기록으로 생성
	const data = JSON.parse(JSON.stringify(state));
	tabs.items.push({ id, date: data.date, title: data.title, data });
	tabs.activeId = id;
	save();
	renderTabs();
	// state는 동일 데이터를 유지하되, 이제 활성 탭만 새 ID로 바뀐 상태
	renderAllNoTabs();
}
function removeActiveTab() {
	if (!confirm('현재 기록을 삭제할까요?')) return;
	const idx = tabs.items.findIndex(t => t.id === tabs.activeId);
	if (idx < 0) return;
	tabs.items.splice(idx, 1);
	if (tabs.items.length === 0) {
		addNewTab(); // 최소 1개 유지
		return;
	}
	tabs.activeId = tabs.items[0].id;
	const active = tabs.items[0];
	Object.assign(state, JSON.parse(JSON.stringify(active.data)));
	save();
	renderTabs();
	renderAllNoTabs();
}
function switchTab(id) {
	if (id === tabs.activeId) return;
	// 현재 변경사항 저장
	save();
	const target = tabs.items.find(t => t.id === id);
	if (!target) return;
	tabs.activeId = id;
	Object.assign(state, JSON.parse(JSON.stringify(target.data)));
	renderTabs();
	renderAllNoTabs();
}

// 여러 렌더 호출을 하나로 묶어 중복 제거
function renderAllNoTabs() {
	bindInputs();
	renderIncentives();
	renderIncomeItems();
	renderMembers();
	renderOutputs();
}

// ===== 초기 로드 =====
(function init() {
	loadTabs();
	if (!state.date) state.date = new Date().toISOString().slice(0,10);
	renderTabs();
	renderAllNoTabs();
})();

