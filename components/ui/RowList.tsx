import { Icon } from '@/components/ui/Icon';

/**
 * 행 리스트 한 벌: 컬럼 머리글 + 행들 + 빈 상태 + 추가 버튼.
 *
 * 머리글은 행과 **같은 그리드 클래스**(`row--{variant}`)를 씁니다. 그래야 열이 정확히
 * 맞습니다. 예전에는 추가 폼이 따로 있어서 위 행들과 열이 어긋났습니다.
 */
export function RowList({
  variant,
  columns,
  count,
  empty,
  addLabel,
  onAdd,
  children
}: {
  variant: 'income' | 'incentive' | 'penalty' | 'member';
  columns: string[];
  count: number;
  empty: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rows">
      {count > 0 ? (
        <div className={`row row--head row--${variant}`} aria-hidden="true">
          <span />
          {columns.map((c) => (
            <span key={c}>{c}</span>
          ))}
          <span />
        </div>
      ) : null}
      {children}
      {count === 0 ? <p className="rows-empty">{empty}</p> : null}
      <button className="row-add" onClick={onAdd} type="button">
        <Icon name="plus" />
        {addLabel}
      </button>
    </div>
  );
}
