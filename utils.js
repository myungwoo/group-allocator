// 유틸리티 모듈
// - 금액 포맷, 정수 클램프, HTML 이스케이프, 날짜 포맷, ID 생성

export const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString('ko-KR') : '0');
export const fmtOrBlank = (n) => (Number(n) === 0 ? '' : fmt(n));
export const clampInt = (v) => {
	if (v === '' || v === null || v === undefined) return 0;
	const num = Math.floor(Number(v));
	return Number.isFinite(num) ? num : 0;
};
export const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatDate(dateStr) {
	if (!dateStr) return '';
	const parts = String(dateStr).split('-');
	if (parts.length !== 3) return '';
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	const d = Number(parts[2]);
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
	const mm = String(m).padStart(2,'0');
	const dd = String(d).padStart(2,'0');
	return `${y}. ${mm}. ${dd}`;
}
export const genId = () => 'm_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);


