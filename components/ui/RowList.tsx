import { Icon } from '@/components/ui/Icon';

/**
 * 행 리스트 한 벌: 컬럼 머리글 + 행들 + 빈 상태 + 추가 버튼.
 *
 * 머리글은 행과 **같은 그리드 클래스**(`row--{variant}`)를 씁니다. 그래야 열이 정확히
 * 맞습니다. 예전에는 추가 폼이 따로 있어서 위 행들과 열이 어긋났습니다.
 *
 * `split` 은 넓은 화면에서 행을 두 열로 나눕니다(공대원 목록). 이때 머리글을 **열마다
 * 하나씩** 둡니다. 하나를 두 열에 걸치게 하면 각 열의 5칸 그리드와 어긋납니다.
 * 행 배치는 그리드 기본 흐름(행 우선)이라 좌→우, 위→아래로 읽는 순서가 실제 순서와
 * 같습니다 — 공대원 순서는 나머지 1원을 배분할 때 쓰이므로 이게 어긋나면 안 됩니다.
 */
export function RowList({
  variant,
  columns,
  count,
  empty,
  addLabel,
  onAdd,
  split = false,
  children
}: {
  variant: 'income' | 'incentive' | 'penalty' | 'member';
  columns: string[];
  count: number;
  empty: string;
  addLabel: string;
  onAdd: () => void;
  split?: boolean;
  children: React.ReactNode;
}) {
  const head = (dup: boolean) => (
    <div className={`row row--head row--${variant}${dup ? ' row--head-dup' : ''}`} aria-hidden="true">
      <span />
      {columns.map((c) => (
        <span key={c}>{c}</span>
      ))}
      <span />
    </div>
  );

  return (
    <div className="rows-wrap">
      <div className={`rows${split ? ' rows--split' : ''}`}>
        {count > 0 ? head(false) : null}
        {count > 0 && split ? head(true) : null}
        {children}
      </div>
      {count === 0 ? <p className="rows-empty">{empty}</p> : null}
      <button className="row-add" onClick={onAdd} type="button">
        <Icon name="plus" />
        {addLabel}
      </button>
    </div>
  );
}
