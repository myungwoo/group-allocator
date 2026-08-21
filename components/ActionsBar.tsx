'use client';

import { Icon } from '@/components/ui/Icon';

/**
 * 출력물에 대고 하는 일(인쇄/PNG/텍스트)과 기록 데이터에 대고 하는 일(JSON/초기화)을
 * 나눠 둡니다. 예전에는 초기화가 맨 앞에 있어서 인쇄 버튼과 나란히 놓였습니다.
 */
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
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="btn btn--primary" id="btn-print" onClick={onPrint} type="button">
          <Icon name="printer" />
          인쇄 / PDF
        </button>
        <button className="btn" id="btn-save-png" onClick={onSavePng} type="button">
          <Icon name="download" />
          PNG 저장
        </button>
        <button className="btn" id="btn-copy-png" onClick={onCopyPng} type="button">
          <Icon name="image" />
          PNG 복사
        </button>
        <button className="btn" id="btn-copy-text" onClick={onCopyText} type="button" title="디스코드에 붙일 분배 텍스트">
          <Icon name="text" />
          텍스트 복사
        </button>
      </div>

      <div className="toolbar-group toolbar-group--end">
        <button className="btn btn--ghost" id="btn-export-json" onClick={onExportJson} type="button">
          <Icon name="download" />
          JSON 내보내기
        </button>
        <label className="btn btn--ghost" id="btn-import-json">
          <Icon name="upload" />
          JSON 가져오기
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              onImportJsonFile(file);
              // 같은 파일을 연속으로 선택해도 onChange가 발생하도록 초기화
              e.currentTarget.value = '';
            }}
          />
        </label>
        <button className="btn btn--danger" id="btn-reset" onClick={onReset} type="button" title="지금 기록의 입력을 모두 비웁니다.">
          <Icon name="reset" />
          초기화
        </button>
      </div>

      <p className="toolbar-note">인쇄할 때 브라우저 설정에서 “배경 그래픽”을 켜면 표 색이 그대로 나옵니다.</p>
    </div>
  );
}
