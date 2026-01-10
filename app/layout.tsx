import type { Metadata } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: '분배 계산기',
  description: '공대 분배 계산 유틸리티',
  // GitHub Pages는 보통 `/{repo}/` 하위 경로로 서빙되므로 basePath를 반영해야 favicon 404가 나지 않습니다.
  icons: [{ rel: 'icon', url: `${basePath}/favicon.svg` }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 기존 Pretendard CDN 유지 (간단/안전) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

