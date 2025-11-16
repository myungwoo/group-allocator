// 상태/저장 모듈
// - 탭/상태 보관 및 로컬스토리지 직렬화

export const LS_KEY = 'almok_v1'; // 단일 백업 키(레거시 호환)
export const TABS_KEY = 'almok_tabs_v1';

export let tabs = { activeId: '', items: [] };
export const state = {
	date: new Date().toISOString().slice(0,10),
	title: '',
	incentives: [],
	penaltyItems: [],
	incomeItems: [],
	members: [],
	memo: ''
};

export function newBlankState() {
	return {
		date: new Date().toISOString().slice(0,10),
		title: '',
		incentives: [],
		penaltyItems: [],
		incomeItems: [],
		members: [],
		memo: ''
	};
}

export function save() {
	const idx = tabs.items.findIndex(t => t.id === tabs.activeId);
	if (idx >= 0) {
		tabs.items[idx].data = JSON.parse(JSON.stringify(state));
		tabs.items[idx].date = state.date;
		tabs.items[idx].title = state.title;
	}
	localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
	localStorage.setItem(LS_KEY, JSON.stringify(state)); // 레거시 백업
}

export function loadTabs() {
	const raw = localStorage.getItem(TABS_KEY);
	if (raw) {
		try {
			const obj = JSON.parse(raw);
			tabs = obj && obj.items ? obj : { activeId: '', items: [] };
		} catch {
			tabs = { activeId: '', items: [] };
		}
	} else {
		const legacy = localStorage.getItem(LS_KEY);
		let initState = newBlankState();
		if (legacy) {
			try { initState = Object.assign(initState, JSON.parse(legacy)); } catch {}
		}
		const id = 'tab_' + Date.now();
		tabs = {
			activeId: id,
			items: [{ id, date: initState.date, title: initState.title, data: initState }]
		};
		localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
	}
	const active = tabs.items.find(t => t.id === tabs.activeId) || tabs.items[0];
	if (active) {
		Object.assign(state, JSON.parse(JSON.stringify(active.data)));
		tabs.activeId = active.id;
	}
}


