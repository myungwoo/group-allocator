/**
 * 앱 크롬에서 쓰는 16px 라인 아이콘 모음.
 *
 * 아이콘 라이브러리를 붙이지 않는 이유: 이 앱은 의존성 없는 정적 빌드를 유지합니다.
 * 여기 있는 것들로 부족하면 path 를 추가하세요 (viewBox 16, stroke 기반).
 */
export type IconName =
  | 'plus'
  | 'copy'
  | 'trash'
  | 'close'
  | 'search'
  | 'list'
  | 'printer'
  | 'download'
  | 'upload'
  | 'image'
  | 'text'
  | 'reset'
  | 'chevron';

const PATHS: Record<IconName, React.ReactNode> = {
  plus: <path d="M8 3.2v9.6M3.2 8h9.6" />,
  copy: (
    <>
      <rect x="5.6" y="5.6" width="7.2" height="7.2" rx="1.6" />
      <path d="M10.4 3.2H4.8A1.6 1.6 0 0 0 3.2 4.8v5.6" />
    </>
  ),
  trash: (
    <>
      <path d="M2.8 4.6h10.4M6.4 4.6V3.2h3.2v1.4" />
      <path d="M4.4 4.6l.5 8a.8.8 0 0 0 .8.8h4.6a.8.8 0 0 0 .8-.8l.5-8" />
    </>
  ),
  close: <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />,
  search: (
    <>
      <circle cx="7.2" cy="7.2" r="3.8" />
      <path d="M10.1 10.1l3 3" />
    </>
  ),
  list: <path d="M3 4.5h10M3 8h10M3 11.5h10" />,
  printer: (
    <>
      <path d="M4.6 5.6V2.8h6.8v2.8" />
      <path d="M4.6 11.4H3.4a.8.8 0 0 1-.8-.8V6.4a.8.8 0 0 1 .8-.8h9.2a.8.8 0 0 1 .8.8v4.2a.8.8 0 0 1-.8.8h-1.2" />
      <rect x="4.6" y="9.2" width="6.8" height="4" rx="0.6" />
    </>
  ),
  download: <path d="M8 2.8v6.6M5.4 7.2 8 9.8l2.6-2.6M3 12.6h10" />,
  upload: <path d="M8 9.8V3.2M5.4 5.8 8 3.2l2.6 2.6M3 12.6h10" />,
  image: (
    <>
      <rect x="2.6" y="3.4" width="10.8" height="9.2" rx="1.6" />
      <circle cx="6" cy="6.6" r="1" />
      <path d="M3 11.2l3.1-2.8 2.4 2.1 1.9-1.6 3 2.6" />
    </>
  ),
  text: <path d="M3.4 4h9.2M3.4 7.2h9.2M3.4 10.4h6" />,
  reset: (
    <>
      <path d="M12.8 8a4.8 4.8 0 1 1-1.7-3.66" />
      <path d="M13.1 2.6v2.4h-2.4" />
    </>
  ),
  chevron: <path d="M5.2 6.6 8 9.4l2.8-2.8" />
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
