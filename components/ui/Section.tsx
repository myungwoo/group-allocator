export function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' }) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}

/** 입력 패널 안의 카드 한 장 (제목 + 요약 칩 + 본문). */
export function Section({
  title,
  chips,
  hint,
  className,
  children
}: {
  title: string;
  chips?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className ? `card ${className}` : 'card'}>
      <header className="card-head">
        <h3 className="card-title">{title}</h3>
        {chips ? <div className="card-chips">{chips}</div> : null}
      </header>
      <div className="card-body">{children}</div>
      {hint ? <p className="card-hint">{hint}</p> : null}
    </section>
  );
}
