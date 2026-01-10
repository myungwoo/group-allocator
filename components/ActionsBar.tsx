'use client';

export function ActionsBar({
  onReset,
  onSavePng,
  onCopyPng,
  onCopyText,
  onPrint
}: {
  onReset: () => void;
  onSavePng: () => void;
  onCopyPng: () => void;
  onCopyText: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="actions">
      <button className="btn danger" id="btn-reset" aria-label="모든 입력 초기화" onClick={onReset} type="button">
        초기화
      </button>
      <button className="btn" id="btn-save-png" aria-label="PNG 저장" onClick={onSavePng} type="button">
        PNG 저장
      </button>
      <button className="btn" id="btn-copy-png" aria-label="PNG 복사" onClick={onCopyPng} type="button">
        PNG 복사
      </button>
      <button className="btn" id="btn-copy-text" aria-label="텍스트 복사" onClick={onCopyText} type="button">
        텍스트 복사
      </button>
      <button className="btn primary" id="btn-print" aria-label="PDF/인쇄" onClick={onPrint} type="button">
        PDF/인쇄
      </button>
      <div className="small" style={{ marginLeft: 'auto' }}>
        인쇄 시 브라우저 설정에서 “배경 그래픽 인쇄”를 켜주세요.
      </div>
    </div>
  );
}

