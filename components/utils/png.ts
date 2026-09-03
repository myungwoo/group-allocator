'use client';

import html2canvas from 'html2canvas';

/**
 * 캡처 폭을 고정합니다. 데스크톱 기준값이라 넓은 창에서 보던 PNG 와 같은 픽셀이 나옵니다.
 * (`.container` 1200px − 좌우 여백 16px − `.sheet-card` 좌우 여백 20px)
 * 이 값을 바꾸면 지난주 분배표와 이번 주 분배표가 달라 보입니다.
 */
const CAPTURE_WIDTH = 1128;
const CAPTURE_SCALE = 2;
/** 캔버스 픽셀 단위 여백입니다(scale 을 이미 곱한 뒤라 그대로 씁니다). 예전 결과와 같게 두세요. */
const PAD = 32;

/** 시트가 쓰는 굵기들. 폰트가 아직 안 붙은 채로 캡처하면 글자가 폴백으로 찍힙니다. */
const SHEET_FONTS = ['400 14px Pretendard', '700 14px Pretendard', '800 24px Pretendard'];

async function waitForSheetFonts() {
  const fonts = document.fonts;
  if (!fonts) return;
  try {
    await Promise.all(SHEET_FONTS.map((f) => fonts.load(f)));
    await fonts.ready;
  } catch {
    // 폰트를 못 불러와도 캡처는 진행합니다.
  }
}

/**
 * 화면에 보이는 시트를 그대로 찍지 않고, 화면 밖에 고정 폭 복제본을 만들어 찍습니다.
 * 창 폭·기기·확대 배율에 따라 결과가 달라지던 것을 막는 장치입니다.
 */
export async function generatePaddedPngBlob(node: HTMLElement): Promise<Blob | null> {
  const host = document.createElement('div');
  // `.chrome` 밖에 두므로 인쇄에서 새지 않게 `.no-print` 를 붙입니다.
  host.className = 'sheet-capture no-print';
  host.setAttribute('aria-hidden', 'true');
  // display:none 은 안 됩니다 — 레이아웃이 잡히지 않아 높이가 0 이 됩니다.
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = `-${CAPTURE_WIDTH + 1000}px`;
  host.style.width = `${CAPTURE_WIDTH}px`;
  host.style.background = '#fff';
  host.style.pointerEvents = 'none';

  const clone = node.cloneNode(true) as HTMLElement;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForSheetFonts();
    const height = Math.ceil(clone.getBoundingClientRect().height) || clone.scrollHeight;
    const canvas = await html2canvas(clone, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      width: CAPTURE_WIDTH,
      height,
      // html2canvas 는 이 크기의 iframe 안에서 다시 그립니다. 실제 창 폭이 좁아도
      // 미디어 쿼리가 데스크톱으로 평가되게 넉넉히 줍니다.
      windowWidth: CAPTURE_WIDTH + 200,
      windowHeight: height + 200,
      scrollX: 0,
      scrollY: 0
    });

    const padded = document.createElement('canvas');
    padded.width = canvas.width + PAD * 2;
    padded.height = canvas.height + PAD * 2;
    const ctx = padded.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, padded.width, padded.height);
    ctx.drawImage(canvas, PAD, PAD);
    return await new Promise<Blob | null>((resolve) => padded.toBlob((b) => resolve(b), 'image/png'));
  } finally {
    host.remove();
  }
}
