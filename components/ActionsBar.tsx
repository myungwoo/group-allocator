'use client';

export function ActionsBar({
  onReset,
  onSavePng,
  onCopyPng,
  onCopyText,
  onPrint,
  onExportJson,
  onImportJsonFile
}: {
  onReset: () => void;
  onSavePng: () => void;
  onCopyPng: () => void;
  onCopyText: () => void;
  onPrint: () => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => void;
}) {
  return (
    <div className="actions">
      <button className="btn danger" id="btn-reset" aria-label="모든 입력 초기화" onClick={onReset} type="button">
        초기화
      </button>
      <button className="btn" id="btn-export-json" aria-label="JSON 내보내기" onClick={onExportJson} type="button">
        JSON 내보내기
      </button>
      <label className="btn" id="btn-import-json" aria-label="JSON 가져오기" style={{ display: 'inline-flex', alignItems: 'center' }}>
        JSON 가져오기
        <input
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            onImportJsonFile(file);
            // 같은 파일을 연속으로 선택해도 onChange가 발생하도록 초기화
            e.currentTarget.value = '';
          }}
        />
      </label>
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

