import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '분배 계산기',
  description: '공대 분배 계산 유틸리티',
  icons: [{ rel: 'icon', url: '/favicon.svg' }]
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

